export enum BucketType {
  Public,
  Private
}

export interface BlazeBucketInfo {
  accountId: string;
  bucketId: string;
  bucketInfo: any;
  bucketName: string;
  bucketType: string;
  lifecycleRules: any;
  revision: number;
}