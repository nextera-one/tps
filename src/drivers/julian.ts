/**
 * Julian Calendar Driver
 *
 * Calendar characteristics:
 * - Predecessor to the Gregorian calendar, used until 1582 CE (and later in some regions)
 * - Identical month structure to Gregorian (12 months, same lengths)
 * - Leap year rule: every 4 years (no century exception)
 * - Diverges from Gregorian by ~1 day every 128 years
 *
 * Conversion uses Julian Day Number algorithms.
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
import { buildTimePart } from "../utils/tps-string";
import {
  gregorianToJdn,
  jdnToGregorian,
  julianToJdn,
  jdnToJulian,
} from "../utils/calendar";

export class JulianDriver implements CalendarDriver {
  readonly code = "jul";
  readonly name = "Julian Calendar";

  private readonly MONTH_NAMES = [
    "Januarius",
    "Februarius",
    "Martius",
    "Aprilis",
    "Maius",
    "Junius",
    "Julius",
    "Augustus",
    "September",
    "October",
    "November",
    "December",
  ];

  private readonly MONTH_NAMES_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  private readonly DAYS_IN_MONTH = [
    31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const jdn = gregorianToJdn(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
    const { jy, jm, jd } = jdnToJulian(jdn);

    return {
      calendar: this.code,
      millennium: Math.floor(jy / 1000) + 1,
      century: Math.floor((jy % 1000) / 100) + 1,
      year: jy % 100,
      month: jm,
      day: jd,
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      millisecond: date.getUTCMilliseconds(),
    };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    let fullYear: number;
    if (components.millennium !== undefined) {
      const m = components.millennium ?? 0;
      const c = components.century ?? 1;
      const y = components.year ?? 0;
      fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;
    } else {
      fullYear = components.year ?? 1;
    }
    const jm = components.month ?? 1;
    const jd = components.day ?? 1;
    const jdn = julianToJdn(fullYear, jm, jd);
    const { gy, gm, gd } = jdnToGregorian(jdn);

    return new Date(
      Date.UTC(
        gy,
        gm - 1,
        gd,
        components.hour ?? 0,
        components.minute ?? 0,
        Math.floor(components.second ?? 0),
        components.millisecond ?? 0,
      ),
    );
  }

  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date) as TPSComponents;
    return buildTimePart(comp);
  }

  parseDate(input: string, _format?: string): Partial<TPSComponents> {
    const trimmed = input.trim();
    const m = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/,
    );
    if (!m)
      throw new Error(`JulianDriver.parseDate: unsupported format "${input}"`);

    const fullYear = parseInt(m[1], 10);
    const result: Partial<TPSComponents> = {
      calendar: this.code,
      millennium: Math.floor(fullYear / 1000) + 1,
      century: Math.floor((fullYear % 1000) / 100) + 1,
      year: fullYear % 100,
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

  format(components: Partial<TPSComponents>, _format?: string): string {
    const pad = (n?: number, w = 2) => String(n ?? 0).padStart(w, "0");
    let fullYear: number;
    if (components.millennium !== undefined) {
      const m = components.millennium ?? 0;
      const c = components.century ?? 1;
      const y = components.year ?? 0;
      fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;
    } else {
      fullYear = components.year ?? 0;
    }

    let out = `${pad(fullYear, 4)}-${pad(components.month)}-${pad(components.day)}`;
    if (
      components.hour !== undefined ||
      components.minute !== undefined ||
      components.second !== undefined ||
      components.millisecond !== undefined
    ) {
      out += `T${pad(components.hour)}:${pad(components.minute)}:${pad(Math.floor(components.second ?? 0))}`;
      if (components.millisecond !== undefined)
        out += `.${pad(components.millisecond, 3)}`;
    }
    return out;
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === "string") {
      return /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/.test(
        input.trim(),
      );
    }
    if (typeof input === "object") {
      let fullYear: number;
      if (input.millennium !== undefined) {
        fullYear =
          ((input.millennium ?? 0) - 1) * 1000 +
          ((input.century ?? 1) - 1) * 100 +
          (input.year ?? 0);
      } else {
        fullYear = input.year ?? 0;
      }
      const { month, day } = input;
      if (month === undefined || day === undefined) return false;
      if (month < 1 || month > 12 || day < 1) return false;
      let maxDay = this.DAYS_IN_MONTH[month - 1];
      if (month === 2 && fullYear % 4 === 0) maxDay = 29;
      return day <= maxDay;
    }
    return false;
  }

  getMetadata(): CalendarMetadata {
    return {
      name: "Julian Calendar",
      monthNames: this.MONTH_NAMES,
      monthNamesShort: this.MONTH_NAMES_SHORT,
      isLunar: false,
      monthsPerYear: 12,
      epochYear: 1,
    };
  }
}
