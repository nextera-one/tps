/**
 * TPS calendar driver for canonical TPS time strings.
 *
 * TPS Calendar characteristics:
 * - Epoch: August 11, 1999 (00:00 UTC)
 * - Months: Always 28 days (12 months per year = 336 days)
 * - Time offset: 7 hours ahead of Gregorian (00:00 Gregorian = 07:00 TPS)
 *
 * Conversion process:
 * 1. Apply 7-hour offset to Gregorian date
 * 2. Calculate day-of-year in offset date
 * 3. Convert day-of-year to TPS month/day (each month = 28 days)
 * 4. Preserve millennium/century/year structure
 */
import { CalendarDriver, CalendarMetadata, TPSComponents } from "../types";
import { buildTimePart } from "../utils/tps-string";
import { GregorianDriver } from "./gregorian";

/**
 * TPS calendar driver for canonical TPS time strings.
 *
 * TPS Calendar characteristics:
 * - Epoch: August 11, 1999 (00:00 UTC)
 * - Months: Always 28 days (12 months per year = 336 days)
 * - Time offset: 7 hours ahead of Gregorian (00:00 Gregorian = 07:00 TPS)
 */
export class TpsDriver implements CalendarDriver {
  readonly code = "tps";
  readonly name = "TPS Canonical";

  private readonly TPS_OFFSET_HOURS = 7;
  private readonly TPS_DAYS_PER_MONTH = 28;
  private readonly TPS_MONTHS_PER_YEAR = 12;

  private readonly gregorian = new GregorianDriver();

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const offsetMillis = this.TPS_OFFSET_HOURS * 60 * 60 * 1000;
    const offsetDate = new Date(date.getTime() + offsetMillis);

    const gregComponents = this.gregorian.getComponentsFromDate(offsetDate);

    const yearStart = new Date(Date.UTC(offsetDate.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor(
      (offsetDate.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000),
    );

    const tpsMonth = Math.floor(dayOfYear / this.TPS_DAYS_PER_MONTH) + 1;
    const tpsDay = (dayOfYear % this.TPS_DAYS_PER_MONTH) + 1;

    return {
      calendar: this.code,
      millennium: gregComponents.millennium,
      century: gregComponents.century,
      year: gregComponents.year,
      month: tpsMonth,
      day: tpsDay,
      hour: gregComponents.hour,
      minute: gregComponents.minute,
      second: gregComponents.second,
      millisecond: gregComponents.millisecond,
    };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    const tpsMonth = components.month ?? 1;
    const tpsDay = components.day ?? 1;
    const dayOfYear = (tpsMonth - 1) * this.TPS_DAYS_PER_MONTH + (tpsDay - 1);

    const m = components.millennium ?? 0;
    const c = components.century ?? 1;
    const y = components.year ?? 0;
    const fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;

    const dateInYear = new Date(Date.UTC(fullYear, 0, 1));
    dateInYear.setUTCDate(dateInYear.getUTCDate() + dayOfYear);

    dateInYear.setUTCHours(components.hour ?? 0);
    dateInYear.setUTCMinutes(components.minute ?? 0);
    dateInYear.setUTCSeconds(components.second ?? 0);
    dateInYear.setUTCMilliseconds(components.millisecond ?? 0);

    const offsetMillis = this.TPS_OFFSET_HOURS * 60 * 60 * 1000;
    return new Date(dateInYear.getTime() - offsetMillis);
  }

  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date) as TPSComponents;
    return buildTimePart(comp);
  }

  parseDate(input: string, _format?: string): Partial<TPSComponents> {
    const s = input.trim();
    const m = s.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/,
    );
    if (!m)
      throw new Error(`TpsDriver.parseDate: unsupported format "${input}"`);

    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);

    if (month < 1 || month > this.TPS_MONTHS_PER_YEAR) {
      throw new Error(
        `TpsDriver.parseDate: invalid TPS month ${month} (expected 1-12)`,
      );
    }
    if (day < 1 || day > this.TPS_DAYS_PER_MONTH) {
      throw new Error(
        `TpsDriver.parseDate: invalid TPS day ${day} (expected 1-28)`,
      );
    }

    const hour = m[4] !== undefined ? parseInt(m[4], 10) : undefined;
    const minute = m[5] !== undefined ? parseInt(m[5], 10) : undefined;
    const second = m[6] !== undefined ? parseInt(m[6], 10) : undefined;
    const millisecond =
      m[7] !== undefined ? parseInt((m[7] + "000").slice(0, 3), 10) : undefined;

    const comp: Partial<TPSComponents> = {
      calendar: this.code,
      year,
      month,
      day,
    };
    if (hour !== undefined) comp.hour = hour;
    if (minute !== undefined) comp.minute = minute;
    if (second !== undefined) comp.second = second;
    if (millisecond !== undefined) comp.millisecond = millisecond;
    return comp;
  }

  format(components: Partial<TPSComponents>, _format?: string): string {
    const y =
      components.year !== undefined
        ? String(components.year).padStart(4, "0")
        : "0000";
    const mo =
      components.month !== undefined
        ? String(components.month).padStart(2, "0")
        : "01";
    const d =
      components.day !== undefined
        ? String(components.day).padStart(2, "0")
        : "01";
    let out = `${y}-${mo}-${d}`;

    if (
      components.hour !== undefined ||
      components.minute !== undefined ||
      components.second !== undefined ||
      components.millisecond !== undefined
    ) {
      const h =
        components.hour !== undefined
          ? String(components.hour).padStart(2, "0")
          : "00";
      const mi =
        components.minute !== undefined
          ? String(components.minute).padStart(2, "0")
          : "00";
      const s =
        components.second !== undefined
          ? String(Math.floor(components.second)).padStart(2, "0")
          : "00";
      const ms =
        components.millisecond !== undefined
          ? String(components.millisecond).padStart(3, "0")
          : "000";
      out += `T${h}:${mi}:${s}.${ms}`;
    }
    return out;
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === "string") {
      try {
        this.parseDate(input);
        return true;
      } catch {
        return false;
      }
    }
    if (typeof input === "object") {
      return (
        input.year !== undefined &&
        input.month !== undefined &&
        input.day !== undefined &&
        input.year >= 0 &&
        input.month >= 1 &&
        input.month <= this.TPS_MONTHS_PER_YEAR &&
        input.day >= 1 &&
        input.day <= this.TPS_DAYS_PER_MONTH
      );
    }
    return false;
  }

  getMetadata(): CalendarMetadata {
    return {
      name: "TPS Canonical (28-day months)",
      monthNames: [
        "Month 1",
        "Month 2",
        "Month 3",
        "Month 4",
        "Month 5",
        "Month 6",
        "Month 7",
        "Month 8",
        "Month 9",
        "Month 10",
        "Month 11",
        "Month 12",
      ],
      dayNames: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      monthsPerYear: this.TPS_MONTHS_PER_YEAR,
      epochYear: 1999,
      isLunar: false,
    };
  }
}
