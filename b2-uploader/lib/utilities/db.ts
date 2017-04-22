import Datastore = require('nedb3');

import { Logger } from './logger';
import { FileDescriptor } from '../models/fileDescriptor';
import { FileInformation } from '../models/fileInformation';

export interface LocalFileDescription extends FileDescriptor {

}

export class Database {
  db: Datastore;
  private dbOptions: any;

  constructor(filename: string) {
    this.db = null;
    this.dbOptions = {
      filename: filename,
      timestampData: true
    };
  }

  async open() {
    Logger.current.file.debug('Creating new data store.', this.dbOptions);

    return new Promise<Datastore>(function (resolve, reject) {
      this.db = new Datastore(this.dbOptions);

      this.db.loadDatabase(function (error) {
        if (error) {
          Logger.current.file.error('There was an error loading the database for caching file information.', error);
          Logger.current.cli.error('Caching info will not be available.');

          reject(error);
        } else {
          Logger.current.file.debug('DB opened and loaded.');
          resolve(this.db);
        }
      }.bind(this));
    }.bind(this));
  }

  async loadAllFiles(): Promise<FileDescriptor[]> {
    return new Promise<FileDescriptor[]>(function (resolve, reject) {
      (this as Database).db.find({
        contentType: { $regex: /image.*/ }
      }, function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    }.bind(this));
  }

  async findFileInfo(hash: string, remote?: boolean): Promise<FileInformation[]> {
    return new Promise<FileInformation[]>(function (resolve, reject) {
      (this as Database).db.find({
        contentSha1: hash
      }, function (err, fileInfos: FileInformation[]) {
        if (err) {
          reject(err);
        } else {
          resolve(fileInfos);
        }
      });
    }.bind(this));
  }

  async updateFileInfo(descriptor: FileDescriptor): Promise<FileInformation> {
    Logger.current.file.debug('Updating remote file info for:', descriptor.fileName);

    let dbDescriptors = await this.findFileInfo(descriptor.contentSha1);

    if (dbDescriptors && dbDescriptors.length > 0) {
      return Promise.resolve(dbDescriptors[0]);
    } else {
      return new Promise<FileInformation>(function (resolve, reject) {
        let fileInfo: FileInformation = new FileInformation(descriptor.fileName, descriptor.contentSha1);
        fileInfo.remoteInformation = descriptor;

        (this as Database).db.insert(fileInfo, function (err, newRecord: FileInformation) {
          if (err) {
            reject(err);
          } else {
            resolve(newRecord);
          }
        });
      }.bind(this));
    }
  }
}