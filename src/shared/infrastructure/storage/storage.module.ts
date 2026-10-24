import { Global, Module } from "@nestjs/common";

import { AppConfig } from "../../../config/app-config";
import { FileStorage } from "../../application/file-storage";
import { MemoryFileStorage } from "./memory-file-storage";
import { UploadThingFileStorage } from "./uploadthing-file-storage";

@Global()
@Module({
  providers: [
    {
      provide: FileStorage,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        config.storage.provider === "uploadthing" && config.storage.uploadthingToken
          ? new UploadThingFileStorage(config.storage.uploadthingToken, { private: config.storage.private })
          : new MemoryFileStorage(),
    },
  ],
  exports: [FileStorage],
})
export class StorageModule {}
