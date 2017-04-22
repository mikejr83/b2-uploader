import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

import * as _ from 'lodash';
import * as glob from 'glob';

import Queue = require('promise-queue');

import { Logger } from './logger';
import { Database } from './db';
import { FileInformation } from '../models/fileInformation';

import { config } from './config';


export class DirectoryReader {
  rootDirectory: string;

  private filterBySha1: Map<string, FileInformation>;
  private filterByFilename: Map<string, FileInformation>;

  static async generateFileHash(file: string): Promise<FileInformation> {
    return new Promise<FileInformation>(function (resolve, reject) {
      try {
        fs.lstat(file, function (err, stats) {
          if (err) {
            Logger.current.file.warning('Having an issue hashing the file:', err, file);
            reject(err);
          } else if (!stats) {
            Logger.current.file.warning('Unable to get stats for:', file);
            reject();
          }

          var isFile = stats.isFile();

          if (!isFile) {
            Logger.current.file.debug('Not a file:', file);
            reject();
          } else {
            var input = fs.createReadStream(file),
              hash = crypto.createHash('sha1');

            Logger.current.file.debug('Hashing:', file);

            hash.setEncoding('hex');

            input.on('end', function () {
              hash.end();

              let hashVal = hash.read();
              let fileInfo = new FileInformation(file, hashVal.toString());

              Logger.current.file.debug('Got hash for ' + file, fileInfo.contentSha1);

              resolve(fileInfo);
            });

            input.on('error', function (err) {
              Logger.current.cli.error('Error ocurred hashing ' + file);
              Logger.current.file.error('Error hashing file: ' + file, err);

              reject(err);
            });

            input.pipe(hash);
          }
        });
      } catch (e) {
        Logger.current.cli.error('fs.lstat failed!?', e);
        reject(e);
      }
    });
  }

  constructor(rootDirectory: string) {
    this.rootDirectory = rootDirectory;

  }

  async findFiles(): Promise<string[]> {
    return new Promise<string[]>(function (resolve, reject) {
      console.log(path.join((this as DirectoryReader).rootDirectory, '**\\*').replace(/\\/gi, '\\'));
      glob(path.join((this as DirectoryReader).rootDirectory, '**/*').replace(/\\/gi, '/'), function (err, files) {
        if (err) {
          Logger.current.file.error('Cannot get a glob of files.', err);

          reject(err);
        } else {
          let filteredFiles = _.filter(files, function(file) {
            return (this as DirectoryReader).filterByFilename[file] === undefined;
          }.bind(this));

          resolve(filteredFiles);
        }
      }.bind(this));
    }.bind(this));
  }

  async loadAllFilesInfo(): Promise<Promise<FileInformation>[]> {
    let promises: Promise<FileInformation>[] = [];
    let queue = new Queue(10, Infinity);

    let files = await this.findFiles();

    _.forEach(files, file => {
      if (file.indexOf('Thumbs.db') >= 0 ||
        file.indexOf('Picasa.ini') >= 0) return;

      promises.push(queue.add(() => {
        return DirectoryReader.generateFileHash(file).then(f => {
          return f;
        }, e => {
          if (e === undefined) {
            // the error was because we're dealing with something that isn't a file. Don't make a deal about it.
          } else {

          }
        });
      }));
    });

    return promises;
  }

  applyRemoteFilesFilter(fileDescriptors: FileInformation[]): void {
    this.filterBySha1 = new Map<string, FileInformation>();
    this.filterByFilename = new Map<string, FileInformation>();

    var allPaths = _.forEach(fileDescriptors, function (descriptor) {
      this.filterBySha1.set(descriptor.contentSha1, descriptor);
      this.filterByFilename.set(descriptor.fileName, descriptor);
    }.bind(this));
  }
}

