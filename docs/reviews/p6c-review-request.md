# P6C Review Request

## Stage

`P6C - BYOK + quota + security hardening`

## Branch

`p6-v2-canvas-main`

## Scope

Please review the `P6C` slice added after `P6B` review fixes.

Primary goals:

- add BYOK runtime decryption + provider routing into `/api/generate`
- ensure platform quota only counts `quotaSource = 'platform'`
- add BYOK fair-use protection for fully user-key-backed runs
- add `userApiKeys` schema support and DB-level checks
- expose BYOK settings UI and masked key management
- remove temporary timing logs from legacy `generate.ts` / `edit.ts`
- add basic CSP and document required env vars

## Key Files

- [app/api/generate/route.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/app/api/generate/route.ts)
- [app/actions/settings.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/app/actions/settings.ts)
- [app/actions/generate.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/app/actions/generate.ts)
- [app/actions/edit.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/app/actions/edit.ts)
- [components/settings/settings-tabs-form.tsx](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/components/settings/settings-tabs-form.tsx)
- [components/settings/api-keys-tab.tsx](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/components/settings/api-keys-tab.tsx)
- [lib/byok/runtime.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/lib/byok/runtime.ts)
- [lib/crypto/byok.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/lib/crypto/byok.ts)
- [lib/db/user-api-keys-queries.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/lib/db/user-api-keys-queries.ts)
- [lib/db/generation-queries.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/lib/db/generation-queries.ts)
- [lib/db/queries.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/lib/db/queries.ts)
- [lib/db/schema.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/lib/db/schema.ts)
- [lib/settings/api-keys.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/lib/settings/api-keys.ts)
- [lib/i18n.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/lib/i18n.ts)
- [next.config.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/next.config.ts)
- [\.env.local.example](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/.env.local.example)

## What Changed

- BYOK keys are stored encrypted with AES-256-GCM and HKDF per-user derivation, then masked when rendered in settings.
- `/settings` now includes an `API Keys` tab for Google, ByteDance Ark, and DashScope credentials.
- `/api/generate` now resolves stored BYOK keys server-side, marks each model run as `platform` or `byok`, enforces platform quota only for platform-backed runs, and enforces a `200/day` BYOK fair-use ceiling.
- generation usage rows are pre-deducted for every model run, including fully BYOK batches.
- `userApiKeys` schema support was added together with uniqueness and format/provider checks.
- legacy timing `tlog` instrumentation was removed from `generate.ts` and `edit.ts`.
- basic CSP and BYOK env vars were added.

## Verification Already Run

```powershell
node --test --test-isolation=none lib/byok/runtime.test.ts lib/crypto/byok.test.ts lib/db/user-api-keys-queries.test.ts lib/settings/api-keys.test.ts lib/i18n.test.ts
npm run lint -- 'app/api/generate/route.ts' 'app/actions/generate.ts' 'app/actions/edit.ts' 'components/settings/settings-tabs-form.tsx' 'lib/db/queries.ts' 'lib/db/schema.ts' 'lib/byok/runtime.ts' 'lib/byok/runtime.test.ts' 'lib/crypto/byok.ts' 'lib/crypto/byok.test.ts' 'lib/settings/api-keys.ts' 'lib/settings/api-keys.test.ts' 'next.config.ts'
npm run build
```

All three passed locally.

## Please Focus Review On

- correctness of mixed `platform + byok` quota handling inside [route.ts](/d:/tmp/image-studio/.worktrees/p6-v2-canvas-main/app/api/generate/route.ts)
- whether the BYOK fair-use ceiling is applied in the right place and with the right semantics
- DB schema sanity for `userApiKeys`, `usageLogs`, and `generationJobs`
- whether the new CSP is strict enough without breaking the Excalidraw workspace
- any security concerns around decrypting user keys inside the generation route

## Known Residual Notes

- There is still a pre-existing Next.js build warning about multiple `package-lock.json` files and the deprecated `middleware` naming convention.
- Runtime behavior now floors legacy `dailyQuota` rows to `20` so old users behave correctly before an operational backfill runs.
- A temporary local artifact file `.artifacts-p6c-safe-slice.diff` may still exist in the worktree but is not part of the intended commit scope.
