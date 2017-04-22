import { FileDescriptor } from './fileDescriptor';

export class FileInformation {
  fileName: string;
  contentSha1: string;
  remoteInformation: FileDescriptor
  localInformation: FileDescriptor

  constructor(fileName: string, contentSha1: string) {
    this.fileName = fileName;
    this.contentSha1 = contentSha1;
  }
}