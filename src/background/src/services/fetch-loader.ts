type FetchFn<Data> = (signal?: AbortSignal) => Promise<Data>;

const REQUEST_TIMEOUT_MS = 60_000;

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
  }
}

function isHttpError(error: unknown): error is HttpError {
  return typeof (error as any)?.status === "number";
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  return (
    typeof error === "object" &&
    error !== null &&
    (error as any).name === "AbortError"
  );
}

async function fetchWithRetry<Data>(
  fetchFn: FetchFn<Data>,
  attempts: number = 1,
  options?: { signal?: AbortSignal; timeout?: number }
): Promise<Data> {
  if (attempts < 1) {
    throw new Error("Attempts less then 1");
  }
  const externalSignal = options?.signal;
  if (externalSignal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
  const timeout = options?.timeout ?? REQUEST_TIMEOUT_MS;
  let countdown = attempts;
  let retryTime = 100;
  let lastError: unknown;
  while (countdown--) {
    if (externalSignal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    const attemptController = new AbortController();
    const onExternalAbort = () => attemptController.abort();
    externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeout > 0) {
      timeoutId = setTimeout(() => attemptController.abort(), timeout);
    }
    try {
      const result = await fetchFn(attemptController.signal);
      return result;
    } catch (e) {
      lastError = e;
      if (isHttpError(e) || isAbortError(e)) {
        if (isAbortError(e) && !externalSignal?.aborted && countdown > 0) {
          lastError = new Error(
            `Request timed out after ${timeout}ms`
          );
          if (countdown > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryTime));
            retryTime *= 1.15;
          }
          continue;
        }
        throw e;
      }
      if (countdown > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryTime));
        retryTime *= 1.15;
      }
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Fetch error");
}

export async function fetchText(
  url: string,
  attempts: number = 1,
  options?: { signal?: AbortSignal; timeout?: number }
) {
  const fetchFn: FetchFn<string> = (signal?) =>
    fetch(url, { signal }).then((res) => {
      if (!res.ok) {
        throw new HttpError(res.status);
      }
      return res.text();
    });
  return fetchWithRetry(fetchFn, attempts, options);
}

export async function fetchArrayBuffer(
  url: string,
  attempts: number = 1,
  byteRange?: { offset: number; length: number } | null,
  options?: { signal?: AbortSignal; timeout?: number }
) {
  const fetchFn: FetchFn<ArrayBuffer> = (signal?) => {
    const request = byteRange
      ? fetch(url, {
          signal,
          headers: {
            Range: `bytes=${byteRange.offset}-${
              byteRange.offset + byteRange.length - 1
            }`,
          },
        })
      : fetch(url, { signal });
    return request.then(async (res) => {
      if (!res.ok) {
        throw new HttpError(res.status);
      }
      const buffer = await res.arrayBuffer();
      if (
        byteRange &&
        res.status !== 206 &&
        buffer.byteLength !== byteRange.length
      ) {
        return buffer.slice(
          byteRange.offset,
          byteRange.offset + byteRange.length
        );
      }
      return buffer;
    });
  };
  return fetchWithRetry(fetchFn, attempts, options);
}
export const FetchLoader = {
  fetchText,
  fetchArrayBuffer,
};
