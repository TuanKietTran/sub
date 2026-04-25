import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import { Instant } from "../domain/datetime/instant";

export interface CancelSubscriptionInput {
  subscriptionId: string;
  cancelledAt?: string;
}

export interface CancelSubscriptionOutput {
  subscriptionId: string;
  cancelledAt: string;
}

export const cancelSubscriptionHandler = createHandler<
  CancelSubscriptionInput,
  CancelSubscriptionOutput
>("CancelSubscription", async (payload) => {
  const id = SubscriptionId.of(payload.subscriptionId);
  const at = payload.cancelledAt
    ? Instant.fromISO(payload.cancelledAt)
    : Instant.now();

  // TODO: load from repo
  // const repo = useSubscriptionRepo();
  // const sub = await repo.findById(id);
  // if (!sub) return { success: false, error: `Subscription ${id.value} not found` };
  // const cancelled = sub.cancel(at);
  // await repo.save(cancelled);

  return {
    success: true,
    data: {
      subscriptionId: id.value,
      cancelledAt: at.toISO(),
    },
  };
});

export function cancelSubscriptionCommand(input: CancelSubscriptionInput) {
  return {
    _type: "command" as const,
    requestName: "CancelSubscription",
    payload: input,
  };
}

export function registerCancelSubscription() {
  useMediator().registerCommand(cancelSubscriptionHandler);
}
