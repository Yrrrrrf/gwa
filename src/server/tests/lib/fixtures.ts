import { EngineClient } from "./clients/engine.ts";

export type CleanupFn = () => Promise<void>;

export function withCleanup() {
  const cleanups: CleanupFn[] = [];

  const register = (fn: CleanupFn) => {
    cleanups.push(fn);
  };

  const run = async () => {
    // Run in reverse order
    for (let i = cleanups.length - 1; i >= 0; i--) {
      try {
        await cleanups[i]();
      } catch (err: any) {
        console.error(`Cleanup failed: ${err.message}`);
      }
    }
  };

  return { register, run };
}

let cachedToken: string | null = null;

export async function getToken(apiClient: EngineClient) {
  if (cachedToken) return cachedToken;

  const loginGql = `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        token
      }
    }
  `;

  // Use alice from seed data
  const variables = {
    input: {
      email: "alice@demo.com",
      password: "password", // This is the default in seed data or .env
    },
  };

  try {
    const res = await apiClient.mutate(loginGql, variables);
    if (res.errors && !res.data?.login) {
      console.error("Login Result with Errors:", JSON.stringify(res, null, 2));
      throw new Error(`Login failed: ${JSON.stringify(res.errors)}`);
    }
    if (!res.data?.login) {
       console.error("Login Result (No data.login):", JSON.stringify(res, null, 2));
       throw new Error("Login failed: no data.login in response");
    }
    cachedToken = res.data.login.token;
    console.log(`[DEBUG] Got token from engine: ${cachedToken.slice(0, 10)}...${cachedToken.slice(-10)}`);
    return cachedToken!;
  } catch (err: any) {
    console.warn(`Could not get JWT token: ${err.message}. Using mock-token.`);
    return "mock-token";
  }
}
