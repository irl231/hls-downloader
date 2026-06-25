export interface JobCanceller {
  signal(jobId: string): AbortSignal | undefined;
  cancel(jobId: string): void;
  cleanup(jobId: string): void;
}

export function createJobCanceller(): JobCanceller {
  const controllers = new Map<string, AbortController>();

  return {
    signal(jobId: string) {
      return controllers.get(jobId)?.signal;
    },
    cancel(jobId: string) {
      let controller = controllers.get(jobId);
      if (!controller) {
        controller = new AbortController();
        controllers.set(jobId, controller);
      }
      controller.abort();
    },
    cleanup(jobId: string) {
      const controller = controllers.get(jobId);
      if (controller?.signal.aborted) {
        controllers.delete(jobId);
      }
    },
  };
}
