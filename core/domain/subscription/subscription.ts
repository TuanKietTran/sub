import { ValueObject } from "../value-object";
import { PlanId } from "../plan";
import { SubscriptionStatus } from "./subscription-status";
import { Instant } from "../datetime/instant";
import { Duration } from "../datetime/duration";

interface SubscriptionIdProps {
   value: string;
}

export class SubscriptionId extends ValueObject<SubscriptionIdProps> {
   constructor(props: SubscriptionIdProps) {
      super(props);
   }

   static of(id: string): SubscriptionId {
      if (!id || !id.trim()) throw new Error("SubscriptionId must not be empty");
      return new SubscriptionId({ value: id.trim() });
   }

   get value(): string { return this.props.value; }
   toString(): string { return this.props.value; }
   toJSON(): string { return this.props.value; }
}

interface SubscriptionProps {
   id: SubscriptionId;
   userId: string;
   planId: PlanId;
   status: SubscriptionStatus;
   startedAt: Instant;
   currentPeriodStart: Instant;
   currentPeriodEnd: Instant;
   trialEndsAt: Instant | null;
   cancelledAt: Instant | null;
   pausedAt: Instant | null;
}

export class Subscription extends ValueObject<SubscriptionProps> {
   constructor(props: SubscriptionProps) {
      super(props);
   }

   static create(params: {
      id: string;
      userId: string;
      planId: string;
      startAt: Instant;
      periodEnd: Instant;
      trialDuration?: Duration;
   }): Subscription {
      if (!params.userId.trim()) throw new Error("userId must not be empty");

      const hasTrial = params.trialDuration != null && params.trialDuration.millis > 0;
      const trialEndsAt = hasTrial
         ? params.startAt.plusMillis(params.trialDuration!.millis)
         : null;
      const initialStatus = hasTrial
         ? SubscriptionStatus.TRIALING
         : SubscriptionStatus.ACTIVE;

      return new Subscription({
         id: SubscriptionId.of(params.id),
         userId: params.userId.trim(),
         planId: PlanId.of(params.planId),
         status: initialStatus,
         startedAt: params.startAt,
         currentPeriodStart: params.startAt,
         currentPeriodEnd: params.periodEnd,
         trialEndsAt,
         cancelledAt: null,
         pausedAt: null,
      });
   }

   // === getters ===

   get id(): SubscriptionId { return this.props.id; }
   get userId(): string { return this.props.userId; }
   get planId(): PlanId { return this.props.planId; }
   get status(): SubscriptionStatus { return this.props.status; }
   get startedAt(): Instant { return this.props.startedAt; }
   get currentPeriodStart(): Instant { return this.props.currentPeriodStart; }
   get currentPeriodEnd(): Instant { return this.props.currentPeriodEnd; }
   get trialEndsAt(): Instant | null { return this.props.trialEndsAt; }
   get cancelledAt(): Instant | null { return this.props.cancelledAt; }
   get pausedAt(): Instant | null { return this.props.pausedAt; }

   // === computed ===

   isInTrial(now: Instant): boolean {
      if (!this.props.trialEndsAt) return false;
      return this.props.status.isTrialing && now.isBefore(this.props.trialEndsAt);
   }

   isAccessGranted(): boolean {
      return this.props.status.hasAccess;
   }

   // === state transitions — all return new Subscription ===

   activate(): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("active"),
      });
   }

   cancel(at: Instant): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("cancelled"),
         cancelledAt: at,
      });
   }

   pause(at: Instant): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("paused"),
         pausedAt: at,
      });
   }

   resume(): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("active"),
         pausedAt: null,
      });
   }

   expire(): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("expired"),
      });
   }

   markPastDue(): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("past_due"),
      });
   }

   renew(at: Instant, newPeriodEnd: Instant): Subscription {
      return new Subscription({
         ...this.props,
         currentPeriodStart: at,
         currentPeriodEnd: newPeriodEnd,
         // re-activate if past_due on successful renewal
         status: this.props.status.isPastDue
            ? SubscriptionStatus.ACTIVE
            : this.props.status,
      });
   }

   toJSON() {
      return {
         id: this.props.id.toJSON(),
         userId: this.props.userId,
         planId: this.props.planId.toJSON(),
         status: this.props.status.toJSON(),
         startedAt: this.props.startedAt.toJSON(),
         currentPeriodStart: this.props.currentPeriodStart.toJSON(),
         currentPeriodEnd: this.props.currentPeriodEnd.toJSON(),
         trialEndsAt: this.props.trialEndsAt?.toJSON() ?? null,
         cancelledAt: this.props.cancelledAt?.toJSON() ?? null,
         pausedAt: this.props.pausedAt?.toJSON() ?? null,
      };
   }
}
