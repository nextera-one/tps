import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
import { buildTimePart } from "../utils/tps-string";
import { TPS } from "../index"; // Keeping TPS import as its usage in getDateFromComponents was not addressed by the instruction.

/**
 * Unix calendar driver. Represents the epoch timestamp in seconds with
 * fractional milliseconds.
 */
export class UnixDriver implements CalendarDriver {
  readonly code: string = "unix";

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const s = (date.getTime() / 1000).toFixed(3);
    return { calendar: this.code, unixSeconds: parseFloat(s) };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    if (components.unixSeconds !== undefined) {
      return new Date(components.unixSeconds * 1000);
    }

    return new Date(0);
  }

  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date) as TPSComponents;
    return buildTimePart(comp);
  }

  parseDate(input: string, _format?: string): Partial<TPSComponents> {
    const s = input.trim();
    if (!/^[0-9]+(?:\.[0-9]+)?$/.test(s)) {
      throw new Error(`UnixDriver.parseDate: unsupported format "${input}"`);
    }
    return { calendar: this.code, unixSeconds: parseFloat(s) };
  }

  format(components: Partial<TPSComponents>, _format?: string): string {
    if (components.unixSeconds === undefined)
      throw new Error("UnixDriver.format: missing unixSeconds");
    return new Date(components.unixSeconds * 1000).toISOString();
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === "string")
      return /^[0-9]+(?:\.[0-9]+)?$/.test(input.trim());
    if (typeof input === "object")
      return typeof input.unixSeconds === "number" && !isNaN(input.unixSeconds);
    return false;
  }

  getMetadata(): CalendarMetadata {
    return {
      name: "Unix Epoch",
      monthsPerYear: 0,
    };
  }
}
