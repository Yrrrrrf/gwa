// types.ts — Pure generic contracts for the CLI orchestration engine
// Zero domain dependencies: knows nothing of Svelte, Vite, or GWA

export interface BaseTarget {
  readonly name: string;
  readonly path?: string;
}

export interface ExecutionPlan<TTarget extends BaseTarget, TContext = unknown> {
  readonly engine: string;
  readonly cmd?: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly displayCmd?: string;
  readonly skip?: string;
  readonly badge?: string;
  readonly pre?: (target: TTarget, ctx: TContext) => Promise<void> | void;
}

export interface Evaluation<TResult = unknown> {
  readonly badge: string;
  readonly isErr: boolean;
  readonly errCount: number;
  readonly data?: TResult;
}

export interface TargetCategory<TTarget extends BaseTarget> {
  readonly name: string;
  readonly targets: readonly TTarget[];
}

export interface ProcessResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly combined: string;
  readonly exitCode: number;
  readonly elapsedMs: number;
}

export interface TaskState<
  TTarget extends BaseTarget,
  TResult = unknown,
  TContext = unknown,
> {
  readonly cat: string;
  readonly target: TTarget;
  readonly plan: ExecutionPlan<TTarget, TContext>;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  badge: string;
  durationStr: string;
  isErr: boolean;
  startMs?: number;
  elapsedMs?: number;
  output: string;
  evalData?: TResult;
}

export interface SuiteOptions<
  TTarget extends BaseTarget,
  TResult = unknown,
  TContext = unknown,
> {
  readonly title: string;
  readonly categories: readonly TargetCategory<TTarget>[];
  readonly resolver: (
    target: TTarget,
    ctx: TContext,
  ) =>
    | Promise<ExecutionPlan<TTarget, TContext>>
    | ExecutionPlan<TTarget, TContext>;
  readonly evaluator: (
    res: ProcessResult,
    target: TTarget,
    ctx: TContext,
  ) => Promise<Evaluation<TResult>> | Evaluation<TResult>;
  readonly isVerbose?: boolean;
  readonly isParallel?: boolean;
  readonly isBench?: boolean;
  readonly failFast?: boolean;
  readonly filter?: string;
  readonly cmdPreview?: string;
  readonly successMsg: string;
  readonly failMsg: (errCount: number) => string;
  readonly context?: TContext;
  readonly abortSignal?: AbortSignal;
}

export interface SuiteResult<
  TTarget extends BaseTarget,
  TResult = unknown,
  TContext = unknown,
> {
  readonly totalErrors: number;
  readonly totalElapsedMs: number;
  readonly success: boolean;
  readonly results: readonly TaskState<TTarget, TResult, TContext>[];
}
