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
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
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

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    },

    async mutate(gql: string, variables: Record<string, any> = {}) {
      return this.query(gql, variables);
    }
  };
}

// Stub for RPC client
export function createRpcClient(config: ClientConfig) {
  return {
    async call(method: string, data: any) {
      console.warn("RPC Client not yet implemented");
      return { status: "STUB" };
    }
  };
}
