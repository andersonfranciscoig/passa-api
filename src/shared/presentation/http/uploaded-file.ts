import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const SingleFileUpload = (maxBytes = 5_242_880) =>
  FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 4 },
  });

export function toIncoming(file?: UploadedFileData) {
  if (!file) return undefined;
  const name = Buffer.from(file.originalname, "latin1").toString("utf8");
  return { name, data: new Uint8Array(file.buffer) };
}
