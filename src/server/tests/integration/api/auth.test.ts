import { withApiEnv } from "../../fixtures/api_env.ts";
import { assertOk, assertError } from "../../lib/assert.ts";
import { assertExists } from "@std/assert";

Deno.test("🦀 API Authentication", async (t) => {
  await withApiEnv("Auth Flow", async ({ api }) => {
    
    await t.step("A1: Successful login", async () => {
      const loginGql = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user { id email role }
          }
        }
      `;
      const variables = {
        input: { email: "alice@demo.com", password: "password" }
      };
      
      const res = await api.mutate(loginGql, variables);
      assertExists(res.data.login.token);
      assertOk("Login successful", res);
    });

    await t.step("A2: Bad credentials rejected", async () => {
      const loginGql = `
        mutation Login($input: LoginInput!) {
          login(input: $input) { token }
        }
      `;
      const variables = {
        input: { email: "alice@demo.com", password: "wrong" }
      };
      
      const res = await api.mutate(loginGql, variables);
      assertError("Bad password rejected", res);
    });

  });
});
