/**
 * TpsDate Date-like wrapper with native TPS conversion helpers.
 */

import { TPSComponents, DefaultCalendars, TimeOrder } from "./types";
import { TPS } from "./index";

export class TpsDate {
  private readonly internal: Date;
  private _cachedComponents: TPSComponents | null = null;
  private _cachedTps: string | null = null;

  constructor();
  constructor(value: string | number | Date | TpsDate);
  constructor(
    year: number,
    monthIndex: number,
    day?: number,
    hours?: number,
    minutes?: number,
    seconds?: number,
    ms?: number,
  );
  constructor(
    ...args:
      | []
      | [string | number | Date | TpsDate]
      | [number, number, number?, number?, number?, number?, number?]
  ) {
    if (args.length === 0) {
      this.internal = new Date();
      return;
    }

    if (args.length === 1) {
      const value = args[0];
      if (value instanceof TpsDate) {
        this.internal = new Date(value.getTime());
        return;
      }
      if (value instanceof Date) {
        this.internal = new Date(value.getTime());
        return;
      }
      if (typeof value === "string" && TpsDate.looksLikeTPS(value)) {
        const parsed = TPS.toDate(value);
        if (!parsed) {
          throw new RangeError(`Invalid TPS date string: ${value}`);
        }
        this.internal = parsed;
        return;
      }

      this.internal = new Date(value);
      return;
    }

    const [year, monthIndex, day, hours, minutes, seconds, ms] = args;
    this.internal = new Date(
      year,
      monthIndex,
      day ?? 1,
      hours ?? 0,
      minutes ?? 0,
      seconds ?? 0,
      ms ?? 0,
    );
  }

  private static looksLikeTPS(input: string): boolean {
    const s = input.trim();
    return s.startsWith("tps://") || s.startsWith("T:") || s.startsWith("t:");
  }

  private getTpsComponents(): TPSComponents {
    const currentTps = this.toTPS(DefaultCalendars.TPS);
    if (this._cachedTps === currentTps && this._cachedComponents) {
      return this._cachedComponents;
    }

    const parsed = TPS.parse(currentTps);
    if (!parsed) {
      throw new Error("TpsDate: failed to derive TPS components");
    }

    this._cachedTps = currentTps;
    this._cachedComponents = parsed;
    return parsed;
  }

  private getTpsFullYear(): number {
    const comp = this.getTpsComponents();
    return (comp.millennium - 1) * 1000 + (comp.century - 1) * 100 + comp.year;
  }

  static now(): number {
    return Date.now();
  }

  static parse(input: string): number {
    if (this.looksLikeTPS(input)) {
      const d = TPS.toDate(input);
      return d ? d.getTime() : Number.NaN;
    }
    return Date.parse(input);
  }

  static UTC(
    year: number,
    monthIndex: number,
    day?: number,
    hours?: number,
    minutes?: number,
    seconds?: number,
    ms?: number,
  ): number {
    return Date.UTC(
      year,
      monthIndex,
      day ?? 1,
      hours ?? 0,
      minutes ?? 0,
      seconds ?? 0,
      ms ?? 0,
    );
  }

  static fromTPS(tps: string): TpsDate {
    return new TpsDate(tps);
  }

  toGregorianDate(): Date {
    return new Date(this.internal.getTime());
  }

  toDate(): Date {
    return this.toGregorianDate();
  }

  toTPS(
    calendar: string = DefaultCalendars.TPS,
    opts?: { order?: TimeOrder },
  ): string {
    return TPS.fromDate(this.internal, calendar, opts);
  }

  toTPSURI(
    calendar: string = DefaultCalendars.TPS,
    opts?: {
      order?: TimeOrder;
      latitude?: number;
      longitude?: number;
      altitude?: number;
      isUnknownLocation?: boolean;
      isHiddenLocation?: boolean;
      isRedactedLocation?: boolean;
    },
  ): string {
    const time = this.toTPS(calendar, { order: opts?.order });
    const comp = TPS.parse(time) as TPSComponents;

    if (opts?.latitude !== undefined && opts?.longitude !== undefined) {
      comp.latitude = opts.latitude;
      comp.longitude = opts.longitude;
      if (opts.altitude !== undefined) comp.altitude = opts.altitude;
    } else if (opts?.isHiddenLocation) {
      comp.isHiddenLocation = true;
    } else if (opts?.isRedactedLocation) {
      comp.isRedactedLocation = true;
    } else {
      comp.isUnknownLocation = true;
    }

    return TPS.toURI(comp);
  }

  getTime(): number {
    return this.internal.getTime();
  }
  valueOf(): number {
    return this.internal.valueOf();
  }
  toString(): string {
    return this.toTPS(DefaultCalendars.TPS);
  }
  toISOString(): string {
    return this.internal.toISOString();
  }
  toUTCString(): string {
    return this.internal.toUTCString();
  }
  toJSON(): string | null {
    return this.internal.toJSON();
  }

  getFullYear(): number {
    return this.getTpsFullYear();
  }
  getUTCFullYear(): number {
    return this.getTpsFullYear();
  }
  getMonth(): number {
    return this.getTpsComponents().month - 1;
  }
  getUTCMonth(): number {
    return this.getTpsComponents().month - 1;
  }
  getDate(): number {
    return this.getTpsComponents().day;
  }
  getUTCDate(): number {
    return this.getTpsComponents().day;
  }
  getHours(): number {
    return this.getTpsComponents().hour;
  }
  getUTCHours(): number {
    return this.getTpsComponents().hour;
  }
  getMinutes(): number {
    return this.getTpsComponents().minute;
  }
  getUTCMinutes(): number {
    return this.getTpsComponents().minute;
  }
  getSeconds(): number {
    return this.getTpsComponents().second;
  }
  getUTCSeconds(): number {
    return this.getTpsComponents().second;
  }
  getMilliseconds(): number {
    return this.getTpsComponents().millisecond;
  }
  getUTCMilliseconds(): number {
    return this.getTpsComponents().millisecond;
  }

  [Symbol.toPrimitive](hint: string): string | number {
    if (hint === "number") return this.valueOf();
    return this.toString();
  }
}
