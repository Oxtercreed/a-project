# Implementation Plan: WiseCash Social Commerce Marketplace — Phase 1 (MVP)

> Produced by applying ECC `agents/planner.md` (221 lines, read in full) against
> `WiseCash_Social_Commerce_Spec.pdf` (9 pages, extracted via pypdf 6.18.1).
> Format follows the Plan Format specified in that agent.
> Complies with `ecc/rules/python/fastapi.md`, `ecc/rules/python/security.md`,
> `ecc/rules/python/testing.md`, and `ecc/rules/common/*`.

## ⚠ Decision Required Before Implementation

**Your stated stack conflicts with the spec.** You told me TypeScript/Node + Python.
Spec §5 says: *"Python-First Backend — Python is not just a convenient shared language
here... Only the thin edges of the system — the mobile client (Flutter) and raw object
storage (S3/R2) — sit outside it."*

| Option | What it means | Cost |
|---|---|---|
| **A. Follow spec** | FastAPI + Celery + Flutter, as §5 specifies | Contradicts what you told me; Flutter is a third language |
| **B. TS/Node backend** | NestJS/Fastify + Prisma | Contradicts spec §5, which explicitly argues against a Node service for chat |
| **C. Hybrid** *(recommended)* | Python backend per spec; TypeScript/Node only for the web Dashboard and marketing site | Matches spec §5.2, which allows "Django or FastAPI serving a lightweight seller Dashboard; Next.js only if a marketing/SEO site is needed" |

**This plan assumes Option C.** Every backend path is Python. TypeScript appears only
in `web/`. If you want B, the whole of Phase 1 changes and this plan must be rewritten.

## Overview

Phone-number-native social commerce: WhatsApp's trust model plus a public discovery
feed, with POS/invoicing running inside the chat thread. Phase 1 delivers the trust
spine — verified phone identity, mutual follow approval, 1:1 chat, product cards,
invoice generation, and ClickPesa payment — plus a minimal sales Dashboard.

## Requirements

From spec §6, Phase 1 (MVP, 6–8 weeks):

- Phone + OTP registration (Africa's Talking / Twilio Verify / ClickPesa SMS)
- Unique username as public Profile ID
- Basic chat, **approved contacts only** (both directions approved)
- Product card in chat (from seller inventory)
- Manual invoice generation
- ClickPesa payment link
- Basic Dashboard (sales list)

Explicitly **out of scope** for Phase 1: public Update Feed, Reels, follow requests UI,
supplier purchasing, AI assistant, staff accounts, ratings.

## Architecture Changes

Python monorepo. New tree:

```
backend/
  app/
    main.py                     # create_app() — per fastapi.md "Structure"
    core/{config,security,deps}.py
    db/session.py               # AsyncSession factory
    models/                     # SQLModel tables (spec §4)
    schemas/                    # request / update / response, kept separate
    api/routers/                # thin routers only
    api/ws/chat_socket.py       # WebSocket chat
    services/                   # business logic
    workers/                    # Celery app + tasks
  migrations/                   # Alembic
  tests/{unit,integration,e2e}/
web/                            # TypeScript — Dashboard + marketing only
```

Data model from spec §4: `User`, `FollowEdge`, `Post`, `ChatThread`, `Message`,
`Product`, `Order`, `Transaction`. Phase 1 creates `User`, `FollowEdge`,
`ChatThread`, `Message`, `Product`, `Order`, `Transaction`. `Post` is deferred.

## Implementation Steps

### Phase 1A: Foundation (mergeable alone — nothing user-facing)

1. **Scaffold the monorepo** (File: `backend/pyproject.toml`)
   - Action: Pin FastAPI, SQLModel, SQLAlchemy 2.0 async, asyncpg, alembic, celery,
     redis, pydantic-settings, pytest, pytest-asyncio, httpx, bandit
   - Why: One dependency set, per spec §5.2 "one language, one set of dependencies"
   - Dependencies: None
   - Risk: Low

2. **Config with fail-fast secrets** (File: `backend/app/core/config.py`)
   - Action: `pydantic-settings` `Settings` class; every secret read via
     `os.environ["NAME"]` so a missing value raises `KeyError` at startup
   - Why: `ecc/rules/python/security.md` requires this exact pattern; spec moves money
   - Dependencies: Step 1
   - Risk: Low

3. **App factory** (File: `backend/app/main.py`)
   - Action: `create_app()` returning a configured `FastAPI`; environment-specific CORS
   - Why: `fastapi.md` — "Put app construction in `create_app()`"; "Do not combine
     wildcard origins with credentialed CORS"
   - Dependencies: Step 2
   - Risk: Low

4. **Async session dependency** (File: `backend/app/core/deps.py`)
   - Action: `get_db` yielding `AsyncSession`; `get_current_user` validating JWT
     expiry, issuer, audience, **and algorithm**
   - Why: `fastapi.md` — "Keep database sessions and auth in dependencies";
     "Do not create `SessionLocal()` inside route handlers"
   - Dependencies: Steps 2, 3
   - Risk: Medium — algorithm confusion is a real JWT attack

5. **User + FollowEdge models and migration** (Files: `backend/app/models/user.py`,
   `backend/app/models/follow.py`, `backend/migrations/`)
   - Action: `User(id, phone_number unique, username unique, account_type,
     profile)`, `FollowEdge(requester_id, target_id, status)`; Alembic initial revision
   - Why: Spec §4. `username` uniqueness is the public-handle invariant
   - Dependencies: Step 4
   - Risk: Low

### Phase 1B: Identity (mergeable — registration works end to end)

6. **OTP issue and verify** (Files: `backend/app/services/otp.py`,
   `backend/app/api/routers/auth.py`)
   - Action: Send OTP via provider adapter behind an interface; verify with attempt
     limit and expiry; store hash, never plaintext; rate-limit the endpoint
   - Why: Spec §3.1. Rate limiting is mandatory per `common/security.md`
   - Dependencies: Step 5
   - Risk: **High** — this is the trust root for the entire product. An OTP bypass is
     total account takeover

7. **Username claim** (File: `backend/app/api/routers/users.py`)
   - Action: `POST /users/me/username`; enforce uniqueness at the DB constraint, not
     only in application code; reject homoglyphs and mixed-script names
   - Why: Spec §3.1 — username becomes the public Profile ID. Homoglyph collision is a
     real impersonation vector for a commerce identity
   - Dependencies: Step 6
   - Risk: **High** — impersonation of a seller is fraud

### Phase 1C: Chat (mergeable — two users can talk)

8. **Mutual-approval gate** (File: `backend/app/services/follow_service.py`)
   - Action: `can_chat(a, b)` returns true **only** when both `FollowEdge` directions
     are `approved`; single helper, one call site, covered by unit tests
   - Why: Spec §3.3 — the core privacy invariant. Centralising it prevents a router
     forgetting the check
   - Dependencies: Step 5
   - Risk: **High** — one missed call site leaks private conversations

9. **Thread + message models** (Files: `backend/app/models/chat.py`)
   - Action: `ChatThread(participant_a_id, participant_b_id)`, `Message(thread_id,
     sender_id, type, payload)` with `type` in
     `{text, image, product_card, invoice_card}`
   - Why: Spec §4; the `type` enum is what lets commerce live in chat
   - Dependencies: Step 8
   - Risk: Low

10. **WebSocket endpoint** (File: `backend/app/api/ws/chat_socket.py`)
    - Action: `async def` handler; authenticate on connect; call `can_chat` **on
      connect and on every send**; Redis pub/sub for multi-worker fan-out; read
      receipts
    - Why: Spec §5.1 — chat runs in Python's async layer, no separate Node service
    - Dependencies: Steps 8, 9
    - Risk: **High** — re-checking authz per message, not just per connection, is the
      part people get wrong

### Phase 1D: Commerce (mergeable — money moves)

11. **Product model and catalog CRUD** (Files: `backend/app/models/product.py`,
     `backend/app/api/routers/catalog.py`)
    - Action: `Product(owner_id, name, price, stock_qty, photo, category)`; seller-only
      writes; price as integer minor units (TSh has no fractional subunit in practice —
      confirm) — **never float**
    - Why: Spec §4. Float money is a defect class
    - Dependencies: Step 6
    - Risk: Medium

12. **Product card into chat** (File: `backend/app/api/routers/chat.py`)
    - Action: Seller attaches a product; server re-reads current price and stock from
      DB at send time and stores them in the message payload
    - Why: Snapshotting prevents a stale card misquoting a price after an edit
    - Dependencies: Steps 10, 11
    - Risk: Medium

13. **Invoice generation** (Files: `backend/app/services/invoice_service.py`,
     `backend/app/workers/tasks/invoice_pdf.py`)
    - Action: Create `Order(thread_id, buyer_id, seller_id, line_items[], total,
     status)`; PDF rendered in a Celery task, never on the request path; totals computed
     server-side from DB prices, never from client input
    - Why: Spec §3.4. Client-supplied totals would let anyone set their own price
    - Dependencies: Step 12
    - Risk: **High** — this is the money path

14. **ClickPesa integration** (File: `backend/app/services/clickpesa.py`)
    - Action: Adapter behind an interface; create Checkout Link server-side; verify
     callback signature; idempotent status transitions
     `Pending → Paid → Fulfilled`; store `payment_ref`
    - Why: Spec §3.4, §5.2 — BOT-licensed, covers M-Pesa/Tigo/Airtel/Halopesa
    - Dependencies: Step 13
    - Risk: **High** — unsigned or replayed callbacks are the classic failure. Needs
      the provider's sandbox before any real money

15. **Inventory decrement** (File: `backend/app/services/inventory.py`)
    - Action: Decrement `stock_qty` in the same transaction as the `Paid` transition;
      guard against overselling with a conditional update, not read-then-write
    - Why: Spec §3.5 — auto-decrement on sale
    - Dependencies: Step 14
    - Risk: **High** — read-then-write races oversell stock under load

### Phase 1E: Dashboard (mergeable — seller sees sales)

16. **Transaction rollup** (File: `backend/app/models/transaction.py`)
    - Action: `Transaction(type, order_id, amount, timestamp)` written on state
      transitions
    - Why: Spec §4 — Dashboard reads rollups, not orders
    - Dependencies: Step 15
    - Risk: Low

17. **Sales list endpoint** (File: `backend/app/api/routers/dashboard.py`)
    - Action: `GET /dashboard/sales`; `response_model` set; seller-scoped by
      `owner_id`; paginated
    - Why: Spec §6 — "basic Dashboard (sales list)" is all Phase 1 promises
    - Dependencies: Step 16
    - Risk: Low — but **must** be owner-scoped or it leaks other sellers' revenue

18. **Web dashboard** (File: `web/`)
    - Action: TypeScript/Next.js, seller sales list only
    - Why: Spec §5.2 permits Next.js for the web surface; this is where your
      TypeScript fits
    - Dependencies: Step 17
    - Risk: Low

## Testing Strategy

Per `ecc/rules/python/testing.md` — pytest, `pytest.mark` categorisation,
`pytest --cov=src --cov-report=term-missing`, 80%+ coverage per `common/testing.md`.

- **Unit** (`@pytest.mark.unit`): `can_chat` truth table across all four
  `FollowEdge` state combinations; invoice total computation; inventory conditional
  update; OTP expiry and attempt limiting; username uniqueness and homoglyph rejection
- **Integration** (`@pytest.mark.integration`): OTP → register → claim username;
  follow approval → thread creation → message send; invoice → ClickPesa callback →
  `Paid` → stock decrement → `Transaction` row
- **E2E**: two devices complete a purchase in chat
- **FastAPI-specific**, per `fastapi.md`: "Override the exact dependency used by
  `Depends`"; clear `app.dependency_overrides` after tests; async test client
- **Security gate**: `bandit -r src/` in CI, per `ecc/rules/python/security.md`
- **TDD order**: RED → GREEN → REFACTOR. Tests for steps 6, 8, 13, 14, 15 are written
  **before** the implementation, not after

## Risks & Mitigations

- **Risk**: Stack decision (above) is unresolved, so Phase 1A may be built on the
  wrong foundation
  - Mitigation: Resolve before Step 1. Steps 1–5 are cheap to redo; steps 6+ are not

- **Risk**: OTP bypass → total account takeover
  - Mitigation: Hash OTPs, hard expiry, attempt limit, rate limit, provider delivery
    logs. Tests written first

- **Risk**: Username homoglyph impersonation of a seller
  - Mitigation: Script-mixing rejection, normalisation before the uniqueness check,
    DB-level unique constraint

- **Risk**: A router skips the `can_chat` check
  - Mitigation: Single `can_chat` helper, one call site, integration test per route
    asserting 403 for non-approved pairs

- **Risk**: ClickPesa callback forged or replayed
  - Mitigation: Verify signature, dedupe on `payment_ref`, idempotent transitions,
    reconcile against provider statement in a nightly Celery task

- **Risk**: Stock oversold under concurrency
  - Mitigation: Conditional `UPDATE ... WHERE stock_qty >= n`; assert affected rows

- **Risk**: `gh search code` was unavailable in this sandbox, so I could **not**
  survey existing ClickPesa integrations. ClickPesa API specifics here are from the
  spec, not verified against provider docs
  - Mitigation: Read ClickPesa's current docs before Step 14. Treat this plan's
    payment detail as unverified

- **Risk**: 6–8 week estimate is the spec's, not mine, and assumes a small team
  - Mitigation: Phase 1A–1B is the true minimum to demo. Ship that, then reassess

## Success Criteria

- [ ] Phone + OTP registers a user; OTP never stored in plaintext
- [ ] Username is unique, enforced at the DB, homoglyphs rejected
- [ ] Two users chat **only** when both `FollowEdge` rows are `approved`
- [ ] Non-approved pair gets 403 on both thread create and message send
- [ ] Seller attaches a product card with the price snapshotted at send time
- [ ] Invoice total is computed server-side; a tampered client total is rejected
- [ ] ClickPesa callback with a bad signature is rejected; a replayed one is idempotent
- [ ] Stock decrements exactly once per paid order, with no oversell under concurrency
- [ ] Seller sees only their own sales in the Dashboard
- [ ] `pytest --cov=src` ≥ 80%; `bandit -r src/` clean
- [ ] No secrets in source; all read via `os.environ[...]` at startup

## Research Performed

Per `ecc/rules/common/development-workflow.md` step 0 (mandatory):

- `gh search repos "fastapi ecommerce"` → 5 results, all small tutorial/personal
  projects (`hackslashX/fastapi_ecommerce_backend`, `MKFast/FastAPI_ECommerce_Tutorial`,
  `kolenkoal/fastapi_ecommerce_api`, `Sanoy24/fastapi-ecommerce`,
  `fayzullayev20/fastapi-ecommerce`)
- `gh search repos "fastapi chat websocket"` → 3 results, all minimal tutorials
- `gh search repos "flutter marketplace app"` → 5 results, all small/personal
- **Conclusion**: nothing 80%+ reusable exists. Build net-new on established libraries
  rather than forking a base
- **Gap**: `gh search code` is not available in this `gh` build (`unknown command
  "code"`), so existing ClickPesa integrations were **not** surveyed
