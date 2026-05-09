# Fitness Tracker Project Knowledge

Last updated: 2026-05-09

This document captures the most important project decisions, implementation rules, and conversation context so future work does not have to rediscover them from scratch.

## Product Purpose

This project is a personal fitness and diet tracking app for a 12-week training plan. It is optimized for quick daily logging, Google Drive persistence, and an AI assistant that can help interpret food, exercise, body metrics, and daily notes.

The app should feel like a practical daily companion rather than a generic chatbot. The user mainly wants fast record keeping, concise feedback, and memory across sessions.

## User And Training Context

- User profile: 41-year-old male.
- Height: 180 cm.
- Baseline weight in this app context: 73.2 kg.
- Baseline body fat: 22.9%.
- Goal body fat: 18%.
- Goals: build shoulder and back muscle, reduce abdominal fat, improve cardiovascular fitness.
- Injury context: lower-back injury history, recovered for about 2 years. Avoid advice that increases lumbar strain.
- Current phase: Phase 1, weeks 1-4.
- Daily protein target: 120 g or more.

Weekly training schedule:

- Monday: Training A, push and core.
- Wednesday: Training B, pull and rear delts.
- Friday: Training C, full-body integration.
- Saturday: Training C, full-body integration.
- Other days: rest or cardio.

## Architecture Summary

The app is mostly static:

- `index.html`: main single-page app, CSS, UI logic, Google OAuth, Drive sync, AI chat behavior.
- `manifest.json`, `sw.js`, icons: PWA support.
- `ai-memory.md`: default long-term AI memory loaded by the app if no memory exists yet.
- `api/chat.js`: Vercel serverless API proxy for Gemini.
- `server.js`: local development server that serves static files and proxies `/api/chat`.
- `.env.example`: safe example environment variables.

Hosting model:

- Frontend: GitHub Pages at `https://shadowandluck.github.io/fitness-tracker/`.
- AI backend: Vercel serverless function.
- Current AI endpoint in frontend config: `https://fitness-tracker-ecru-three.vercel.app/api/chat`.
- Data persistence: Google Drive file named `fitness-tracker-data.json`.

## Security Decisions

Never put Gemini or other AI API keys into `index.html`, GitHub Pages, or any browser-visible file.

The browser calls `CONFIG.AI_ENDPOINT`, and the Vercel backend reads the API key from environment variables. This keeps the key out of public static code.

Important environment variables:

- `GEMINI_API_KEY`: private Gemini API key.
- `ALLOWED_ORIGINS`: allowed browser origins, currently including `https://shadowandluck.github.io`.
- `GEMINI_MODEL`: model name, default `gemini-2.5-flash`.
- `GEMINI_MAX_OUTPUT_TOKENS`: optional response length cap, default `1600`, code caps values above `10000`.

If a real API key is ever pasted into chat, committed, or exposed in browser code, rotate it. Do not preserve the real key in docs.

## AI Assistant Design

The AI assistant should reply in Chinese unless the user clearly asks otherwise.

The assistant should be concise, practical, encouraging, and focused on helping the user keep records. It should not merely say that a record was updated. If the user asks to update data, the AI must produce a hidden action block that the frontend can parse and apply.

The app sends a system prompt plus current day context to Gemini. Current day context includes:

- Today's date and time.
- Training type.
- Long-term memory.
- Completed and uncompleted workout sets.
- Existing diet records.
- Existing daily note.

## Hidden Action Protocol

The frontend recognizes hidden action blocks wrapped in:

```text
[[FT_ACTION]]
{...json...}
[[/FT_ACTION]]
```

The visible AI reply should stay natural and short. The hidden block is removed before display, then applied to app data.

### Workout Updates

Use this when the user reports completed exercises:

```json
{
  "type": "update_workout",
  "exercises": [
    {
      "id": "c1",
      "sets": [
        { "index": 0, "value": "8", "done": true }
      ]
    }
  ]
}
```

Rules:

- Exercise IDs come from today's exercise list.
- Set indexes start at `0`.
- Only update exercises the user clearly reported.
- For band exercises, include `band` when useful.

### Meal Updates

Use this when the user asks to record food, update the diet record, or says something like "把这个更新到我的饮食记录中":

```json
{
  "type": "add_meals",
  "meals": [
    {
      "time": "07:13",
      "text": "两根黄瓜，约30 kcal，补水为主"
    }
  ]
}
```

Rules:

- If the user did not specify time, use current time from context.
- `text` should be a concise food record, not a long analysis.
- It can include rough portion and key nutrition estimate.
- The frontend prevents exact duplicate `time + text` entries.

### Daily Note Updates

Use this when the user asks to add, save, or update today's note:

```json
{
  "type": "add_note",
  "mode": "append",
  "text": "今天快走了6公里"
}
```

Rules:

- Default to `mode: "append"` for "添加到备注", "记到备注", "保存到今日备注", and similar wording.
- Use `mode: "replace"` only if the user explicitly asks to replace or overwrite the note.
- The note writes to `day.note` and triggers Drive save.

## Current AI Improvements Already Implemented

The AI assistant can now:

- Use a Vercel backend instead of exposing the Gemini key in browser code.
- Send image and text together to Gemini.
- Accept pasted images, selected images, and drag-dropped images.
- Show a preview before sending an image.
- Keep an `ai-memory.md` based default memory and allow user-added memory through phrases like "记住...".
- Update workout records through hidden `FT_ACTION` blocks.
- Update meal records through hidden `FT_ACTION` blocks.
- Update daily notes through hidden `FT_ACTION` blocks.
- Detect likely Gemini `MAX_TOKENS` truncation and show a warning.

## Google Login And Data Persistence

The app uses Google OAuth and Drive file sync. To reduce repeated login prompts, it stores the access token and expiry briefly in `localStorage`, then tries to restore or renew before asking the user to sign in again.

The main synced file is `fitness-tracker-data.json`.

The data object contains:

- `days`: date-keyed records.
- `aiMemory`: persistent AI memory text.
- `memoryUpdatedAt`: memory update timestamp.

Each day contains:

- `date`
- `st`: training type or `rest`
- `customExercises`
- `exercises`
- `meals`
- `note`

## Important UX Rules

- The app should be a working tool, not a landing page.
- Daily logging should be fast and low friction.
- AI should help update structured records, not just give advice.
- When AI writes records, it should clearly confirm what changed.
- Food photo analysis should prioritize practical nutrition and protein guidance.
- Exercise advice should consider the user's lower-back history.
- Long answers should be avoided unless the user asks for detail.

## Deployment And Workflow Notes

GitHub Pages deploys from the `main` branch root.

Vercel hosts the serverless backend. Environment variables must be configured in Vercel project settings.

In this session, local shell push has repeatedly failed because GitHub credentials are not available to the command environment. The working agreement is:

- Codex edits files.
- Codex validates locally.
- Codex commits changes locally.
- Codex does not run `git push`.
- The user pushes with GitHub Desktop or an authenticated terminal.

Useful local commands:

```sh
node server.js
```

If the system `node` command is missing on the user's Mac, use the bundled runtime path that Codex has used:

```sh
/Users/alexmini/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server.js
```

## Cache Notes

Because this is a PWA with a service worker, GitHub Pages may show old behavior after deployment. When testing a newly deployed change, use a cache-busting URL such as:

```text
https://shadowandluck.github.io/fitness-tracker/?v=3
```

If that is not enough, unregister the service worker or hard refresh the page.

## Known Future Improvements

- Add clearer UI feedback when Drive sync succeeds or fails.
- Add a visible record of AI-applied actions for easier debugging.
- Consider splitting `index.html` into separate files if the app keeps growing.
- Add a small test harness for `FT_ACTION` parsing and applying.
- Consider a "continue" flow for truncated AI responses.
- Improve nutrition entries with optional structured fields like protein, calories, and tags.
