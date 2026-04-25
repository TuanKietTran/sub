# Batch 2 Summary

## Files Built

### `core/handler/` — Subscription CQRS Handlers

| File | Kind | Key Exports |
|---|---|---|
| `cancel-subscription.ts` | Command | `cancelSubscriptionHandler`, `cancelSubscriptionCommand()`, `registerCancelSubscription()` |
| `pause-subscription.ts` | Command | `pauseSubscriptionHandler`, `pauseSubscriptionCommand()`, `registerPauseSubscription()` |
| `resume-subscription.ts` | Command | `resumeSubscriptionHandler`, `resumeSubscriptionCommand()`, `registerResumeSubscription()` |
| `renew-subscription.ts` | Command | `renewSubscriptionHandler`, `renewSubscriptionCommand()`, `registerRenewSubscription()` |
| `get-subscription.ts` | Query | `getSubscriptionHandler`, `getSubscriptionQuery()`, `registerGetSubscription()` |

All handlers follow the `createHandler<TInput, TOutput>` pattern, return `{ success, data }` or `{ success: false, error }`, and export a `register*()` boot function. Repo calls are TODO-stubbed pending the wiring in batch 3.

`renew-subscription.ts` uses `BillingCycle.of(period)` to compute `newPeriodEnd` from `renewedAt`, matching the domain's `Subscription.renew(at, newPeriodEnd)` signature.

### `core/domain/iam/` — ABAC Identity & Access

| File | Key Exports |
|---|---|
| `user-id.ts` | `UserId` VO — opaque non-empty string, `UserId.of(id)` |
| `action.ts` | `Action` VO — 8 action codes, static singletons, `isReadOnly()` helper |
| `subject-attributes.ts` | `SubjectAttributes` VO — userId, orgId, tier, isOwner, isServiceAccount |
| `resource-attributes.ts` | `ResourceAttributes` VO — resourceType, resourceId, ownerUserId, ownerOrgId |
| `access-request.ts` | `AccessRequest` VO — composes subject + resource + action + Instant |
| `access-decision.ts` | `AccessDecision` VO — effect + reason, `allow()` / `deny()` factories, `isAllowed()` |
| `policy.ts` | `Policy` interface, `PolicyEvaluator` (deny-overrides), `OwnerFullAccessPolicy`, `ServiceAccountReadOnlyPolicy`, `SameOrgPolicy` |

### `docs/research/`

| File | Contents |
|---|---|
| `platform-credential-subscription-lookup.md` | Defines platform credentials, evaluates 4 lookup strategies, recommends Approach 3+4 hybrid, lists 6 open questions |

---

## Why ABAC over RBAC

RBAC maps roles to permissions statically: `admin → [read, write, cancel]`. It works well when access rules depend only on *who* the caller is.

This system has richer context that RBAC cannot express cleanly:

- **Resource ownership**: a user may `subscription:cancel` their own subscription but not someone else's — even if both are `pro` tier users with the same role.
- **Org boundary**: a member of org A may read org A's subscriptions but not org B's, even though both have role `member`.
- **Service account restrictions**: a machine caller should be read-only regardless of what role it was issued.
- **Tier-based future rules**: `enterprise` accounts may eventually unlock cross-org admin capabilities; tier is an attribute of the subject, not a role.

ABAC captures all of this in composable, independently testable `Policy` objects. The `PolicyEvaluator`'s deny-overrides combinator means new policies can be added without modifying existing ones, and each policy is a pure function of `AccessRequest → AccessDecision | null`.

---

## What's Next — Batch 3

- **Wire `UserId` into `Subscription`**: replace the raw `userId: string` field with `UserId` VO.
- **`PaymentGateway` port**: define the interface (`charge`, `listSubscriptions`, `cancelStripeSubscription`) and a Stripe adapter. This also enables Approach 2 from the research note for webhook handlers.
- **Nitro wiring**: register all batch-2 handlers at server startup via `registerAll()` in a Nitro plugin; add `useSubscriptionRepo()` composable backed by the SQLite adapter.
- **Identity resolution middleware**: resolve API key / session cookie → `UserId` in Nuxt server middleware; attach `SubjectAttributes` to `event.context`.
- **Pricing page**: Nuxt page + API route using `GetSubscription` query + plan data from `Plan` entity.
