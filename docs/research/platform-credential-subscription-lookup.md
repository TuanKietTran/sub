# Platform Credential → Subscription Lookup

## What Is a "Platform Credential"?

A **platform credential** is any token or identifier presented by a caller that lets the system establish *who* (or *what*) is making the request, without requiring a human login flow. In this codebase the term covers four distinct kinds:

| Kind | Examples | Lives where |
|---|---|---|
| **API key** | `sk_live_abc123` issued to a developer or machine | Hashed in user/org row |
| **OAuth access token** | Short-lived bearer token from the auth server | Validated against token introspection endpoint |
| **Service account token** | Long-lived JWT for a backend service (e.g. billing worker) | Signed with service-account private key |
| **Stripe customer ID** | `cus_XYZ` stored on the Subscription aggregate | Stripe ledger only — not a first-party identity token |

All four can arrive in an HTTP request, but they resolve to different identity primitives:

```
API key / OAuth token / SA token  →  UserId  (first-party identity)
Stripe customer ID                →  platformCustomerId on Subscription  (third-party identifier)
```

---

## Approaches to Query Subscriptions by Platform Credential

### Approach 1 — Index `platformCustomerId` on the Subscription Aggregate

Add a `platformCustomerId: string | null` field to `SubscriptionProps` and expose `SubscriptionRepository.findByPlatformCustomerId(id)`.

**Pros:**
- Single-repo lookup; no cross-service call.
- Works for webhook handlers (Stripe sends `customer.id`, not `UserId`).
- Full control over the result set.

**Cons:**
- Subscription aggregate now carries a Stripe-specific field — leaks infra concern into domain.
- Requires keeping `platformCustomerId` in sync when Stripe customer changes.
- Breaks portability if payment gateway changes (Square, Paddle, etc.).

---

### Approach 2 — Stripe `customer.subscription.list` via PaymentGateway Port

Define a `PaymentGateway` port interface with `listSubscriptions(platformCustomerId: string)` and delegate to the Stripe SDK in the adapter.

**Pros:**
- Domain stays clean — Stripe data lives in Stripe.
- Always returns the authoritative list from the payment processor.
- No sync problem.

**Cons:**
- Network call on every read; latency and availability coupling.
- Stripe's subscription model may not map 1-to-1 with internal `Subscription` aggregate.
- Needs hydration logic to merge Stripe data with local aggregate state.

---

### Approach 3 — Identity Token → `UserId` → `SubscriptionRepository.findByUser()`

Resolve the incoming API key / OAuth token / SA token to a `UserId` via an identity layer, then call the existing repository method.

**Pros:**
- Clean: identity resolution and data access are separated.
- Works with any credential type that maps to a first-party `UserId`.
- No Stripe coupling on the happy path.
- Aligns with DDD — `UserId` is the natural owner of subscriptions.

**Cons:**
- Doesn't work for Stripe customer IDs (they are not `UserId`s).
- Requires an identity/token resolution service (lightweight, but must exist).
- Token introspection adds a round-trip if tokens are not self-contained JWTs.

---

### Approach 4 — ABAC Service Account with `isServiceAccount=true` + Cross-User Read Policy

A calling service authenticates as a service account (`SubjectAttributes.isServiceAccount = true`). A dedicated ABAC policy (e.g. `ServiceAccountCrossOrgReadPolicy`) inspects the service-account identity and, if it holds the right attributes (e.g. `tier: "enterprise"`, specific `orgId`), allows `subscription:read` across users within that org.

**Pros:**
- Expresses intent in the policy layer, not in ad-hoc if-chains.
- Composable with existing `PolicyEvaluator` (deny-overrides).
- Service account access is auditable via `AccessRequest` snapshots.
- Forces callers to declare *why* they need cross-user access.

**Cons:**
- Adds policy complexity; policies must be tested carefully.
- Does not solve the Stripe customer ID → `UserId` mapping problem on its own.
- Requires the calling service to be issued a proper service-account credential.

---

## Tradeoffs Summary

| Dimension | Approach 1 (Index) | Approach 2 (Gateway) | Approach 3 (UserId) | Approach 4 (ABAC SA) |
|---|---|---|---|---|
| Consistency | Eventual (sync lag) | Authoritative | Authoritative | Authoritative |
| Latency | Low | High (network) | Low–medium | Low (policy eval in-process) |
| Stripe coupling | High | High (port isolates) | None | None |
| DDD alignment | Poor (infra in domain) | Good (port) | Excellent | Excellent |
| ABAC alignment | N/A | Neutral | Good | Native |
| Scope | Stripe webhook path | Payment-gateway path | General API path | Service-to-service path |

---

## Recommended Approach

**Combine Approach 3 + Approach 4**, with Approach 1 as a narrow exception for Stripe webhook handlers only.

Rationale:

1. **Standard API calls** (user-initiated or OAuth-delegated): resolve credential → `UserId` → `SubscriptionRepository.findByUser()`. This keeps the domain clean and the ABAC evaluation meaningful.

2. **Service-to-service calls** (billing worker, audit service): issue a service account, set `isServiceAccount=true` in `SubjectAttributes`, add a `ServiceAccountCrossOrgReadPolicy` if cross-org reads are required. All access goes through `PolicyEvaluator`.

3. **Stripe webhook handlers** (narrow infra path only): add `platformCustomerId` as an *infrastructure* field on the repo adapter (not on the domain aggregate). The SQLite/KV adapter exposes `findByPlatformCustomerId`; the domain model never sees it.

This avoids polluting `SubscriptionProps` with a Stripe ID while still enabling efficient webhook processing, and it makes all first-party access decisions auditable via `AccessRequest` / `AccessDecision`.

---

## Open Questions Before Coding

1. **Token resolution service**: Do we build a lightweight `IdentityService` that turns an API key / JWT into a `UserId`, or does Nuxt middleware handle this via session cookies? Define the interface before wiring handlers.

2. **`platformCustomerId` placement**: If we add it to the repo adapter only, where does the mapping live when we need to go the other direction (UserId → Stripe customer ID for checkout)? Need a `PaymentGateway` port.

3. **Service account issuance**: How are service accounts created and rotated? Need a bootstrap flow (CLI script? Admin API?) before `ServiceAccountReadOnlyPolicy` is useful in production.

4. **Audit log**: `AccessRequest` + `AccessDecision` pairs should be persisted for compliance. Where does this go? Separate `iam_audit` table? Or event stream?

5. **Cross-org policy granularity**: `SameOrgPolicy` currently allows any org member to `subscription:read`. Is that the right default, or should it require an explicit org-admin grant?

6. **Stripe customer ID sync**: If a user changes payment method and Stripe rotates `cus_XYZ`, how is the mapping kept fresh? Stripe webhook `customer.updated`?
