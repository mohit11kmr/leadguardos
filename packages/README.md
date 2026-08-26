# V6 Foundational Packages

These packages are additive Phase 3A boundaries. They are intentionally not imported by the V5 runtime yet.

- `types`: platform-neutral TypeScript contracts.
- `schemas`: Zod validation for browser/API/worker/provider boundaries.
- `config`: non-secret environment manifest and shared defaults.
- `security`: pure interfaces for URL safety, identity, redaction, signatures, and policy.

No package may import React, Express, Prisma, Firebase runtime modules, or application `server/` code.
