# Stage Review Workflow

Use these review docs as the shared handoff between implementation and Claude Code review.

## Expected Loop

1. Codex finishes one phase.
2. Codex fills a stage-specific request file such as `p6a-review-request.md`.
3. Claude Code reads the request plus the branch diff, then writes findings into a response file such as `p6a-review-response.md`.
4. Codex addresses blocking findings, re-runs verification, and updates the same request file with the final resolved status.
5. Only then does the next phase begin.

## Naming

- Request: `p6x-review-request.md`
- Response: `p6x-review-response.md`

## Severity Expectation

- `blocking` means the phase should not continue until fixed
- `high` means fix in the same phase unless explicitly deferred
- `medium` and `low` can be scheduled into the next appropriate phase if they are non-regressions

