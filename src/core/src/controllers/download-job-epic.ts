import { Epic } from "redux-observable";
import { EMPTY, from, of } from "rxjs";
import {
  catchError,
  filter,
  finalize,
  map,
  mergeMap,
} from "rxjs/operators";
import { RootAction, RootState } from "../store/root-reducer";
import { jobsSlice } from "../store/slices";
import { Dependencies } from "../services";
import {
  createBucketFactory,
  decryptSingleFragmentFactory,
  downloadSingleFactory,
  writeToBucketFactory,
} from "../use-cases";

export const downloadJobEpic: Epic<
  RootAction,
  RootAction,
  RootState,
  Dependencies
> = (action$, store$, { fs, loader, decryptor, canceller }) =>
  action$.pipe(
    filter(jobsSlice.actions.download.match),
    map((action) => action.payload.jobId),
    mergeMap((jobId) => {
      const job = store$.value.jobs.jobs[jobId];
      if (!job) {
        return EMPTY;
      }
      let controller = new AbortController();
      const existingSignal = canceller.signal(jobId);
      if (existingSignal?.aborted) {
        return of(
          jobsSlice.actions.downloadFailed({
            jobId,
            message: "Download cancelled",
          })
        );
      }
      if (existingSignal) {
        const onAbort = () => controller.abort();
        existingSignal.addEventListener("abort", onAbort, { once: true });
      }
      const signal = controller.signal;

      const { videoFragments, audioFragments } = job;
      const fragments = videoFragments.concat(
        audioFragments.map((fragment) => ({
          ...fragment,
          index: fragment.index + videoFragments.length,
        }))
      );
      const container = job.filename?.endsWith(".mkv") ? "mkv" : "mp4";
      return from(
        createBucketFactory(fs)(
          jobId,
          videoFragments.length,
          audioFragments.length,
          container
        ).then(() => ({
          fragments,
          jobId,
        }))
      ).pipe(
        mergeMap(({ fragments, jobId }) => {
          if (signal.aborted) {
            return of(
              jobsSlice.actions.downloadFailed({
                jobId,
                message: "Download cancelled",
              })
            );
          }

          const download$ = from(fragments).pipe(
            mergeMap(
              (fragment) =>
                from(
                  downloadSingleFactory(loader)(
                    fragment,
                    store$.value.config.fetchAttempts,
                    signal
                  ).then((data) => ({
                    fragment,
                    data,
                    jobId,
                  }))
                ),
              store$.value.config.concurrency
            ),
            mergeMap(({ data, fragment, jobId }) =>
              decryptSingleFragmentFactory(loader, decryptor)(
                fragment.key,
                data,
                store$.value.config.fetchAttempts,
                signal
              ).then((data) => ({
                fragment,
                data,
                jobId,
              }))
            ),
            mergeMap(({ data, jobId, fragment }) =>
              writeToBucketFactory(fs)(jobId, fragment.index, data).then(() => ({
                jobId,
              }))
            ),
            mergeMap(({ jobId }) =>
              of(
                jobsSlice.actions.incDownloadStatus({
                  jobId,
                })
              )
            ),
            catchError((error: unknown) => {
              const isCancelled =
                signal.aborted ||
                (error instanceof DOMException &&
                  error.name === "AbortError");
              return of(
                jobsSlice.actions.downloadFailed({
                  jobId,
                  message: isCancelled
                    ? "Download cancelled"
                    : (error as Error)?.message ||
                      "Download failed during fragment processing",
                })
              );
            })
          );

          return download$;
        }),
        catchError((error: unknown) => {
          const isCancelled =
            signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError");
          return of(
            jobsSlice.actions.downloadFailed({
              jobId,
              message: isCancelled
                ? "Download cancelled"
                : (error as Error)?.message || "Failed to prepare download",
            })
          );
        }),
        finalize(() => {
          canceller.cleanup(jobId);
        })
      );
    })
  );
