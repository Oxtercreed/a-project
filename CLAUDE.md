# CLAUDE.md

See [`AGENTS.md`](./AGENTS.md) — it is the single source of agent instructions for
this repository and is kept harness-agnostic.

Short version:

- **Read `docs/wisecash-invariants.md` first.** 12 product-specific rules (INV-1…INV-12)
  that outrank `ecc/rules/` on conflict. ECC has no coverage of this domain.
- Engineering rules live in `ecc/rules/`, vendored from ECC v2.2.1. Attribution in
  `ecc/NOTICE.md`.
- Phase 1 MVP plan: `docs/implementation-plan.md`. Blocked on an unresolved stack
  decision (spec mandates Python-first; a TS/Node backend was also proposed).
- Always apply `ecc/rules/common/*`. Apply `ecc/rules/typescript/` for TS/JS/Node and
  `ecc/rules/python/` for Python.
- The ECC *plugin* is not installed here, so the named ECC agents (planner,
  tdd-guide, code-reviewer, security-reviewer, ...) do not exist. Do the equivalent
  work inline; never skip the step.
- Stack: TypeScript / Node.js, with Python also in scope.
- `WiseCash_Social_Commerce_Spec.pdf` is the product source of truth.

To install the full ECC plugin (agents, skills, commands, hooks) into Claude Code on
your own machine, run `npx ecc-universal@2.2.1 setup` — that is separate from the
vendored rules in this repo, and the two do not conflict.
