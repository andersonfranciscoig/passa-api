import { FileStorage, type IncomingFile, type StoredFile } from "../../application/file-storage";

export class MemoryFileStorage extends FileStorage {
  readonly files = new Map<string, StoredFile>();

  async upload(file: IncomingFile, folder: string): Promise<StoredFile> {
    const key = `${folder.replace(/[^a-zA-Z0-9-]+/g, "_")}_${file.name}`;
    const stored: StoredFile = {
      key,
      url: `data:${file.contentType};base64,${Buffer.from(file.data).toString("base64")}`,
      name: file.name,
      size: file.data.byteLength,
      contentType: file.contentType,
    };
    this.files.set(key, stored);
    return stored;
  }

  async delete(keys: string[]) {
    for (const key of keys) this.files.delete(key);
  }
}
