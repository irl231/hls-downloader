import { IFS } from "../services";

export const createBucketFactory = (fs: IFS) => {
  const run = async (
    bucketID: string,
    videoLength: number,
    audioLength: number,
    container?: string
  ): Promise<void> => {
    await fs.createBucket(bucketID, videoLength, audioLength, container);
  };
  return run;
};
