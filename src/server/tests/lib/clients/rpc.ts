import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { ServiceType } from "@bufbuild/protobuf";

export interface RpcClient {
  getService: <T extends ServiceType>(service: T) => PromiseClient<T>;
}

export interface RpcConfig {
  baseUrl: string;
  token?: string;
}

export function createRpcClient(config: RpcConfig): RpcClient {
  const { baseUrl, token } = config;

  const transport = createConnectTransport({
    baseUrl,
    httpVersion: "1.1",
    interceptors: [
      (next) => async (req) => {
        if (token) {
          req.header.set("Authorization", `Bearer ${token}`);
        }
        return next(req);
      },
    ],
  });

  return {
    getService<T extends ServiceType>(service: T) {
      return createPromiseClient(service, transport);
    },
  };
}
