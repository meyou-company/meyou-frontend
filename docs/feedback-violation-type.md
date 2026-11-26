# Feedback type `VIOLATION` (backend approval)

The burger menu **Report** flow sends general policy or safety issues through `POST /feedback` with:

```json
{ "type": "VIOLATION", "message": "...", "screenshotUrl": "..." }
```

Current Prisma enum `FeedbackType` only includes `SUGGESTION | BUG | UNCLEAR | REVIEW`.

## Required backend change (meyou-api)

1. Add `VIOLATION` to `enum FeedbackType` in `prisma/schema.prisma`.
2. Run migration.
3. Expose `VIOLATION` in OpenAPI / DTO enums.
4. Optional: admin filter label for violation queue.

Until deployed, the frontend shows `feedback.report.backendRequired` after validation failure and points users to in-context reporting (profiles, posts, messages, stories, live) and `/legal/community-guidelines`.

No parallel reporting system — content-specific reports continue using existing moderation APIs.