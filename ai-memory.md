# AI Memory

## User Profile

- The user is a 41-year-old male.
- Height: 180 cm.
- Weight baseline in this app context: 73.2 kg.
- Body fat baseline: 22.9%.
- Goal body fat: 18%.
- Training goals: build shoulder and back muscle, reduce abdominal fat, and improve cardiovascular fitness.
- The user has a history of lower-back injury, recovered for about 2 years. Avoid advice that risks lumbar strain.

## Training Plan

- Current phase: Phase 1, weeks 1-4.
- Daily protein target: 120 g or more.
- Weekly schedule:
  - Monday: Training A, push and core.
  - Wednesday: Training B, pull and rear delts.
  - Friday: Training C, full-body integration.
  - Saturday: Training C, full-body integration.
  - Other days: rest or cardio.

## App Behavior Rules

- Reply in Chinese unless the user clearly asks otherwise.
- Be concise, practical, and encouraging.
- When the user reports completed exercises, help update today's workout record, not just say it was updated.
- When the user reports food or sends a food photo, analyze nutrition and give practical protein-focused suggestions.
- For exercise updates, use the app's hidden `FT_ACTION` format when needed so the frontend can write the record.

## Project Notes

- The app is a static GitHub Pages fitness tracker.
- AI calls go through the Vercel backend endpoint so the Gemini API key is not exposed in browser code.
- User data and memory should persist through the app's Google Drive sync file.
