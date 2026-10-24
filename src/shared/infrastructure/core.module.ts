import { Global, Module } from "@nestjs/common";

import { Clock, SystemClock } from "../domain/clock";
import { IdGenerator, UuidGenerator } from "../domain/id-generator";

@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
  ],
  exports: [Clock, IdGenerator],
})
export class CoreModule {}
