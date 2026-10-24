import { IdGenerator } from "../domain/id-generator";

export class SequentialIdGenerator extends IdGenerator {
  private n = 0;

  next(): string {
    this.n += 1;
    return `00000000-0000-4000-8000-${String(this.n).padStart(12, "0")}`;
  }
}
