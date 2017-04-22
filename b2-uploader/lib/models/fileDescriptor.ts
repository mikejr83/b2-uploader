export interface FileDescriptor {
  fieldId: string;
  fileName: string;
  contentLength?: number;
  contentType?: string;
  contentSha1: string;
}