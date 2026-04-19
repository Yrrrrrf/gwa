export interface ClientConfig {
  baseUrl: string;
  token?: string;
  user?: string;
  pass?: string;
  ns?: string;
  db?: string;
}

export function createSurrealClient(config: ClientConfig) {
  const { baseUrl, user, pass, token, ns = "app", db = "main" } = config;
  
  return {
    async sql(query: string, vars: Record<string, any> = {}) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "ns": ns,
        "db": db,
        "surreal-ns": ns,
        "surreal-db": db,
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (user && pass) {
        headers["Authorization"] = `Basic ${btoa(`${user}:${pass}`)}`;
      }

      if (Object.keys(vars).length > 0) {
        headers["surreal-vars"] = JSON.stringify(vars);
      }

      // Explicitly select namespace and database at the start of every request for SurrealDB 3
      const fullQuery = `USE NS ${ns}; USE DB ${db}; ${query}`;

      const response = await fetch(`${baseUrl}/sql`, {
        method: "POST",
        headers,
        body: fullQuery,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP Error: ${response.status} ${response.statusText} - ${text}`);
      }

      const json = await response.json();
      return json;
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

      const response = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: gql, variables }),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText} - ${text}`);
      }

      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON: ${text}`);
      }
    },

    async mutate(gql: string, variables: Record<string, any> = {}) {
      return this.query(gql, variables);
    }
  };
}

// RPC client using grpcurl for native gRPC calls
export function createRpcClient(config: ClientConfig) {
  const { baseUrl } = config;
  // baseUrl is http://localhost:4000, grpcurl needs localhost:4000
  const addr = baseUrl.replace(/^https?:\/\//, "");

  return {
    async call(service: string, method: string, data: any, headers?: Record<string, string>) {
      // Try local grpcurl first, then fallback to nix shell
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
        // Fallback to nix shell if grpcurl not in path
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
