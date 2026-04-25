import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";

export interface GetSubscriptionInput {
  subscriptionId: string;
}

// Matches Subscription.toJSON() shape
export interface GetSubscriptionOutput {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  pausedAt: string | null;
  nextIntervalPlanId: string | null;
}

export const getSubscriptionHandler = createHandler<
  GetSubscriptionInput,
  GetSubscriptionOutput
>("GetSubscription", async (payload) => {
  const id = SubscriptionId.of(payload.subscriptionId);

  // TODO: load from repo
  // const repo = useSubscriptionRepo();
  // const sub = await repo.findById(id);
  // if (!sub) return { success: false, error: `Subscription ${id.value} not found` };
  // return { success: true, data: sub.toJSON() };

  return {
    success: false,
    error: `GetSubscription: repo not wired (id=${id.value})`,
  };
});

export function getSubscriptionQuery(input: GetSubscriptionInput) {
  return {
    _type: "query" as const,
    requestName: "GetSubscription",
    payload: input,
  };
}

export function registerGetSubscription() {
  useMediator().registerQuery(getSubscriptionHandler);
}
