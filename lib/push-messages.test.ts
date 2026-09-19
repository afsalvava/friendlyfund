import { describe, expect, it } from "vitest";
import { buildPushPayload, shouldDropSubscription } from "./push-messages";

describe("buildPushPayload", () => {
  it("describes a deposit with member and amount", () => {
    expect(
      buildPushPayload({
        kind: "transaction",
        type: "DEPOSIT",
        memberName: "Naseeh",
        amount: 500,
      })
    ).toEqual({
      title: "FriendlyFund",
      body: "Naseeh deposited ₹500",
      url: "/",
    });
  });

  it("words a withdrawal differently", () => {
    expect(
      buildPushPayload({
        kind: "transaction",
        type: "WITHDRAWAL",
        memberName: "Siraj",
        amount: 2000,
      })
    ).toEqual({
      title: "FriendlyFund",
      body: "Siraj withdrew ₹2,000",
      url: "/",
    });
  });

  it("announces a new member", () => {
    expect(
      buildPushPayload({ kind: "member-added", memberName: "Fasil" })
    ).toEqual({
      title: "FriendlyFund",
      body: "Fasil was added as a member",
      url: "/members",
    });
  });

  it("announces a removed member", () => {
    expect(
      buildPushPayload({ kind: "member-deleted", memberName: "Fasil" })
    ).toEqual({
      title: "FriendlyFund",
      body: "Fasil was removed",
      url: "/members",
    });
  });

  it("announces a deleted entry", () => {
    expect(
      buildPushPayload({
        kind: "transaction-deleted",
        memberName: "Siraj",
        amount: 2000,
      })
    ).toEqual({
      title: "FriendlyFund",
      body: "An entry of ₹2,000 for Siraj was deleted",
      url: "/",
    });
  });
});

describe("shouldDropSubscription", () => {
  it("drops endpoints the push service says are gone", () => {
    expect(shouldDropSubscription(404)).toBe(true);
    expect(shouldDropSubscription(410)).toBe(true);
  });

  it("keeps everything else, which may be transient", () => {
    expect(shouldDropSubscription(429)).toBe(false);
    expect(shouldDropSubscription(500)).toBe(false);
    expect(shouldDropSubscription(201)).toBe(false);
  });
});
