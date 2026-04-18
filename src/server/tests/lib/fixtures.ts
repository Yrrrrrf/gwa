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

export async function getToken(apiClient: any) {
  // TODO: Implement actual login mutation
  // For now, return a placeholder or use an environment variable
  return Deno.env.get("TEST_JWT_TOKEN") || "mock-token";
}
