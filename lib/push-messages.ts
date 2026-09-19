import { formatRupees } from "./money";

/**
 * What a notification says, kept free of network code so it can be tested
 * directly. `lib/push.ts` does the sending.
 */

export type PushPayload = { title: string; body: string; url: string };

export type PushEvent =
  | { kind: "member-added"; memberName: string }
  | { kind: "member-deleted"; memberName: string }
  | {
      kind: "transaction";
      type: "DEPOSIT" | "WITHDRAWAL";
      memberName: string;
      amount: number;
    }
  | {
      kind: "transaction-deleted";
      memberName: string;
      amount: number;
    };

export function buildPushPayload(event: PushEvent): PushPayload {
  switch (event.kind) {
    case "member-added":
      return {
        title: "FriendlyFund",
        body: `${event.memberName} was added as a member`,
        url: "/members",
      };

    case "member-deleted":
      return {
        title: "FriendlyFund",
        body: `${event.memberName} was removed`,
        url: "/members",
      };

    case "transaction":
      return {
        title: "FriendlyFund",
        body: `${event.memberName} ${
          event.type === "DEPOSIT" ? "deposited" : "withdrew"
        } ${formatRupees(event.amount)}`,
        url: "/",
      };

    case "transaction-deleted":
      return {
        title: "FriendlyFund",
        body: `An entry of ${formatRupees(event.amount)} for ${event.memberName} was deleted`,
        url: "/",
      };
  }
}

/** 404 and 410 mean the device is gone for good; anything else may be transient. */
export function shouldDropSubscription(status: number): boolean {
  return status === 404 || status === 410;
}
