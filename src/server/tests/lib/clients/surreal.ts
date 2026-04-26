import { Surreal } from "surrealdb";

export interface SurrealClient {
  query: (
    sql: string,
    variables?: Record<string, unknown>,
  ) => Promise<unknown[]>;
  close: () => Promise<void>;
}

export interface SurrealConfig {
  baseUrl: string;
  user: string;
  pass: string;
  ns?: string;
  db?: string;
}

export function createSurrealClient(config: SurrealConfig): SurrealClient {
  const { baseUrl, user, pass, ns = "template", db = "main" } = config;
  const db_conn = new Surreal();

  const promise = (async () => {
    try {
      await db_conn.connect(`${baseUrl}/rpc`);
      await db_conn.signin({
        username: user,
        password: pass,
      });
      await db_conn.use({ namespace: ns, database: db });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`SurrealDB connection error: ${message}`);
    }
  })();

  function stringifyRecordIds(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "object") {
      // @ts-ignore: constructor name check for RecordId
      if (obj.constructor && obj.constructor.name === "RecordId") {
        return obj.toString();
      }
      if (Array.isArray(obj)) {
        return obj.map(stringifyRecordIds);
      }
      const newObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        newObj[key] = stringifyRecordIds(value);
      }
      return newObj;
    }
    return obj;
  }

  return {
    async query(sql: string, variables?: Record<string, unknown>) {
      await promise;
      try {
        const res = await db_conn.query(sql, variables);

        if (Array.isArray(res)) {
          return res.map((r: any) => {
            if (r && typeof r === "object" && "status" in r) {
              return {
                ...r,
                result: stringifyRecordIds(r.result),
              };
            }
            return { status: "OK", result: stringifyRecordIds(r) };
          });
        }
        return [{ status: "OK", result: stringifyRecordIds(res) }];
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err);
        return [
          {
            status: "ERR",
            result: message,
            message: message,
          },
        ];
      }
    },
    async close() {
      await db_conn.close();
    },
  };
}
