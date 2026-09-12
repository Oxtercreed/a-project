# WiseCash Invariants

Non-negotiable rules specific to this product. These exist because **ECC's 122 rule
files have zero coverage of this domain** — verified by grep: no hits for
`mobile money`, `invoice`, `websocket`, `chat`, `commerce`, `fraud`, `idempotency`,
`oversell`, or `homoglyph`. Its one "OTP" hit is Ruby Devise MFA; its "race condition"
hits are React-only.

These rules outrank `ecc/rules/` on conflict. They gate every phase of
[implementation-plan.md](./implementation-plan.md).

Each invariant states the rule, the failure it prevents, and a **testable assertion**.
An invariant without an assertion is a comment, not a rule.

---

## INV-1 · Phone number is private; username is public

**Rule.** `User.phone_number` is never serialised into any public response, feed post,
comment, search result, or notification. Only `username` is public.

**Why.** Spec identity model: username "becomes their public Profile ID... instead of
exposing their phone number publicly." Phone is the trust root *and* the login
credential. Leaking it converts a social feature into an account-takeover vector.

**Assertion.** For every response model returned by a public endpoint, assert
`"phone_number" not in model.model_fields`. Add a schema-level test that fails on any
public model containing the field.

**Applies to.** `schemas/`, all `public` routers, FCM payloads, log redaction.

---

## INV-2 · OTP is the trust root — treat compromise as total loss

**Rule.** OTP codes are stored only as salted hashes, expire within minutes, allow a
bounded number of attempts, and the issue endpoint is rate-limited per phone number
**and** per source IP. Verification success is logged; failure is logged; the code
itself is never logged.

**Why.** Spec §3.1 makes phone+OTP the entire identity foundation — "same trust root as
WhatsApp." There is no second factor. An OTP bypass is not a bug in one feature, it is
every account in the database.

**Assertion.**
- Hash stored, plaintext absent from DB and from all log output
- Expired code rejected; code rejected after N attempts
- Rate limit returns 429 on the Nth request within the window
- A replayed verified code cannot be reused

**Applies to.** `services/otp.py`, `api/routers/auth.py`. **Tests written before
implementation** (plan step 6, risk: High).

---

## INV-3 · Chat requires mutual approval, checked everywhere

**Rule.** A single helper — `follow_service.can_chat(a, b)` — is the only way to
authorise a conversation. It returns true **only** when both `FollowEdge` rows are
`approved`. It is called on thread creation, on WebSocket connect, **and on every
message send**. No router performs its own follow check.

**Why.** Spec §3.3: "Approval required both ways before chat unlocks." Chat is the trust
layer; a single route that forgets the check silently makes private conversations
readable. Per-connection checks are not enough — approval can be revoked mid-session.

**Assertion.**
- `can_chat` truth table across all four edge-state combinations: only
  (approved, approved) is true
- Every chat route returns 403 for a non-approved pair — asserted per route, not once
- Revoking approval terminates an open WebSocket

**Applies to.** `services/follow_service.py`, `api/routers/chat.py`,
`api/ws/chat_socket.py`. (Plan steps 8, 10.)

---

## INV-4 · Money is integer minor units, computed server-side

**Rule.** All amounts are integers in minor units. Never `float`. Totals, line-item
prices, tax, and commission are recomputed on the server from the database at the
moment of use. Client-supplied totals are **rejected**, not corrected.

**Why.** Float money is a defect class, not a style preference. And a client-supplied
total on an invoice endpoint is simply "let the buyer set their own price."

**Assertion.**
- No `float`/`Decimal`-from-JSON in any money field; type is `int`
- Invoice created from a tampered client total is rejected with 4xx
- Rounding is explicit and tested at boundaries

**Applies to.** `models/product.py`, `models/order.py`, `services/invoice_service.py`.
(Plan steps 11, 13.)

---

## INV-5 · Product cards snapshot price and stock at send time

**Rule.** When a seller attaches a product to a message, the server re-reads current
`price` and `stock_qty` from the DB and stores them in the message payload. Cards never
render live from `Product`.

**Why.** Spec §3.4 puts the catalog inside the chat. A card that renders live will
silently re-quote an old price after the seller edits it — and in a commerce context
that is a dispute, not a glitch.

**Assertion.** Edit a product's price after sending a card; assert the card still shows
the snapshotted price and the new order uses the current one.

**Applies to.** `api/routers/chat.py`, `Message.payload`. (Plan step 12.)

---

## INV-6 · ClickPesa callbacks are verified, deduped, idempotent

**Rule.** Every callback verifies the provider signature **before** any state change.
Each `payment_ref` is processed at most once — a duplicate is acknowledged without
re-applying. State transitions are one-directional: `Pending → Paid → Fulfilled`.
Never trust an amount from the callback; reconcile against the stored `Order.total`.

**Why.** Spec §5.2 — ClickPesa carries M-Pesa, Tigo Pesa, Airtel Money, Halopesa. This
is real money on real rails. Unsigned callbacks are forgeable; un-deduped callbacks
double-credit; a callback-supplied amount that overrides the order is a free-money bug.

**Assertion.**
- Callback with invalid signature → rejected, no state change
- Same `payment_ref` delivered twice → order transitions once
- Callback amount ≠ order total → rejected and flagged
- Out-of-order transitions (e.g. `Paid` before `Pending` exists) are refused

**Applies to.** `services/clickpesa.py`, `workers/tasks/`. (Plan step 14, risk: High.)

> **Unverified.** ClickPesa's current API specifics could not be confirmed here —
> `gh search code` is unavailable in this environment. Read the provider's live docs
> before implementing.

---

## INV-7 · Stock decrements atomically; never oversell

**Rule.** Decrement inside the same DB transaction as the `Paid` transition, using a
conditional update (`UPDATE ... SET stock_qty = stock_qty - n WHERE id = :id AND
stock_qty >= n`) and asserting the affected-row count. Read-then-write is forbidden.

**Why.** Spec §3.5 auto-decrements on sale. Read-then-write oversells under concurrency,
and an oversell on a marketplace is a fulfilment failure the seller cannot undo.

**Assertion.** Fire N concurrent purchases for M < N units of stock; assert exactly M
succeed and `stock_qty` is 0, never negative.

**Applies to.** `services/inventory.py`. (Plan step 15, risk: High.)

---

## INV-8 · Username uniqueness survives normalisation and homoglyphs

**Rule.** Usernames are normalised before the uniqueness check, mixed-script and
confusable characters are rejected, and uniqueness is enforced by a **database unique
constraint** — not application code alone.

**Why.** Spec §3.1: username is the public Profile ID and how follow requests are sent.
A visually identical handle impersonating a known seller is direct fraud, and
application-level checks race.

**Assertion.**
- Registering a confusable variant of an existing username → rejected
- Two concurrent claims of the same username → exactly one succeeds (DB raises)
- Case/whitespace variants collide as intended

**Applies to.** `api/routers/users.py`, migration. (Plan step 7, risk: High.)

---

## INV-9 · Dashboard queries are owner-scoped; no IDOR

**Rule.** Every seller-facing query filters by `owner_id` derived from the
authenticated principal — never from a request parameter. Staff access is checked
through an explicit permission layer.

**Why.** Spec §3.5 exposes revenue, inventory, and buyer data. An owner-id taken from
the query string means any seller can read any other seller's revenue by changing one
integer.

**Assertion.** For every `/dashboard/*` route, request another seller's resource and
assert 403/404 — never 200 with someone else's data.

**Applies to.** `api/routers/dashboard.py`, staff permission layer. (Plan step 17.)

---

## INV-10 · Chat content never reaches public surfaces, analytics, or logs

**Rule.** `Message` payloads are excluded from the public feed, from search indexing,
from analytics events, and from application logs. `Post` is public by design; `Message`
is private by design. The two never share a serialiser.

**Why.** Spec §2 separates the layers: Update Feed is "Public — anyone on the app,"
Chat is "Only mutual contacts." Observability tooling quietly exporting private
messages is the most common way this boundary dies.

**Assertion.** Send a message containing a canary string; assert it appears in no log
sink, analytics payload, or feed response. Assert no shared serialiser between `Post`
and `Message`.

**Applies to.** logging config, analytics events, `api/routers/posts.py`.

---

## INV-11 · AI never moves money

**Rule.** AI features may draft and suggest. Invoice creation, sending, and payment
always require an explicit human confirmation from a verified principal. No AI output
writes to `Order.status`, `Product.stock_qty`, or any payment field.

**Why.** Spec §3.7: "Keep AI assistive, not autonomous, for money-moving actions — a
human always confirms before an invoice is sent or paid."

**Assertion.** Attempt a money-mutating write through the AI path; assert it is refused
or reduced to a draft requiring confirmation.

**Applies to.** AI assistant layer (Phase 3 — gate it now so it is not retrofitted).

---

## INV-12 · Swahili-first presentation

**Rule.** Every user-facing string, error message, invoice label, and AI response is
authored in Swahili first with English as fallback. TSh amount formatting, date
formats, and payment terminology match local mobile-money conventions.

**Why.** Spec §8.6: "translated-after-the-fact apps consistently feel foreign;
Swahili-native ones don't." Retrofitting i18n onto hardcoded strings is expensive;
starting with English strings and translating later is how this gets skipped forever.

**Assertion.** No user-facing literal in view or response code; all strings resolve
through the i18n layer. CI fails on a hardcoded user-facing string.

**Applies to.** All user-facing surfaces, invoice PDF templates.

---

## Pre-commit gate

Run before every commit touching money, auth, chat, or inventory:

- [ ] INV-1 No phone number in any public response or log
- [ ] INV-2 OTP hashed, expiring, attempt-limited, rate-limited
- [ ] INV-3 `can_chat` called on connect **and** every send; one helper, one call site
- [ ] INV-4 Integer minor units; server-computed totals; client totals rejected
- [ ] INV-5 Cards snapshot price and stock at send time
- [ ] INV-6 Signature verified; `payment_ref` deduped; transitions idempotent
- [ ] INV-7 Conditional update; affected rows asserted; no oversell
- [ ] INV-8 DB unique constraint; normalisation before the check
- [ ] INV-9 Owner-scoped from the principal, never from request params
- [ ] INV-10 No message content in logs, analytics, or feed
- [ ] INV-11 No AI write to money or stock
- [ ] INV-12 No hardcoded user-facing strings
- [ ] `pytest --cov=src` ≥ 80% · `bandit -r src/` clean

## Reviewing a change against this file

If a diff touches a path listed under an invariant and the diff does not touch that
invariant's assertion, ask why. The assertion is the rule; the prose is only the
explanation.
