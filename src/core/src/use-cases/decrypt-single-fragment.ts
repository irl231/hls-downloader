import { Key } from "../entities";
import { IDecryptor, ILoader } from "../services";
import { fetchWithFallback } from "../utils/fetch";

export const decryptSingleFragmentFactory = (
  loader: ILoader,
  decryptor: IDecryptor
) => {
  const run = async (
    key: Key,
    data: ArrayBuffer,
    fetchAttempts: number,
    signal?: AbortSignal
  ): Promise<ArrayBuffer> => {
    if (!key.uri || !key.iv) {
      return data;
    }
    const fetcher = (uri: string, attempts: number, sig?: AbortSignal) =>
      loader.fetchArrayBuffer(uri, attempts, undefined, { signal: sig });
    const { data: keyArrayBuffer } = await fetchWithFallback(
      key.uri,
      key.fallbackUri,
      fetchAttempts,
      fetcher,
      signal
    );
    const decryptedData = await decryptor.decrypt(data, keyArrayBuffer, key.iv);
    return decryptedData;
  };
  return run;
};
