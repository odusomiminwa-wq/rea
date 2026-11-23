# Creator Platform

An independent creator-workspace application housed inside this REA fork.

## Boundary

- This app lives under \`apps/creator-platform/\`.
- It does not modify REA's existing CLI, MCP server, reverse-engineering workflows, tests, or release configuration.
- REA remains a separate analysis engine. Any future integration must use documented interfaces and must not imply that REA already provides creator analytics or video editing.

## Current MVP

The Video Analyst accepts a local video file in the browser, reads its actual duration and dimensions, and combines those measurements with creator-entered context to produce a transparent heuristic score and prioritized recommendations.

This is not AI analysis, platform analytics, audience-retention measurement, or a prediction of virality. The browser does not upload the selected video.

## Run locally

Requires Node.js 22.23.4+ (aligns with the parent repository's supported toolchain).

\`\`\`bash
cd apps/creator-platform
npm install
npm run dev
\`\`\`

Open the local URL printed by Vite.

## Next steps

1. Add automated tests for the scoring rubric.
2. Add an authenticated server and persistent projects.
3. Integrate an actual video-understanding model behind a server-side API.
4. Add exportable reports and explicit evidence/uncertainty labels.
5. Implement the remaining creator workflows as separate modules.
