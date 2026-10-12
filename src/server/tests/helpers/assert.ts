export function assert(value: unknown, message = "assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
export function equal(actual: unknown, expected: unknown) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
  );
}
export async function rejects(run: () => Promise<unknown>) {
  let failed = false;
  try {
    await run();
  } catch {
    failed = true;
  }
  assert(failed, "expected rejection");
}
