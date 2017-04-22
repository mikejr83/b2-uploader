import B2 = require('backblaze-b2');
import * as _ from 'lodash';
import * as http from 'http';

import { Logger } from './logger';

import { BlazeBucketInfo, BucketType } from '../models/blaze/bucketInfo';
import { BlazeFileInfo } from '../models/blaze/fileInfo';

import { ListBucketsResponse, ListFileNamesResponse, CreateBucketResponse } from '../models/blaze/responses';

export class Blaze {
  accountId: string;
  applicationKey: string;
  bucketName: string;

  private b2: B2;

  constructor(accountId: string, applicationKey: string, bucketName: string) {
    this.accountId = accountId;
    this.applicationKey = applicationKey;
    this.bucketName = bucketName;

    this.b2 = new B2({
      accountId: this.accountId,
      applicationKey: this.applicationKey
    });
  }

  authorize() {

  }

  async findBucket(): Promise<BlazeBucketInfo> {
    Logger.current.file.debug('Finding the bucket.', this.bucketName);

    //try {
    let b2 = await (this.b2.authorize() as Promise<any>).catch(reason => {
      Logger.current.cli.error('There was an error while attempting to connect to your b2 account...');
      Logger.current.file.error('Error returned when authorizing a connection.', reason);
      throw reason;
    });

    if (!b2) {
      return null;
    }

    let bucketResponse = await (this.b2.listBuckets() as Promise<ListBucketsResponse>);

    Logger.current.file.debug('Have buckets response.', bucketResponse.data);

    return _.find(bucketResponse.data.buckets, {
      'bucketName': this.bucketName
    });
  }

  async createBucket(): Promise<BlazeBucketInfo> {

    let createdBucketResponse = await (this.b2.createBucket(this.bucketName, 'allPrivate') as Promise<CreateBucketResponse>);

    return createdBucketResponse.data;
  }

  private async loadFileList(bucketId: string, lastFileInfo: any): Promise<Array<BlazeFileInfo>> {
    let filesResponse = await (this.b2.listFileNames({
      bucketId: bucketId,
      maxFileCount: 100,
      startFileName: lastFileInfo
    }) as Promise<ListFileNamesResponse>);

    if (filesResponse.code && filesResponse.code === 'bad_json') {
      throw 'Bad JSON';
    }

    if (filesResponse.data.files.length === 100) {
      Logger.current.cli.info('Still more files to find. Please wait!');

      return _.concat(await this.loadFileList(bucketId, filesResponse.data.nextFileName), filesResponse.data.files);
    } else {
      return filesResponse.data.files;
    }
  }

  async loadAllFileInfo(): Promise<Array<BlazeFileInfo>> {
    Logger.current.file.debug('Getting file info from b2.');

    let targetBucket = await this.findBucket();
    let bucketCreated = false;

    if (!targetBucket) {
      Logger.current.cli.warn('The bucket, ' + this.bucketName + ', was not available. We\'ll create it for you!');
      Logger.current.file.warn('The bucket didn\'t exist. Creating it', this.bucketName);

      targetBucket = await this.createBucket();
      bucketCreated = true;
    }

    if (!targetBucket) {
      Logger.current.cli.error('Tried creating that bucket, but still didn\'t get it back from B2. :(');
      Logger.current.file.error('Bucket wasn\'t returned after create!');

      throw new Error('Unable to get bucket.');
    } else if (bucketCreated) {
      Logger.current.cli.info('Bucket created successfully!');
    }

    let filesResponse = await (this.b2.listFileNames({
      bucketId: targetBucket.bucketId,
      maxFileCount: 100
    }) as Promise<ListFileNamesResponse>);

    if (filesResponse.data.files.length == 100) {
      Logger.current.cli.info('You have a lot of files! Let\'s look for some more.');

      let aggregateResponse = await this.loadFileList(targetBucket.bucketId, filesResponse.data.nextFileName);
      let files = _.concat(filesResponse.data.files, aggregateResponse);

      Logger.current.cli.info('Found files:', files.length);

      return files;
    } else {
      return filesResponse.data.files;
    }
  }
}