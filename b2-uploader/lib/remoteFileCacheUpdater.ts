import * as _ from 'lodash';

import { Logger } from './utilities/logger';

import { Blaze } from './utilities/blaze';
import { Database } from './utilities/db';

import { BlazeFileInfo } from './models/blaze/fileInfo';

import { FileDescriptor } from './models/fileDescriptor';
import { FileInformation } from './models/fileInformation';

export async function updateRemoteFileInfo(remoteFileInfos: BlazeFileInfo[]): Promise<FileInformation[]> {
  const db: Database = new Database('test.db.json');

  await db.open();

  if (remoteFileInfos !== null && remoteFileInfos.length) {
    Logger.current.cli.info('Great news! All your remote file information was retrieved from backblaze.');
    Logger.current.cli.info('There are ' + remoteFileInfos.length + ' files stored remotely!');

    let promises: Promise<FileInformation>[] = [];

    _.forEach(remoteFileInfos, function (remoteFileInfo: BlazeFileInfo) {
      promises.push(db.updateFileInfo(remoteFileInfo as FileDescriptor));
    });

    let descriptors = await Promise.all(promises);

    return descriptors;
  } else {
    return [];
  }
}