import { ValueObject } from "../value-object";

interface AccessDecisionProps {
  effect: "allow" | "deny";
  reason: string;
}

export class AccessDecision extends ValueObject<AccessDecisionProps> {
  constructor(props: AccessDecisionProps) {
    super(props);
  }

  static allow(reason: string): AccessDecision {
    return new AccessDecision({ effect: "allow", reason });
  }

  static deny(reason: string): AccessDecision {
    return new AccessDecision({ effect: "deny", reason });
  }

  get effect(): "allow" | "deny" { return this.props.effect; }
  get reason(): string { return this.props.reason; }

  isAllowed(): boolean { return this.props.effect === "allow"; }

  toString(): string { return `${this.props.effect}: ${this.props.reason}`; }

  toJSON() {
    return { effect: this.props.effect, reason: this.props.reason };
  }
}
