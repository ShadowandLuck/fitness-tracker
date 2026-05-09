# Fitness Tracker

Static fitness and diet tracker with Google Drive sync and an optional AI assistant.

## Safe AI Assistant Setup

Do not put a Gemini API key in `index.html`. Browser code is public, even when the repo is private. This project uses `api/chat.js` as a small serverless proxy so the key can stay in a private environment variable.

### Option A: Deploy on Vercel

1. Import this GitHub repo into Vercel.
2. In Vercel project settings, add environment variables:
   - `GEMINI_API_KEY`: your Gemini API key
   - `ALLOWED_ORIGINS`: comma-separated origins allowed to call the API, for example `https://shadowandluck.github.io,https://your-app.vercel.app`
   - `GEMINI_MODEL`: optional, defaults to `gemini-2.5-flash`
3. Deploy.
4. If the app is hosted on Vercel, `CONFIG.AI_ENDPOINT` can stay empty because it will call same-origin `/api/chat`.
5. If the app is hosted on GitHub Pages, set `CONFIG.AI_ENDPOINT` in `index.html` to your deployed function URL:

```js
AI_ENDPOINT: 'https://your-app.vercel.app/api/chat'
```

### Google Cloud Key Settings

In Google Cloud Console, restrict the Gemini key:

- API restrictions: allow only the Generative Language API.
- Add quota or billing alerts to limit unexpected usage.
- Rotate the key if it was ever committed, pasted into browser code, or shared.

The proxy also checks `Origin` against `ALLOWED_ORIGINS`, but this is a browser protection layer, not a replacement for quotas and key restrictions.

### Local Secret Files

For local serverless testing, create `.env.local` from `.env.example` and put your real key there. `.env.local` is ignored by git and must not be committed.

Then run:

```sh
node server.js
```

Open `http://localhost:3000` instead of opening `index.html` directly from the filesystem. The app will call same-origin `/api/chat`, and the server will read `GEMINI_API_KEY` from `.env.local`.
