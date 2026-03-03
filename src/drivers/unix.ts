import { CalendarDriver, TPSComponents, TPS, CalendarMetadata } from "../index";

/**
 * Unix calendar driver.  Represents the epoch timestamp in seconds with
 * fractional milliseconds.  This mirrors the built-in `CalendarCode.UNIX`
 * behaviour that was previously hard-coded in TPS.
 */
export class UnixDriver implements CalendarDriver {
  readonly code: string = "unix";

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const s = (date.getTime() / 1000).toFixed(3);
    return { calendar: this.code, unixSeconds: parseFloat(s) };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    // prefer an explicit unixSeconds value when available
    if (components.unixSeconds !== undefined) {
      return new Date(components.unixSeconds * 1000);
    }

    // otherwise attempt to derive a date from the other temporal fields by
    // round-tripping through the core TPS logic.  This is a little heavier but
    // keeps the Unix driver useful when callers supply a full set of
    // millennium/century/... values instead of a raw epoch.
    try {
      // The toURI helper will fill in the required time tokens and defaults.
      const tpsString = TPS.buildTimePart(components as TPSComponents);
      const date = TPS.toDate(tpsString);
      if (!date) {
        throw new Error("unable to convert components to Date");
      }
      return date;
    } catch (err: any) {
      throw new Error(
        "UnixDriver.toGregorian: missing unixSeconds and unable to compute date",
      );
    }
  }

  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date) as TPSComponents;
    return TPS.buildTimePart(comp);
  }

  parseDate(input: string, format?: string): Partial<TPSComponents> {
    const s = input.trim();
    // Accept simple numeric timestamps with optional fractional part
    if (!/^[0-9]+(?:\.[0-9]+)?$/.test(s)) {
      throw new Error(`UnixDriver.parseDate: unsupported format "${input}"`);
    }
    return { calendar: this.code, unixSeconds: parseFloat(s) };
  }

  format(components: Partial<TPSComponents>, format?: string): string {
    if (components.unixSeconds === undefined) {
      throw new Error("UnixDriver.format: missing unixSeconds");
    }
    return new Date(components.unixSeconds * 1000).toISOString();
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === "string") {
      return /^[0-9]+(?:\.[0-9]+)?$/.test(input.trim());
    }
    if (typeof input === "object") {
      return typeof input.unixSeconds === "number" && !isNaN(input.unixSeconds);
    }
    return false;
  }

  getMetadata(): CalendarMetadata {
    return {
      name: "Unix Epoch",
      // there is no concept of months; include minimal info
      monthsPerYear: 0,
    };
  }
}
