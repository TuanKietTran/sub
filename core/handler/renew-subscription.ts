import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import { Instant } from "../domain/datetime/instant";
import { BillingCycle } from "../domain/subscription/billing-cycle";
import type { BillingPeriod } from "../domain/subscription/billing-cycle";

export interface RenewSubscriptionInput {
  subscriptionId: string;
  renewedAt?: string;
  billingPeriod?: string;
}

export interface RenewSubscriptionOutput {
  subscriptionId: string;
  newPeriodStart: string;
  newPeriodEnd: string;
}

export const renewSubscriptionHandler = createHandler<
  RenewSubscriptionInput,
  RenewSubscriptionOutput
>("RenewSubscription", async (payload) => {
  const id = SubscriptionId.of(payload.subscriptionId);
  const at = payload.renewedAt
    ? Instant.fromISO(payload.renewedAt)
    : Instant.now();

  const cycle = BillingCycle.of(
    (payload.billingPeriod as BillingPeriod) ?? "monthly",
  );
  const newPeriodEnd = at.plusMillis(cycle.duration.millis);

  // TODO: load from repo
  // const repo = useSubscriptionRepo();
  // const sub = await repo.findById(id);
  // if (!sub) return { success: false, error: `Subscription ${id.value} not found` };
  // const renewed = sub.renew(at, newPeriodEnd);
  // await repo.save(renewed);

  return {
    success: true,
    data: {
      subscriptionId: id.value,
      newPeriodStart: at.toISO(),
      newPeriodEnd: newPeriodEnd.toISO(),
    },
  };
});

export function renewSubscriptionCommand(input: RenewSubscriptionInput) {
  return {
    _type: "command" as const,
    requestName: "RenewSubscription",
    payload: input,
  };
}

export function registerRenewSubscription() {
  useMediator().registerCommand(renewSubscriptionHandler);
}
