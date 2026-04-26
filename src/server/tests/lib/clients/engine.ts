import { ClientError, GraphQLClient } from "graphql-request";

export interface EngineClient {
  query: <T = unknown>(
    gql: string,
    variables?: Record<string, unknown>,
  ) => Promise<T>;
  mutate: <T = unknown>(
    gql: string,
    variables?: Record<string, unknown>,
  ) => Promise<T>;
  setToken: (token: string) => void;
}

export interface EngineConfig {
  baseUrl: string;
  token?: string;
}

export function createEngineClient(config: EngineConfig): EngineClient {
  const { baseUrl, token } = config;
  const client = new GraphQLClient(baseUrl);

  if (token) {
    client.setHeader("Authorization", `Bearer ${token}`);
  }

  return {
    async query<T = unknown>(gql: string, variables?: Record<string, unknown>) {
      try {
        const data = await client.request<any>(gql, variables);
        return { data } as T;
      } catch (err: any) {
        if (err instanceof ClientError) {
          return { data: err.response.data, errors: err.response.errors } as T;
        }
        throw err;
      }
    },
    async mutate<T = unknown>(
      gql: string,
      variables?: Record<string, unknown>,
    ) {
      try {
        const data = await client.request<any>(gql, variables);
        return { data } as T;
      } catch (err: any) {
        if (err instanceof ClientError) {
          return { data: err.response.data, errors: err.response.errors } as T;
        }
        throw err;
      }
    },
    setToken(token: string) {
      client.setHeader("Authorization", `Bearer ${token}`);
    },
  };
}
