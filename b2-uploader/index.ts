import fs = require('fs');
import path = require('path');

import mkdirp = require('mkdirp');
import moment = require('moment');


import { Logger } from './lib/utilities/logger';
import { Blaze } from './lib/utilities/blaze';
import { DirectoryReader } from './lib/utilities/directoryReader';

import { createFileList } from './lib/fileListCreator';
import { updateRemoteFileInfo } from './lib/remoteFileCacheUpdater';
import { ddd } from './lib/uploadFile';

import { FileDescriptor } from './lib/models/fileDescriptor';
import { FileInformation } from './lib/models/fileInformation';

import { config } from './lib/utilities/config';

class Startup {
  public static main(): number {
    Logger.current.cli.info('Welcome to the backblaze b2 uploader!');
    Logger.current.cli.info('config', config);

    const normalizedPath = config.rootDirectory.replace(/\\/gi, '/');

    Startup.run()
      .catch(reason => {
        Logger.current.cli.error('Unrecoverable error. Shutting down...');
        process.exit(1);
        return;
      })
      .then(result => {
        console.log('hi');
        process.exit(0);
      });

    return 0;
  }

  private static async run(): Promise<void> {
    const blaze = new Blaze(config.accountId, config.applicationKey, config.bucketName);

    let remoteFileInfos = [];
    try {
      remoteFileInfos = await blaze.loadAllFileInfo();
    } catch (e) {
      process.exit(1);
      return;
    }

    let fileDescriptors = await updateRemoteFileInfo(remoteFileInfos);

    //Logger.current.cli.info('We found some files that should be uploaded. Going to check ' + filesToUpload.length + ' item(s).');

    let reader = new DirectoryReader(config.rootDirectory);

    reader.applyRemoteFilesFilter(fileDescriptors);

    let fileStats = await reader.loadAllFilesInfo();

    Promise.resolve();
  }
}

Startup.main();




//db.open().then(() => {
//  createFileList(db);
//})
//  .catch(error => {
//    Logger.current.cli.error('Error:', error);
//  });;

//new DirectoryReader(config.rootDirectory).findFiles().then(files => {
//  Logger.current.cli.info('There are:', files.length);
//});
