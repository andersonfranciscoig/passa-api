import { Clock } from "../domain/clock";

export class FixedClock extends Clock {
  constructor(private value = new Date("2026-10-24T09:00:00.000Z")) {
    super();
  }

  now(): Date {
    return this.value;
  }

  set(value: Date) {
    this.value = value;
  }
}
