import { Surreal } from "surrealdb";

export interface SurrealClient {
  query: (sql: string, variables?: Record<string, any>) => Promise<any[]>;
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
      console.error(`SurrealDB connection error: ${err.message}`);
    }
  })();

  function stringifyRecordIds(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'object') {
      if (obj.constructor && obj.constructor.name === 'RecordId') {
        return obj.toString();
      }
      if (Array.isArray(obj)) {
        return obj.map(stringifyRecordIds);
      }
      const newObj: any = {};
      for (const key in obj) {
        newObj[key] = stringifyRecordIds(obj[key]);
      }
      return newObj;
    }
    return obj;
  }

  return {
    async query(sql: string, variables?: Record<string, any>) {
      await promise;
      try {
        const res = await db_conn.query(sql, variables);
        
        if (Array.isArray(res)) {
          return res.map(r => {
             if (r && typeof r === 'object' && 'status' in r) {
               return {
                 ...r,
                 result: stringifyRecordIds(r.result)
               };
             }
             return { status: "OK", result: stringifyRecordIds(r) };
          });
        }
        return [{ status: "OK", result: stringifyRecordIds(res) }];
      } catch (err: any) {
        return [{
          status: "ERR",
          result: err.message,
          message: err.message
        }];
      }
    },
    async close() {
      await db_conn.close();
    },
  };
}
