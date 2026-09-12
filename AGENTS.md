# AGENTS.md — WiseCash

Instructions for any AI coding agent working in this repository.
Read this file before writing code.

## Repository state

| File | What it is |
|---|---|
| `README.md` | Placeholder — "just a project" |
| `Ui.txt` | 724-line HTML/CSS UI concept, "WiseCash — UI Concept". Design tokens: sage `#F3F6F0`, teal `#0F5C56`, marigold `#F2A93B`, coral `#E8654A`. Fonts: Sora, Inter, IBM Plex Mono |
| `WiseCash_Social_Commerce_Spec.pdf` | Product spec, 10 pages. **The source of truth for product scope.** Not yet parsed into text — extract and read it before making product decisions |
| `ecc/` | Vendored ECC rule packs (see below) |
| `docs/implementation-plan.md` | Phase 1 MVP plan — 18 steps, 5 mergeable phases |
| `docs/wisecash-invariants.md` | **12 product invariants (INV-1…INV-12). Outranks `ecc/rules/`** |

No application source code exists yet.

**Stack is unresolved and blocks implementation.** The spec mandates a Python-first
backend (FastAPI + Celery + PostgreSQL + Redis, Flutter client — spec §5), which
conflicts with a TypeScript/Node backend. `docs/implementation-plan.md` plans against
the hybrid reading of spec §5.2: Python backend, TypeScript only in `web/`. Resolve
this before plan step 6.

## Project invariants — read these first

[`docs/wisecash-invariants.md`](./docs/wisecash-invariants.md) holds 12 non-negotiable
rules specific to this product (INV-1 … INV-12): phone/username privacy, OTP as trust
root, mutual-approval chat, integer money, ClickPesa idempotency, atomic stock
decrement, username homoglyphs, dashboard owner-scoping, chat/log separation, AI never
moves money, Swahili-first.

**These outrank `ecc/rules/` on conflict.** ECC has zero coverage of this domain —
verified by grep, no hits for `mobile money`, `invoice`, `websocket`, `chat`,
`commerce`, `fraud`, `idempotency`, `oversell`, or `homoglyph`.

If a change touches a path listed under an invariant but does not touch that
invariant's assertion, ask why. Each invariant carries a testable assertion — the
assertion is the rule; the prose is only the explanation.

## Rule packs

Engineering rules are vendored under [`ecc/rules/`](./ecc/rules/), sourced from
[ECC v2.2.1](https://github.com/affaan-m/ECC). Attribution: [`ecc/NOTICE.md`](./ecc/NOTICE.md).

**Always apply** — every task, every file:

- `ecc/rules/common/coding-style.md`
- `ecc/rules/common/security.md`
- `ecc/rules/common/testing.md`
- `ecc/rules/common/git-workflow.md`
- `ecc/rules/common/code-review.md`
- `ecc/rules/common/development-workflow.md`
- `ecc/rules/common/patterns.md`
- `ecc/rules/common/performance.md`

**Apply by stack:**

- TypeScript, JavaScript, Node.js → `ecc/rules/typescript/` (5 files; the TS pack covers plain JS — there is no separate JS pack)
- Python → `ecc/rules/python/` (6 files, includes `fastapi.md`)
- Web front end → `ecc/rules/web/`

**Apply only when touching that language.** The other 18 packs are vendored for
convenience, not active by default: `angular`, `arkts`, `cpp`, `csharp`, `dart`,
`fsharp`, `golang`, `java`, `kotlin`, `nuxt`, `perl`, `php`, `react`,
`react-native`, `ruby`, `rust`, `swift`, `vue`. Load the matching pack before
reviewing or editing code in that language.

## Missing agents

The rule packs were written for the ECC plugin and refer to named ECC agents —
**planner**, **architect**, **tdd-guide**, **code-reviewer**, **security-reviewer**,
**docs-lookup**, **python-reviewer**, and others. The ECC plugin runtime is *not*
installed here, so those agents do not exist.

**Do not skip the step because the agent is unavailable.** Perform the equivalent
work inline: write the plan yourself, write the tests first yourself, review your own
diff against `code-review.md` before committing, and check secrets against
`security.md` yourself.

## Non-negotiables

1. **Research before implementing.** Per `common/development-workflow.md`: search
   GitHub and package registries for existing solutions before writing net-new code.
2. **Tests before implementation.** RED → GREEN → REFACTOR. Target 80%+ coverage.
3. **No secrets in source.** Environment variables only. Validate required secrets at
   startup. This applies with extra force to a payments/social-commerce product.
4. **Validate all user input.** Parameterized queries, sanitized HTML, rate limiting
   on every endpoint.
5. **Conventional commits.** See `common/git-workflow.md`.
6. **Design tokens are fixed.** Use the palette and fonts from `Ui.txt`. Do not
   introduce new brand colours without being asked.

## Before you commit

Run the project's own checks over the code you changed — its tests, build, and
typecheck. Name the code path the check actually executed. A clean exit code with
wrong output is not a pass.

Then confirm the `ecc/rules/common/security.md` pre-commit checklist: no hardcoded
secrets, inputs validated, injection prevented, error messages not leaking internals.

If the change touches money, auth, chat, or inventory, also work through the 13-item
pre-commit gate in [`docs/wisecash-invariants.md`](./docs/wisecash-invariants.md).
