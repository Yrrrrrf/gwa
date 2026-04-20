export class StackUnavailableError extends Error {
  constructor(
    public service: string,
    public url: string,
  ) {
    super(
      `${service} is not reachable at ${url}. Run 'just server run' to start the stack.`,
    );
    this.name = "StackUnavailableError";
  }
}
