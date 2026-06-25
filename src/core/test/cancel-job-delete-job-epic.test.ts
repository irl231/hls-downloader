import { describe, it, expect } from "vitest";
import { of, firstValueFrom } from "rxjs";
import { cancelJobdeleteJobEpic } from "../src/controllers/cancel-job-delete-job-epic.ts";
import { jobsSlice } from "../src/store/slices/index.ts";
import { createMockCanceller } from "./test-utils.ts";

describe("cancelJobdeleteJobEpic", () => {
  it("dispatches downloadFailed when job is actively downloading", async () => {
    const canceller = createMockCanceller();
    const state = {
      jobs: {
        jobs: { "1": {} },
        jobsStatus: {
          "1": { status: "downloading", total: 10, done: 3 },
        },
      },
    };
    const action$ = of(jobsSlice.actions.cancel({ jobId: "1" }));
    const result = await firstValueFrom(
      cancelJobdeleteJobEpic(action$, { value: state } as any, { canceller } as any)
    );
    expect(canceller.cancel).toHaveBeenCalledWith("1");
    expect(result).toEqual(
      jobsSlice.actions.downloadFailed({
        jobId: "1",
        message: "Download cancelled",
      })
    );
  });

  it("dispatches downloadFailed when job is queued", async () => {
    const canceller = createMockCanceller();
    const state = {
      jobs: {
        jobs: { "1": {} },
        jobsStatus: {
          "1": { status: "queued", total: 10, done: 0 },
        },
      },
    };
    const action$ = of(jobsSlice.actions.cancel({ jobId: "1" }));
    const result = await firstValueFrom(
      cancelJobdeleteJobEpic(action$, { value: state } as any, { canceller } as any)
    );
    expect(canceller.cancel).toHaveBeenCalledWith("1");
    expect(result).toEqual(
      jobsSlice.actions.downloadFailed({
        jobId: "1",
        message: "Download cancelled",
      })
    );
  });

  it("dispatches delete when job is in error state", async () => {
    const canceller = createMockCanceller();
    const state = {
      jobs: {
        jobs: { "1": {} },
        jobsStatus: {
          "1": { status: "error", total: 10, done: 3 },
        },
      },
    };
    const action$ = of(jobsSlice.actions.cancel({ jobId: "1" }));
    const result = await firstValueFrom(
      cancelJobdeleteJobEpic(action$, { value: state } as any, { canceller } as any)
    );
    expect(canceller.cancel).not.toHaveBeenCalled();
    expect(result).toEqual(jobsSlice.actions.delete({ jobId: "1" }));
  });
});
