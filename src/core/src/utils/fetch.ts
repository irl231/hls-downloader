type Fetcher<T> = (uri: string, attempts: number) => Promise<T>;

export async function fetchWithFallback<T>(
  primaryUri: string,
  fallbackUri: string | null | undefined,
  attempts: number,
  fetcher: Fetcher<T>,
  signal?: AbortSignal
): Promise<{ uri: string; data: T }> {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
  try {
    const data = await fetcher(primaryUri, attempts);
    return { uri: primaryUri, data };
  } catch (error) {
    if (
      fallbackUri &&
      fallbackUri !== primaryUri &&
      !(error instanceof DOMException && error.name === "AbortError")
    ) {
      const data = await fetcher(fallbackUri, attempts);
      return { uri: fallbackUri, data };
    }
    throw error;
  }
}
