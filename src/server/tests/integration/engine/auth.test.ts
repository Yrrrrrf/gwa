import { describe, expect, it } from "vite-plus/test";
import { withApiEnv } from "../../fixtures/api_env.ts";
import { expectError, expectOk } from "../../lib/assert-db.ts";

describe("🦀 API Authentication", () => {
  it("logs in successfully with valid credentials", async () => {
    await withApiEnv("A1: Successful login", async ({ api }) => {
      const loginGql = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user { id email role }
          }
        }
      `;
      const variables = {
        input: { email: "alice@demo.com", password: "password" },
      };

      const res = await api.mutate(loginGql, variables);
      expect(res.data.login.token).toBeDefined();
      expectOk(res);
    });
  });

  it("rejects bad credentials", async () => {
    await withApiEnv("A2: Bad credentials rejected", async ({ api }) => {
      const loginGql = `
        mutation Login($input: LoginInput!) {
          login(input: $input) { token }
        }
      `;
      const variables = {
        input: { email: "alice@demo.com", password: "wrong" },
      };

      const res = await api.mutate(loginGql, variables);
      expectError(res);
    });
  });
});
