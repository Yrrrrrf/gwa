import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertMatch,
  assertRejects,
} from "@std/assert";

let passCount = 0;
let failCount = 0;

export function assertOk(label: string, response: any) {
  try {
    // SurrealDB HTTP response is an array of results
    if (Array.isArray(response)) {
      // If we used USE NS/DB, the first two results are for those
      const actualResults = response.filter((res) => {
        // Skip USE statement results which look like { result: { database: '...', namespace: '...' } }
        // In SurrealDB 3, these can have null values
        if (
          res.result && typeof res.result === "object" &&
          ("database" in res.result || "namespace" in res.result)
        ) {
          return false;
        }
        return true;
      });

      for (const res of actualResults) {
        if (res.status === "ERR") {
          throw new Error(`DB Error: ${res.result || res.message}`);
        }
      }
    } else if (response?.errors) {
      throw new Error(`API Error: ${JSON.stringify(response.errors)}`);
    }

    passCount++;
    console.log(`  ✔  ${label}`);
  } catch (err: any) {
    failCount++;
    console.error(`  ❌ ${label}`);
    console.error(`     ${err.message}`);
    throw err;
  }
}

export function assertError(label: string, response: any) {
  try {
    let hasError = false;
    if (Array.isArray(response)) {
      const actualResults = response.filter((res) => {
        if (
          res.result && typeof res.result === "object" &&
          ("database" in res.result || "namespace" in res.result)
        ) {
          return false;
        }
        return true;
      });
      // In SCHEMAFULL mode, some failures (like ASSERT) might return OK with an empty result or no result
      // but usually they should return ERR. If we expect an error and get status OK but 0 results,
      // that might be a failure too in some contexts.
      hasError = actualResults.some((res) => res.status === "ERR");

      // If no explicit ERR, check if it was a create/update that produced nothing (assertion failure)
      if (!hasError && actualResults.length > 0) {
        const res = actualResults[0];
        if (
          res.status === "OK" &&
          (!res.result ||
            (Array.isArray(res.result) && res.result.length === 0))
        ) {
          hasError = true;
        }
      }
    } else if (response?.errors) {
      hasError = true;
    }

    if (!hasError) {
      console.log("Failed Index Response:", JSON.stringify(response));
      throw new Error(`Expected error but got success`);
    }

    passCount++;
    console.log(`  ✔  ${label} (failed as expected)`);
  } catch (err: any) {
    failCount++;
    console.error(`  ❌ ${label}`);
    console.error(`     ${err.message}`);
    throw err;
  }
}

export function resetCounts() {
  passCount = 0;
  failCount = 0;
}

export function printSummary() {
  const total = passCount + failCount;
  console.log("\n" + "═".repeat(54));
  console.log(
    `  Results: ${passCount}/${total} passed  |  ${failCount} failed`,
  );
  console.log("═".repeat(54) + "\n");
}
