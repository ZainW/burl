import { describe, test, expect } from "bun:test";
import { parseAuth, applyAuth } from "../../src/core/auth";

describe("parseAuth", () => {
  describe("basic auth", () => {
    test("parses basic auth with username and password", () => {
      const result = parseAuth("basic:username:password");
      expect(result).toEqual({
        type: "basic",
        username: "username",
        password: "password",
      });
    });

    test("handles password with colons", () => {
      const result = parseAuth("basic:user:pass:word:123");
      expect(result).toEqual({
        type: "basic",
        username: "user",
        password: "pass:word:123",
      });
    });

    test("handles empty password", () => {
      const result = parseAuth("basic:user:");
      expect(result).toEqual({
        type: "basic",
        username: "user",
        password: "",
      });
    });

    test("throws on missing password separator", () => {
      expect(() => parseAuth("basic:usernameonly")).toThrow();
    });
  });

  describe("bearer auth", () => {
    test("parses bearer token", () => {
      const result = parseAuth("bearer:mytoken123");
      expect(result).toEqual({
        type: "bearer",
        token: "mytoken123",
      });
    });

    test("handles token with colons", () => {
      const result = parseAuth("bearer:token:with:colons");
      expect(result).toEqual({
        type: "bearer",
        token: "token:with:colons",
      });
    });

    test("handles empty token", () => {
      const result = parseAuth("bearer:");
      expect(result).toEqual({
        type: "bearer",
        token: "",
      });
    });
  });

  test("is case insensitive for auth type", () => {
    expect(parseAuth("BASIC:user:pass").type).toBe("basic");
    expect(parseAuth("Basic:user:pass").type).toBe("basic");
    expect(parseAuth("BEARER:token").type).toBe("bearer");
    expect(parseAuth("Bearer:token").type).toBe("bearer");
  });

  test("throws on unknown auth type", () => {
    expect(() => parseAuth("digest:user:pass")).toThrow();
    expect(() => parseAuth("oauth:token")).toThrow();
  });

  test("throws on invalid format", () => {
    expect(() => parseAuth("nodelimiter")).toThrow();
    expect(() => parseAuth("")).toThrow();
  });
});

describe("applyAuth", () => {
  test("applies basic auth header", () => {
    const headers: Record<string, string> = {};
    applyAuth(headers, { type: "basic", username: "user", password: "pass" });

    expect(headers["Authorization"]).toBeDefined();
    expect(headers["Authorization"]).toStartWith("Basic ");

    const decoded = atob(headers["Authorization"].replace("Basic ", ""));
    expect(decoded).toBe("user:pass");
  });

  test("applies bearer auth header", () => {
    const headers: Record<string, string> = {};
    applyAuth(headers, { type: "bearer", token: "mytoken" });

    expect(headers["Authorization"]).toBe("Bearer mytoken");
  });

  test("overwrites existing Authorization header", () => {
    const headers: Record<string, string> = { Authorization: "Old value" };
    applyAuth(headers, { type: "bearer", token: "newtoken" });

    expect(headers["Authorization"]).toBe("Bearer newtoken");
  });
});
