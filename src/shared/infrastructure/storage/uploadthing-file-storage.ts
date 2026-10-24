import { Logger } from "@nestjs/common";
import { UTApi, UTFile } from "uploadthing/server";

import {
  FileStorage,
  StorageUnavailableError,
  type IncomingFile,
  type StoredFile,
} from "../../application/file-storage";

const ATTEMPTS = 2;

export class UploadThingFileStorage extends FileStorage {
  private readonly api: UTApi;
  private readonly logger = new Logger("FileStorage");

  constructor(
    token: string,
    private readonly options: { private: boolean },
  ) {
    super();
    this.api = new UTApi({ token, logLevel: "Error" });
  }

  private async guard<T>(operation: string, action: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await action();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (attempt < ATTEMPTS) {
          this.logger.warn(`UploadThing: ${operation} falhou (${reason}); a tentar de novo.`);
          continue;
        }
        this.logger.error(`UploadThing: falhou ${operation}: ${reason}`);
        throw new StorageUnavailableError();
      }
    }
  }

  upload(file: IncomingFile, folder: string): Promise<StoredFile> {
    return this.guard("o envio", () => this.send(file, folder));
  }

  private async send(file: IncomingFile, folder: string): Promise<StoredFile> {
    const name = `${folder.replace(/[^a-zA-Z0-9-]+/g, "_")}_${file.name}`;
    const properties = { type: file.contentType, lastModified: Date.now() } as ConstructorParameters<typeof UTFile>[2];
    const [result] = await this.api.uploadFiles([new UTFile([file.data], name, properties)], {
      contentDisposition: "inline",
      ...(this.options.private ? { acl: "private" as const } : {}),
    });
    if (!result?.data) throw new Error(result?.error?.message ?? "sem resposta");
    const url = result.data.ufsUrl || result.data.url;
    if (!url) throw new Error("UploadThing não devolveu o endereço do ficheiro.");
    return {
      key: result.data.key,
      url,
      name: file.name,
      size: result.data.size,
      contentType: file.contentType,
    };
  }

  async delete(keys: string[]) {
    if (keys.length) await this.guard("a remoção", () => this.api.deleteFiles(keys));
  }
}
