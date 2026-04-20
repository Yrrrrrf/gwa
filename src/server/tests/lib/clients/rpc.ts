import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
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

  const transport = createGrpcTransport({
    baseUrl,
    httpVersion: "2",
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
