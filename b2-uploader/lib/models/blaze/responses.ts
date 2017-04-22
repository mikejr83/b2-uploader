import { BlazeBucketInfo } from './bucketInfo';
import { BlazeFileInfo } from './fileInfo';

export interface BlazeResponse {
  code?: string
}

export interface ListBucketsData {
  buckets: Array<BlazeBucketInfo>;
}

export interface ListFileNamesData {
  files: Array<BlazeFileInfo>;
  nextFileName: string;
}

export interface ListFileNamesResponse extends BlazeResponse {
  data: ListFileNamesData;
}

export interface ListBucketsResponse extends BlazeResponse {
  data: ListBucketsData;
}

export interface CreateBucketResponse extends BlazeResponse {
  data: BlazeBucketInfo;
}