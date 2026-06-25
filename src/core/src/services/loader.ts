export interface ILoader {
  fetchText(
    url: string,
    attempts?: number,
    options?: { signal?: AbortSignal; timeout?: number }
  ): Promise<string>;
  fetchArrayBuffer(
    url: string,
    attempts?: number,
    byteRange?: { offset: number; length: number } | null,
    options?: { signal?: AbortSignal; timeout?: number }
  ): Promise<ArrayBuffer>;
}
