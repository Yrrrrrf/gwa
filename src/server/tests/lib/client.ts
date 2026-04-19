export interface ClientConfig {
  baseUrl: string;
  token?: string;
  user?: string;
  pass?: string;
  ns?: string;
  db?: string;
}

export function createSurrealClient(config: ClientConfig) {
  const { baseUrl, user, pass, ns, db } = config;
  const auth = btoa(`${user}:${pass}`);
  const headers = {
    "Authorization": `Basic ${auth}`,
    "surreal-ns": ns || "template",
    "surreal-db": db || "main",
  };

  return {
    async query(sql: string, variables?: any) {
      const fullQuery = variables 
        ? `LET $vars = ${JSON.stringify(variables)}; ${sql}` 
        : sql;

      const response = await fetch(`${baseUrl}/sql`, {
        method: "POST",
        headers,
        body: fullQuery,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`DB Error: ${response.status} ${response.statusText} - ${text}`);
      }

      try {
        return JSON.parse(text);
      } catch (_e) {
        return text;
      }
    }
  };
}

export function createApiClient(config: ClientConfig) {
  const { baseUrl, token } = config;

  return {
    async query(gql: string, variables: Record<string, any> = {}) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let retries = 3;
      let lastError;

      while (retries > 0) {
        try {
          const response = await fetch(baseUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ query: gql, variables }),
          });

          const text = await response.text();
          if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
          }

          const json = JSON.parse(text);
          if (json.errors) {
            console.error(`GQL Errors: ${JSON.stringify(json.errors)}`);
          }
          if (json.errors && json.errors[0]?.message?.includes("Database error")) {
            throw new Error(`Retryable DB Error: ${json.errors[0].message}`);
          }

          return json;
        } catch (e: any) {
          lastError = e;
          if (e.message?.includes("Retryable")) {
            retries--;
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          throw e;
        }
      }
      throw lastError;
    },

    async mutate(gql: string, variables: Record<string, any> = {}) {
      return this.query(gql, variables);
    },
  };
}

// RPC client using grpcurl for native gRPC calls
export function createRpcClient(config: ClientConfig) {
  const { baseUrl } = config;
  const addr = baseUrl.replace(/^https?:\/\//, "");

  return {
    async call(service: string, method: string, data: any, headers?: Record<string, string>) {
      const args = [
        "-plaintext",
        "-d", JSON.stringify(data),
      ];

      if (headers) {
        for (const [key, value] of Object.entries(headers)) {
          args.push("-H", `${key}: ${value}`);
        }
      }

      args.push(addr, `${service}/${method}`);

      let command = new Deno.Command("grpcurl", { args });
      let process;
      try {
        process = await command.output();
      } catch (_e) {
        command = new Deno.Command("nix", {
          args: ["shell", "nixpkgs#grpcurl", "--command", "grpcurl", ...args]
        });
        process = await command.output();
      }

      const { code, stdout, stderr } = process;
      const output = new TextDecoder().decode(stdout);
      const error = new TextDecoder().decode(stderr);

      if (code !== 0) {
        throw new Error(`RPC Error (grpcurl): ${error}`);
      }

      try {
        return JSON.parse(output);
      } catch (_e) {
        return output;
      }
    }
  };
}
