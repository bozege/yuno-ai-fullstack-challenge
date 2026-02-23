# Submission Guide

Use this as a checklist when filling the **Submit Your Solution** form.

## Deliverable URL (required)

Provide **one** of:

- **Deployed app URL**: If you deployed the app (e.g. Vercel + Render, or similar), paste the live URL.
- **GitHub repo URL**: If the app runs locally only, use the repo URL, e.g. `https://github.com/you/ai-challenge`

Examples: `https://your-app.vercel.app` or `https://github.com/you/kijani-retry-hub`

## GitHub Repository URL (optional)

- If you used the repo URL as the Deliverable URL, you can leave this blank or repeat the same URL.
- If you deployed the app as the Deliverable URL, put the repo URL here so reviewers can inspect the source.

## Notes (optional)

Suggested text to paste in the Notes field:

```
Implemented:
• Full failed payment dashboard with 180 seeded records, filters (decline reason, soft/hard), search
• Payment detail page with retry timeline and Manual Retry button (Stretch A)
• Retry strategy config: decline categories, max attempts, time intervals (supports decimal hours for testing)
• Retry simulation with schedule-based execution; dashboard analytics (recovery rate, revenue recovered)
• CORS for localhost; error handling and validation feedback; concise README and approach doc

Stretch goals:
• A (manual retry): Implemented — Manual Retry button on payment detail page
• B (decline insights): Not implemented
• C (time-of-day retry): Not implemented

Tradeoffs: Simulation uses fixed success rate for soft declines; no real payment integration.
```

You can edit the above to match your actual setup (e.g. different stretch goals, deployment URL, etc.).
