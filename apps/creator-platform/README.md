# Creator Platform

An independent creator workspace inside this REA fork. It does not change REA's CLI, MCP server, analysis engine, tests or release configuration.

## Video Analyst + TikTok performance matrix

- Inspect a local video in the browser for duration and dimensions.
- Connect TikTok through Login Kit OAuth (no password collection).
- Read recent public posts and available counters through TikTok Display API.
- Compare each post against the connected account's median views, engagement rate and share rate.
- Keep API evidence separate from creative judgements and metrics TikTok does not expose through this API.

The account-relative score is a diagnostic, not a viral prediction. TikTok Display API video objects expose view, like, comment and share counts, but not retention curves or average watch time. See the official [Video Object](https://developers.tiktok.com/docs/en/tiktok-api-v2-video-object) and [Display API](https://developers.tiktok.com/docs/en/display-api-overview).

## TikTok setup

1. Create an app in the [TikTok Developer Portal](https://developers.tiktok.com/).
2. Add **Login Kit** and **Display API** products.
3. Request approval for `user.info.basic` and `video.list`.
4. Configure the Web redirect URI exactly as `http://localhost:8787/api/tiktok/callback`.
5. Copy `.env.example` to `.env` and enter Client Key and Client Secret. Never commit `.env`.
6. Run both the API and Vite development server in separate terminals; then choose **Connect TikTok**.

## Run locally

Requires Node.js 22.

```bash
cd apps/creator-platform
cp .env.example .env
# Fill in TikTok developer credentials in .env
npm install
npm run api
# In a second terminal, from this folder:
npm run dev
```

Open the Vite URL (normally http://localhost:5173).

## Development-only security limitation

This OAuth adapter stores tokens in server memory only. Restarting the API disconnects the session. Before public deployment, implement encrypted server-side persistence, secure production cookies, HTTPS, account isolation and token revocation. Do not deploy this local adapter as a multi-user production service.

## Verify

```bash
npm test
npm run typecheck
npm run build
``

Scoring tests use synthetic fixtures; they do not prove a live TikTok connection. Live verification requires an approved TikTok developer app and an account that authorizes it.
