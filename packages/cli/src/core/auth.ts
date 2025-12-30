import type { AuthConfig } from "./types";

export function parseAuth(authString: string): AuthConfig {
  const colonIndex = authString.indexOf(":");
  if (colonIndex === -1) {
    throw new Error('Invalid auth format. Use "basic:user:pass" or "bearer:token"');
  }

  const type = authString.slice(0, colonIndex).toLowerCase();
  const rest = authString.slice(colonIndex + 1);

  if (type === "basic") {
    const secondColon = rest.indexOf(":");
    if (secondColon === -1) {
      throw new Error('Basic auth requires "basic:username:password" format');
    }
    return {
      type: "basic",
      username: rest.slice(0, secondColon),
      password: rest.slice(secondColon + 1),
    };
  }

  if (type === "bearer") {
    return {
      type: "bearer",
      token: rest,
    };
  }

  throw new Error(`Unknown auth type: "${type}". Use "basic" or "bearer"`);
}

export function applyAuth(headers: Record<string, string>, auth: AuthConfig): void {
  if (auth.type === "basic") {
    const credentials = btoa(`${auth.username}:${auth.password}`);
    headers["Authorization"] = `Basic ${credentials}`;
  } else if (auth.type === "bearer") {
    headers["Authorization"] = `Bearer ${auth.token}`;
  }
}
