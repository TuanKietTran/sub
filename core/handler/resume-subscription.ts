import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";

export interface ResumeSubscriptionInput {
  subscriptionId: string;
}

export interface ResumeSubscriptionOutput {
  subscriptionId: string;
}

export const resumeSubscriptionHandler = createHandler<
  ResumeSubscriptionInput,
  ResumeSubscriptionOutput
>("ResumeSubscription", async (payload) => {
  const id = SubscriptionId.of(payload.subscriptionId);

  // TODO: load from repo
  // const repo = useSubscriptionRepo();
  // const sub = await repo.findById(id);
  // if (!sub) return { success: false, error: `Subscription ${id.value} not found` };
  // const resumed = sub.resume();
  // await repo.save(resumed);

  return {
    success: true,
    data: { subscriptionId: id.value },
  };
});

export function resumeSubscriptionCommand(input: ResumeSubscriptionInput) {
  return {
    _type: "command" as const,
    requestName: "ResumeSubscription",
    payload: input,
  };
}

export function registerResumeSubscription() {
  useMediator().registerCommand(resumeSubscriptionHandler);
}
