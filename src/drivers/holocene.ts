/**
 * Holocene (Human Era) Calendar Driver
 *
 * Calendar characteristics:
 * - Adds 10,000 to the Gregorian year (year 1 CE = 10,001 HE)
 * - Same months, days, and leap year rules as Gregorian
 * - Proposed by Cesare Emiliani in 1993 to encompass all of human history
 * - Also called Human Era (HE) calendar
 *
 * This is a thin wrapper around GregorianDriver with a year offset.
 */
import { CalendarDriver, CalendarMetadata, TPSComponents, TPS } from "../index";
import { GregorianDriver } from "./gregorian";

export class HoloceneDriver implements CalendarDriver {
  readonly code = "holo";
  readonly name = "Holocene (Human Era)";

  private readonly gregorian = new GregorianDriver();
  private readonly YEAR_OFFSET = 10000;

  // ── CalendarDriver interface ──────────────────────────────────────────

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const greg = this.gregorian.getComponentsFromDate(date);
    const fullYear = date.getUTCFullYear() + this.YEAR_OFFSET;

    return {
      ...greg,
      calendar: this.code,
      millennium: Math.floor(fullYear / 1000) + 1,
      century: Math.floor((fullYear % 1000) / 100) + 1,
      year: fullYear % 100,
    };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    const m = components.millennium ?? 0;
    const c = components.century ?? 1;
    const y = components.year ?? 0;
    const holoYear = (m - 1) * 1000 + (c - 1) * 100 + y;
    const gregYear = holoYear - this.YEAR_OFFSET;

    return new Date(
      Date.UTC(
        gregYear,
        (components.month ?? 1) - 1,
        components.day ?? 1,
        components.hour ?? 0,
        components.minute ?? 0,
        Math.floor(components.second ?? 0),
        components.millisecond ??
          Math.round(((components.second ?? 0) % 1) * 1000),
      ),
    );
  }

  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date) as TPSComponents;
    return TPS.buildTimePart(comp);
  }

  parseDate(input: string, format?: string): Partial<TPSComponents> {
    // Accept ISO-like: "12026-01-09" (Holocene year)
    const m = input
      .trim()
      .match(
        /^(\d{4,5})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/,
      );
    if (!m) {
      throw new Error(
        `HoloceneDriver.parseDate: unsupported format "${input}"`,
      );
    }
    const result: Partial<TPSComponents> = {
      calendar: this.code,
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      day: parseInt(m[3], 10),
    };
    if (m[4] !== undefined) result.hour = parseInt(m[4], 10);
    if (m[5] !== undefined) result.minute = parseInt(m[5], 10);
    if (m[6] !== undefined) result.second = parseInt(m[6], 10);
    if (m[7] !== undefined)
      result.millisecond = parseInt((m[7] + "000").slice(0, 3), 10);
    return result;
  }

  format(components: Partial<TPSComponents>, format?: string): string {
    const pad = (n?: number, w = 2) => String(n ?? 0).padStart(w, "0");
    // Reconstruct full Holocene year from components
    let holoYear: number;
    if (components.millennium !== undefined) {
      const m = components.millennium ?? 0;
      const c = components.century ?? 1;
      const y = components.year ?? 0;
      holoYear = (m - 1) * 1000 + (c - 1) * 100 + y;
    } else {
      holoYear = components.year ?? 0;
    }

    let out = `${String(holoYear).padStart(5, "0")}-${pad(components.month)}-${pad(components.day)}`;
    if (
      components.hour !== undefined ||
      components.minute !== undefined ||
      components.second !== undefined
    ) {
      out += `T${pad(components.hour)}:${pad(components.minute)}:${pad(Math.floor(components.second ?? 0))}`;
    }
    return out;
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === "string") {
      return /^\d{4,5}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/.test(
        input.trim(),
      );
    }
    if (typeof input === "object") {
      // Delegate day/month validation to Gregorian (same structure)
      return this.gregorian.validate({
        year: input.year,
        month: input.month,
        day: input.day,
      });
    }
    return false;
  }

  getMetadata(): CalendarMetadata {
    return {
      name: "Holocene (Human Era)",
      monthNames: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      isLunar: false,
      monthsPerYear: 12,
      epochYear: -10000, // 10001 BCE
    };
  }
}
