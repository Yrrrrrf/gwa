import { expect } from "vite-plus/test";

export function expectOk(response: any) {
  if (!response) return;

  if (Array.isArray(response)) {
    for (const res of response) {
      if (res?.status === "ERR") {
        throw new Error(`DB Error: ${res.result || res.message}`);
      }
    }
  } else if (response?.errors) {
    throw new Error(`API Error: ${JSON.stringify(response.errors)}`);
  } else if (response?.status === "ERR") {
    throw new Error(`DB Error: ${response.result || response.message}`);
  }
}

export function expectError(response: any) {
  let hasError = false;
  
  if (Array.isArray(response)) {
    hasError = response.some((res) => res?.status === "ERR");

    if (!hasError && response.length > 0) {
      const res = response[0];
      // In SDK 2.x, some "not found" or "invalid" might not return ERR status but empty results
      if (
        res?.status === "OK" &&
        (!res.result ||
          (Array.isArray(res.result) && res.result.length === 0))
      ) {
        hasError = true;
      }
    }
  } else if (response?.errors) {
    hasError = true;
  } else if (response?.status === "ERR") {
    hasError = true;
  }

  expect(hasError, "Expected error but got success").toBe(true);
}
