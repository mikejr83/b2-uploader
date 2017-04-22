import * as path from 'path';

import * as _ from 'lodash';

import { Logger } from './utilities/logger';
import { Database } from './utilities/db';
import { Blaze } from './utilities/blaze';
import { DirectoryReader } from './utilities/directoryReader';
import { FileDescriptor } from './models/fileDescriptor';
import { FileInformation } from './models/fileInformation';

import { config } from './utilities/config';


export async function createFileList(currentFileDescriptors: FileInformation[]): Promise<string[]> {
  const db: Database = new Database('test.db.json');

  await db.open();

  let dr = new DirectoryReader(config.rootDirectory);

  function convertLocalFilenameToRemote(localFilename: string) {
    let relativePath = path.relative(config.rootDirectory, localFilename);

    return relativePath.replace(/\\/gi, path.posix.sep);
  }

  let filenames = await dr.findFiles();

  Logger.current.cli.info('There are ' + filenames.length + ' items to look at. Some of these may be folders but we care about those files!');

  var allPaths = _.chain(filenames)
    .map(convertLocalFilenameToRemote)
    .keyBy(function(filename) {
      return filename;
    })
    .value();

  let sha1Map = new Map<string, FileInformation>();
  let filenameMap = new Map<string, FileInformation>();


  let pathsToUpload = [];

  _.forEach(currentFileDescriptors, descriptor => {
    if ((/Thumbs\.db/gi).test(descriptor.fileName)) {
      return;
    }
    
    if(allPaths[descriptor.fileName]){
      delete allPaths[descriptor.fileName];
    }
    // sha1Map.set(descriptor.contentSha1, descriptor);
    // filenameMap.set(descriptor.fileName, descriptor);
  });



  //var currentFilesMap = _.keyBy(currentFileDescriptors, descriptor => {
  //  return descriptor.contentSha1;
  //});

  // _.forEach(allPaths, path => {
    

  //   if (filenameMap[path]) {
  //     sha1Map.delete(filenameMap.get(path).contentSha1);
  //     filenameMap.delete(path);
  //   }
  // });

  return Object.keys(allPaths);

  //Promise.all([dr.findFiles(), db.loadAllFiles()]).then(results => {
  //  let diskFiles: string[] = results[0];
  //  let dbFiles: FileDescriptor[] = results[1];

  //  let promises = [];

  //  _.forEach(dr.loadAllFilesInfo(diskFiles), promise => {
  //    promises.push(promise.then(fileInfo => {
  //      console.log(fileInfo);
  //    }, error => {
  //      console.log(error);
  //    }));
  //  });

  //  Promise.all(promises).then(result => {

  //  }).catch(e => {
  //    console.log('shit');
  //  });
  //})

  //return null;
}