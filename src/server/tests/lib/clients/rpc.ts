import { createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";

export interface RpcClient {
  // deno-lint-ignore no-explicit-any
  getService: (service: any) => any;
}

export interface RpcConfig {
  baseUrl: string;
  token?: string;
}

export function createRpcClient(config: RpcConfig): RpcClient {
  const { baseUrl, token } = config;

  const transport = createGrpcTransport({
    baseUrl,
    interceptors: [
      (next) => (req) => {
        if (token) {
          req.header.set("Authorization", `Bearer ${token}`);
        }
        return next(req);
      },
    ],
  });

  return {
    getService(service: any) {
      return createClient(service, transport);
    },
  };
}
