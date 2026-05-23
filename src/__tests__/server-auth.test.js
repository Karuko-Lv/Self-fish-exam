import { describe, expect, it } from "vitest";
import {
  createPasswordHash,
  getUserStateFile,
  safeUserId,
  verifyPassword,
} from "../../server.js";

describe("server auth helpers", () => {
  it("hashes and verifies a password without storing plaintext", () => {
    const hash = createPasswordHash("secret-study");

    expect(hash).not.toContain("secret-study");
    expect(verifyPassword("secret-study", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects unsafe user ids", () => {
    expect(() => safeUserId("../bad")).toThrow("Invalid user id");
    expect(safeUserId("fish_01")).toBe("fish_01");
  });

  it("stores each user in a separate state file", () => {
    expect(getUserStateFile("/app/data", "fish")).toBe("/app/data/users/fish/state.json");
    expect(getUserStateFile("/app/data", "kitty")).toBe("/app/data/users/kitty/state.json");
  });
});
