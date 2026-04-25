import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import { Instant } from "../domain/datetime/instant";

export interface PauseSubscriptionInput {
  subscriptionId: string;
  pausedAt?: string;
}

export interface PauseSubscriptionOutput {
  subscriptionId: string;
  pausedAt: string;
}

export const pauseSubscriptionHandler = createHandler<
  PauseSubscriptionInput,
  PauseSubscriptionOutput
>("PauseSubscription", async (payload) => {
  const id = SubscriptionId.of(payload.subscriptionId);
  const at = payload.pausedAt
    ? Instant.fromISO(payload.pausedAt)
    : Instant.now();

  // TODO: load from repo
  // const repo = useSubscriptionRepo();
  // const sub = await repo.findById(id);
  // if (!sub) return { success: false, error: `Subscription ${id.value} not found` };
  // const paused = sub.pause(at);
  // await repo.save(paused);

  return {
    success: true,
    data: {
      subscriptionId: id.value,
      pausedAt: at.toISO(),
    },
  };
});

export function pauseSubscriptionCommand(input: PauseSubscriptionInput) {
  return {
    _type: "command" as const,
    requestName: "PauseSubscription",
    payload: input,
  };
}

export function registerPauseSubscription() {
  useMediator().registerCommand(pauseSubscriptionHandler);
}
