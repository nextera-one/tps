/**
 * Persian (Jalali / Solar Hijri) Calendar Driver
 *
 * Calendar characteristics:
 * - Solar calendar used in Iran and Afghanistan
 * - Year 1 started in 622 CE (same epoch as Islamic Hijri, but solar-based)
 * - 6 months of 31 days, 5 months of 30 days, 1 month of 29 (30 in leap)
 * - Current year ≈ Gregorian year − 621
 *
 * Conversion uses Julian Day Number algorithms based on jalaali-js.
 */
import { CalendarDriver, CalendarMetadata, TPSComponents, TPS } from "../index";

export class PersianDriver implements CalendarDriver {
  readonly code = "per";
  readonly name = "Persian (Jalali/Solar Hijri)";

  private readonly MONTH_NAMES = [
    "Farvardin",
    "Ordibehesht",
    "Khordad",
    "Tir",
    "Mordad",
    "Shahrivar",
    "Mehr",
    "Aban",
    "Azar",
    "Dey",
    "Bahman",
    "Esfand",
  ];

  private readonly MONTH_NAMES_SHORT = [
    "Far",
    "Ord",
    "Kho",
    "Tir",
    "Mor",
    "Sha",
    "Meh",
    "Aba",
    "Aza",
    "Dey",
    "Bah",
    "Esf",
  ];

  private readonly DAY_NAMES = [
    "Yekshanbeh",
    "Doshanbeh",
    "Seshanbeh",
    "Chaharshanbeh",
    "Panjshanbeh",
    "Jomeh",
    "Shanbeh",
  ];

  /** Days per month (non-leap): 6×31 + 5×30 + 1×29 = 365 */
  private readonly DAYS_IN_MONTH = [
    31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29,
  ];

  // ── CalendarDriver interface ──────────────────────────────────────────

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const jdn = this.gregorianToJdn(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
    const { jy, jm, jd } = this.jdnToPersian(jdn);

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
    // Reconstruct full Persian year from millennium/century/year if available
    let jy: number;
    if (components.millennium !== undefined) {
      const m = components.millennium ?? 0;
      const c = components.century ?? 1;
      const y = components.year ?? 0;
      jy = (m - 1) * 1000 + (c - 1) * 100 + y;
    } else {
      jy = components.year ?? 1;
    }
    const jm = components.month ?? 1;
    const jd = components.day ?? 1;
    const jdn = this.persianToJdn(jy, jm, jd);
    const { gy, gm, gd } = this.jdnToGregorian(jdn);

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
    return TPS.buildTimePart(comp);
  }

  parseDate(input: string, format?: string): Partial<TPSComponents> {
    const trimmed = input.trim();

    // Short format: 19/10/1404 or 1404/10/19
    if (
      format === "short" ||
      (trimmed.includes("/") && trimmed.split("/")[0].length <= 2)
    ) {
      const parts = trimmed.split("/").map(Number);
      let fullYear: number, month: number, day: number;
      if (parts[0] > 31) {
        [fullYear, month, day] = parts;
      } else {
        [day, month, fullYear] = parts;
      }
      return {
        calendar: this.code,
        millennium: Math.floor(fullYear / 1000) + 1,
        century: Math.floor((fullYear % 1000) / 100) + 1,
        year: fullYear % 100,
        month,
        day,
      };
    }

    // ISO-like: 1404-10-19 [HH:MM:SS]
    const segments = trimmed.split(/[\s,T]+/);
    const [parsedYear, month, day] = segments[0].split(/[-/]/).map(Number);
    const result: Partial<TPSComponents> = { calendar: this.code };
    const fullYear = parsedYear;
    result.millennium = Math.floor(fullYear / 1000) + 1;
    result.century = Math.floor((fullYear % 1000) / 100) + 1;
    result.year = fullYear % 100;
    result.month = month;
    result.day = day;

    if (segments[1]) {
      const [h, m, s] = segments[1].split(":").map(Number);
      result.hour = h ?? 0;
      result.minute = m ?? 0;
      result.second = s ?? 0;
    }
    return result;
  }

  format(components: Partial<TPSComponents>, format?: string): string {
    const pad = (n?: number) => String(n ?? 0).padStart(2, "0");
    // Reconstruct full year from millennium/century/year
    let fullYear: number;
    if (components.millennium !== undefined) {
      const m = components.millennium ?? 0;
      const c = components.century ?? 1;
      const y = components.year ?? 0;
      fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;
    } else {
      fullYear = components.year ?? 0;
    }

    if (format === "short") {
      return `${components.day}/${pad(components.month)}/${fullYear}`;
    }
    if (format === "long") {
      const mn = this.MONTH_NAMES[(components.month ?? 1) - 1];
      return `${components.day} ${mn} ${fullYear}`;
    }
    let out = `${fullYear}-${pad(components.month)}-${pad(components.day)}`;
    if (components.hour !== undefined) {
      out += ` ${pad(components.hour)}:${pad(components.minute)}:${pad(Math.floor(components.second ?? 0))}`;
    }
    return out;
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    let comp: Partial<TPSComponents>;
    if (typeof input === "string") {
      try {
        comp = this.parseDate(input);
      } catch {
        return false;
      }
    } else {
      comp = input;
    }
    const { year, month, day } = comp;
    if (!year || year < 1) return false;
    if (!month || month < 1 || month > 12) return false;
    if (!day || day < 1) return false;
    let max = this.DAYS_IN_MONTH[(month ?? 1) - 1];
    if (month === 12 && this.isLeapYear(year)) max = 30;
    return day <= max;
  }

  getMetadata(): CalendarMetadata {
    return {
      name: "Persian (Jalali/Solar Hijri)",
      monthNames: this.MONTH_NAMES,
      monthNamesShort: this.MONTH_NAMES_SHORT,
      dayNames: this.DAY_NAMES,
      dayNamesShort: this.DAY_NAMES.map((d) => d.slice(0, 3)),
      isLunar: false,
      monthsPerYear: 12,
      epochYear: 622,
    };
  }

  // ── Internal: leap year (33-year cycle) ───────────────────────────────

  private isLeapYear(year: number): boolean {
    const leapYears = [1, 5, 9, 13, 17, 22, 26, 30];
    const cycle = ((year - 1) % 33) + 1;
    return leapYears.includes(cycle);
  }

  // ── Internal: Julian Day Number algorithms ────────────────────────────

  private gregorianToJdn(gy: number, gm: number, gd: number): number {
    const a = Math.floor((14 - gm) / 12);
    const y = gy + 4800 - a;
    const m = gm + 12 * a - 3;
    return (
      gd +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045
    );
  }

  private jdnToGregorian(jdn: number): { gy: number; gm: number; gd: number } {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const gd = e - Math.floor((153 * m + 2) / 5) + 1;
    const gm = m + 3 - 12 * Math.floor(m / 10);
    const gy = 100 * b + d - 4800 + Math.floor(m / 10);
    return { gy, gm, gd };
  }

  private persianToJdn(jy: number, jm: number, jd: number): number {
    const EPOCH = 1948320;
    const epbase = jy - (jy >= 0 ? 474 : 473);
    const epyear = 474 + (epbase % 2820);
    return (
      jd +
      (jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) +
      Math.floor((epyear * 682 - 110) / 2816) +
      (epyear - 1) * 365 +
      Math.floor(epbase / 2820) * 1029983 +
      EPOCH -
      1
    );
  }

  private jdnToPersian(jdn: number): { jy: number; jm: number; jd: number } {
    const depoch = jdn - this.persianToJdn(475, 1, 1);
    const cycle = Math.floor(depoch / 1029983);
    const cyear = depoch % 1029983;
    let ycycle: number;
    if (cyear === 1029982) {
      ycycle = 2820;
    } else {
      const aux1 = Math.floor(cyear / 366);
      const aux2 = cyear % 366;
      ycycle =
        Math.floor((2134 * aux1 + 2816 * aux2 + 2815) / 1028522) + aux1 + 1;
    }
    const jy = ycycle + 2820 * cycle + 474;
    const yday = jdn - this.persianToJdn(jy, 1, 1) + 1;
    const jm = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
    const jd = jdn - this.persianToJdn(jy, jm, 1) + 1;
    return { jy: jy <= 0 ? jy - 1 : jy, jm, jd };
  }
}
