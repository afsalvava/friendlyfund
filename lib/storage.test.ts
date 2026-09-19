import { describe, expect, it } from "vitest";
import { contentTypeFor, isSafeUploadName } from "./storage";

/**
 * The uploads route takes a filename straight from the URL, so anything that
 * escapes the upload directory has to be rejected before it reaches the disk.
 */
describe("isSafeUploadName", () => {
  it("accepts the names savePhoto generates", () => {
    expect(isSafeUploadName("d1fd3405-9c78-408a-b730-490a46810544.jpg")).toBe(true);
    expect(isSafeUploadName("d1fd3405-9c78-408a-b730-490a46810544.png")).toBe(true);
    expect(isSafeUploadName("d1fd3405-9c78-408a-b730-490a46810544.webp")).toBe(true);
    expect(isSafeUploadName("d1fd3405-9c78-408a-b730-490a46810544.gif")).toBe(true);
  });

  it("rejects traversal attempts", () => {
    expect(isSafeUploadName("../../etc/passwd")).toBe(false);
    expect(isSafeUploadName("../.env")).toBe(false);
    expect(isSafeUploadName("/etc/passwd")).toBe(false);
    expect(isSafeUploadName("a/b.jpg")).toBe(false);
  });

  it("rejects anything that is not one of the allowed image names", () => {
    expect(isSafeUploadName("script.js")).toBe(false);
    expect(isSafeUploadName("photo.jpg.js")).toBe(false);
    expect(isSafeUploadName("")).toBe(false);
    expect(isSafeUploadName("notauuid.jpg")).toBe(false);
  });
});

describe("contentTypeFor", () => {
  it("maps each stored extension back to its type", () => {
    expect(contentTypeFor("x.jpg")).toBe("image/jpeg");
    expect(contentTypeFor("x.png")).toBe("image/png");
    expect(contentTypeFor("x.webp")).toBe("image/webp");
    expect(contentTypeFor("x.gif")).toBe("image/gif");
  });

  it("falls back to a safe generic type", () => {
    expect(contentTypeFor("x.unknown")).toBe("application/octet-stream");
  });
});
