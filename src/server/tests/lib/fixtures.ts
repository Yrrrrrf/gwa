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

export async function getToken(apiClient: any) {
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
    if (res.errors) {
      throw new Error(`Login failed: ${JSON.stringify(res.errors)}`);
    }
    cachedToken = res.data.login.token;
    return cachedToken!;
  } catch (err: any) {
    console.warn(`Could not get JWT token: ${err.message}. Using mock-token.`);
    return "mock-token";
  }
}
