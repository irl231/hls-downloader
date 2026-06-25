import { Fragment } from "../entities";
import { ILoader } from "../services";
import { fetchWithFallback } from "../utils/fetch";

export const downloadSingleFactory = (loader: ILoader) => {
  const run = async (
    fragment: Fragment,
    fetchAttempts: number,
    signal?: AbortSignal
  ): Promise<ArrayBuffer> => {
    const fetcher = (uri: string, attempts: number) =>
      fragment.byteRange
        ? loader.fetchArrayBuffer(uri, attempts, fragment.byteRange, {
            signal,
          })
        : loader.fetchArrayBuffer(uri, attempts, undefined, { signal });
    const { data } = await fetchWithFallback(
      fragment.uri,
      fragment.fallbackUri,
      fetchAttempts,
      fetcher,
      signal
    );
    return data;
  };
  return run;
};
