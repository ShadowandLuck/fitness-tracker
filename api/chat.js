const DEFAULT_ALLOWED_ORIGINS = [
  'https://shadowandluck.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const DEFAULT_MAX_OUTPUT_TOKENS = 1600;
const MAX_OUTPUT_TOKEN_CEILING = 10000;

function allowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }

  return origins;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 6 * 1024 * 1024) {
        reject(new Error('Request is too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }

  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString('utf8') || '{}');
  }

  return readJson(req);
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  return origin && allowedOrigins().has(origin);
}

function validContents(contents) {
  return Array.isArray(contents) && contents.length > 0 && contents.length <= 24;
}

function maxOutputTokens() {
  const configured = Number.parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '', 10);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.min(configured, MAX_OUTPUT_TOKEN_CEILING);
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!isAllowedOrigin(req)) {
    sendJson(res, 403, { error: 'Origin is not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  let payload;
  try {
    payload = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  if (!validContents(payload.contents) || typeof payload.systemInstruction !== 'string') {
    sendJson(res, 400, { error: 'Invalid chat payload' });
    return;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: payload.contents,
        systemInstruction: { parts: [{ text: payload.systemInstruction }] },
        generationConfig: { maxOutputTokens: maxOutputTokens(), temperature: 0.7 }
      })
    });

    const data = await geminiResp.json();
    if (!geminiResp.ok) {
      sendJson(res, geminiResp.status, { error: data.error?.message || 'Gemini request failed' });
      return;
    }

    const candidate = data.candidates?.[0] || {};
    const text = (candidate.content?.parts || [])
      .map(part => part.text || '')
      .join('');

    sendJson(res, 200, {
      text,
      finishReason: candidate.finishReason || '',
      usageMetadata: data.usageMetadata || null
    });
  } catch {
    sendJson(res, 502, { error: 'AI service request failed' });
  }
};
