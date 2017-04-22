import { FileDescriptor } from '../fileDescriptor';

export interface BlazeFileInfo extends FileDescriptor {
  fileInfo: any;
  action: string;
  uploadTimestamp: number;
}