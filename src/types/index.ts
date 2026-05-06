export interface User {
  username: string;
  token: string;
}

export interface FileMetadata {
  id: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  totalChunks: number;
  uploadDate: string;
}
