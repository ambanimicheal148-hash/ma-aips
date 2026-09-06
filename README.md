# MA-AIPS / K.A.I.S

**MA-AIPS (Micheal Ambani AI Platform System)** is an autonomous intelligence platform with K.AI.S services and student-focused AI assistance.

## Current deployment architecture

- Node.js 18+
- Native Node HTTP server (`server.js`)
- `npm start` launches the server
- `PORT` is read from the environment (defaults to `3000` locally)
- Static pages are served from the repository root and `public/`
- AI provider credentials stay server-side in environment variables
- No Vercel-specific configuration is required

## Core API routes

- `GET /api/health` — service health check
- `GET /api/student?student_id=TEST123` — student test endpoint
- `POST /api/chat` — protected student AI chat
- `POST /api/kais/chat` — K.AI.S chat
- `POST /api/mbna/program` — MBNA program generation

## Local run

```bash
npm start
```

Then open `http://localhost:3000/`.

## Environment

Configure at least one supported server-side AI credential before using AI generation:

- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

Optional provider/model controls are documented by the AI module. **Never place API keys in frontend HTML or JavaScript.**

## Status

The repository is maintained as the GitHub source of truth and is structured for a standard Node deployment such as Railway.
