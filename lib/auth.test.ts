import { describe, expect, it } from "vitest";
import { cookieSecure } from "./auth";

/**
 * The session cookie is dropped by browsers when it carries Secure but the page
 * was served over plain HTTP. Deployments that terminate on http:// must be able
 * to turn the flag off, or nobody can ever sign in.
 */
describe("cookieSecure", () => {
  it("is on in production by default", () => {
    expect(cookieSecure({ NODE_ENV: "production" })).toBe(true);
  });

  it("is off in development by default", () => {
    expect(cookieSecure({ NODE_ENV: "development" })).toBe(false);
  });

  it("can be forced off for a production site served over plain HTTP", () => {
    expect(cookieSecure({ NODE_ENV: "production", COOKIE_SECURE: "false" })).toBe(false);
    expect(cookieSecure({ NODE_ENV: "production", COOKIE_SECURE: "0" })).toBe(false);
  });

  it("can be forced on regardless of NODE_ENV", () => {
    expect(cookieSecure({ NODE_ENV: "development", COOKIE_SECURE: "true" })).toBe(true);
  });
});
