import { createHandler, useMediator } from "../cqrs";
import { Subscription } from "../domain/subscription/subscription";
import { BillingCycle } from "../domain/subscription/billing-cycle";
import { Instant } from "../domain/datetime/instant";

export interface CreateSubscriptionInput {
   userId: string;
   planId: string;
   billingPeriod?: string;   // defaults to "monthly"
   startAt?: string;         // ISO string; defaults to now
   trialDays?: number;
}

export interface CreateSubscriptionOutput {
   subscriptionId: string;
}

export const createSubscriptionHandler = createHandler<
   CreateSubscriptionInput,
   CreateSubscriptionOutput
>("CreateSubscription", async (payload) => {
   const startAt = payload.startAt
      ? Instant.fromISO(payload.startAt)
      : Instant.now();

   const cycle = BillingCycle.of(
      (payload.billingPeriod as any) ?? "monthly",
   );

   const periodEnd = startAt.plusMillis(cycle.duration.millis);

   const trialDuration = payload.trialDays
      ? (await import("../domain/datetime/duration")).Duration.fromDays(payload.trialDays)
      : undefined;

   const sub = Subscription.create({
      id: crypto.randomUUID(),
      userId: payload.userId,
      planId: payload.planId,
      startAt,
      periodEnd,
      trialDuration,
   });

   // TODO: persist via SubscriptionRepository once an adapter is wired
   // const repo = useSubscriptionRepo();
   // await repo.save(sub);

   return {
      success: true,
      data: { subscriptionId: sub.id.value },
   };
});

// convenience: build the command object for mediator.send()
export function createSubscriptionCommand(input: CreateSubscriptionInput) {
   return {
      _type: "command" as const,
      requestName: "CreateSubscription",
      payload: input,
   };
}

// register this handler with the global mediator (call once at startup)
export function registerCreateSubscription() {
   useMediator().registerCommand(createSubscriptionHandler);
}
