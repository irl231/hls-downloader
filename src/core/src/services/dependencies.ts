import { IDecryptor, IFS, ILoader, IParser, JobCanceller } from ".";

export type Dependencies = {
  loader: ILoader;
  decryptor: IDecryptor;
  parser: IParser;
  fs: IFS;
  canceller: JobCanceller;
};
