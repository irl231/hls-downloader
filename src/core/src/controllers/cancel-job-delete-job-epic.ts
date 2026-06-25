import { Epic } from "redux-observable";
import { of, EMPTY } from "rxjs";
import { filter, mergeMap } from "rxjs/operators";
import { RootAction, RootState } from "../store/root-reducer";
import { jobsSlice } from "../store/slices";
import { Dependencies } from "../services";

export const cancelJobdeleteJobEpic: Epic<
  RootAction,
  RootAction,
  RootState,
  Dependencies
> = (action$, store$, { canceller }) =>
  action$.pipe(
    filter(jobsSlice.actions.cancel.match),
    mergeMap(({ payload: { jobId } }) => {
      const status = store$.value.jobs.jobsStatus[jobId]?.status;
      if (status === "downloading" || status === "queued") {
        canceller.cancel(jobId);
        return of(
          jobsSlice.actions.downloadFailed({
            jobId,
            message: "Download cancelled",
          })
        );
      }
      return of(jobsSlice.actions.delete({ jobId }));
    })
  );
