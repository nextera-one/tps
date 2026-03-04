/**
 * Hijri (Islamic) Calendar Driver — Tabular / Arithmetic variant
 *
 * Calendar characteristics:
 * - Lunar calendar with 12 months of alternating 30/29 days
 * - 30-year cycle with 11 leap years (Dhul Hijjah gains a day)
 * - Year 1 AH ≈ 16 July 622 CE (Julian)
 * - Average year ≈ 354.36667 days
 *
 * This uses the Tabular Islamic Calendar (civil/Type II-A) algorithm
 * based on the formulas from Meeus "Astronomical Algorithms".
 */
import { CalendarDriver, CalendarMetadata, TPSComponents, TPS } from "../index";

export class HijriDriver implements CalendarDriver {
  readonly code = "hij";
  readonly name = "Hijri (Islamic Calendar)";

  private readonly MONTH_NAMES = [
    "Muharram",
    "Safar",
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    "Jumada al-Ula",
    "Jumada al-Thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qi'dah",
    "Dhu al-Hijjah",
  ];

  private readonly MONTH_NAMES_SHORT = [
    "Muh",
    "Saf",
    "Rab I",
    "Rab II",
    "Jum I",
    "Jum II",
    "Raj",
    "Sha",
    "Ram",
    "Shaw",
    "Dhu Q",
    "Dhu H",
  ];

  private readonly DAY_NAMES = [
    "al-Ahad",
    "al-Ithnayn",
    "ath-Thulatha",
    "al-Arbi'a",
    "al-Khamis",
    "al-Jumu'ah",
    "as-Sabt",
  ];

  /** Leap years in a 30-year cycle (civil / Type II-A pattern) */
  private readonly LEAP_YEARS_IN_CYCLE = new Set([
    2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29,
  ]);

  // ── CalendarDriver interface ──────────────────────────────────────────

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const { hy, hm, hd } = this.gregorianToHijri(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );

    return {
      calendar: this.code,
      millennium: Math.floor(hy / 1000) + 1,
      century: Math.floor((hy % 1000) / 100) + 1,
      year: hy % 100,
      month: hm,
      day: hd,
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      millisecond: date.getUTCMilliseconds(),
    };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    let hy: number;
    if (components.millennium !== undefined) {
      const m = components.millennium ?? 0;
      const c = components.century ?? 1;
      const y = components.year ?? 0;
      hy = (m - 1) * 1000 + (c - 1) * 100 + y;
    } else {
      hy = components.year ?? 1;
    }
    const hm = components.month ?? 1;
    const hd = components.day ?? 1;
    const { gy, gm, gd } = this.hijriToGregorian(hy, hm, hd);

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

    if (
      format === "short" ||
      (trimmed.includes("/") && trimmed.split("/")[0].length <= 2)
    ) {
      const [day, month, year] = trimmed.split("/").map(Number);
      return {
        calendar: this.code,
        millennium: Math.floor(year / 1000) + 1,
        century: Math.floor((year % 1000) / 100) + 1,
        year: year % 100,
        month,
        day,
      };
    }

    const segments = trimmed.split(/[\s,T]+/);
    const [fullYear, month, day] = segments[0].split("-").map(Number);
    const result: Partial<TPSComponents> = {
      calendar: this.code,
      millennium: Math.floor(fullYear / 1000) + 1,
      century: Math.floor((fullYear % 1000) / 100) + 1,
      year: fullYear % 100,
      month,
      day,
    };

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
    // Reconstruct full year for leap check
    let fullYear: number;
    if (comp.millennium !== undefined) {
      fullYear =
        ((comp.millennium ?? 0) - 1) * 1000 +
        ((comp.century ?? 1) - 1) * 100 +
        (year ?? 0);
    } else {
      fullYear = year ?? 0;
    }
    if (fullYear < 1) return false;
    if (!month || month < 1 || month > 12) return false;
    if (!day || day < 1) return false;
    const maxDays = this.daysInMonth(fullYear, month);
    return day <= maxDays;
  }

  getMetadata(): CalendarMetadata {
    return {
      name: "Hijri (Islamic Calendar)",
      monthNames: this.MONTH_NAMES,
      monthNamesShort: this.MONTH_NAMES_SHORT,
      dayNames: this.DAY_NAMES,
      dayNamesShort: this.DAY_NAMES.map((d) => d.slice(0, 3)),
      isLunar: true,
      monthsPerYear: 12,
      epochYear: 1,
    };
  }

  // ── Internal helpers ──────────────────────────────────────────────────

  private isLeapYear(year: number): boolean {
    return this.LEAP_YEARS_IN_CYCLE.has(((year - 1) % 30) + 1);
  }

  private daysInMonth(year: number, month: number): number {
    if (month === 12 && this.isLeapYear(year)) return 30;
    return month % 2 === 1 ? 30 : 29;
  }

  // ── Gregorian ↔ Hijri (Tabular algorithm from Meeus) ──────────────────

  /**
   * Convert Gregorian to Hijri (Tabular Islamic Calendar).
   * Algorithm from "Astronomical Algorithms" by Jean Meeus.
   */
  private gregorianToHijri(
    gy: number,
    gm: number,
    gd: number,
  ): { hy: number; hm: number; hd: number } {
    // Step 1: Gregorian → JDN
    const jdn = this.gregorianToJdn(gy, gm, gd);
    // Step 2: JDN → Hijri
    // L = JDN − 1948440 + 10632
    const L = jdn - 1948440 + 10632;
    // N = floor((L − 1) / 10631)
    const N = Math.floor((L - 1) / 10631);
    // L = L − 10631 × N + 354
    const L2 = L - 10631 * N + 354;
    // J = floor((10985 − L2) / 5316) × floor((50×L2) / 17719) + floor(L2 / 5670) × floor((43×L2) / 15238)
    const J =
      Math.floor((10985 - L2) / 5316) * Math.floor((50 * L2) / 17719) +
      Math.floor(L2 / 5670) * Math.floor((43 * L2) / 15238);
    // L3 = L2 − floor((30 − J) / 15) × floor((17719 × J) / 50) − floor(J / 16) × floor((15238 × J) / 43) + 29
    const L3 =
      L2 -
      Math.floor((30 - J) / 15) * Math.floor((17719 * J) / 50) -
      Math.floor(J / 16) * Math.floor((15238 * J) / 43) +
      29;
    const hm = Math.floor((24 * L3) / 709);
    const hd = L3 - Math.floor((709 * hm) / 24);
    const hy = 30 * N + J - 30;
    return { hy, hm, hd };
  }

  /**
   * Convert Hijri to Gregorian.
   */
  private hijriToGregorian(
    hy: number,
    hm: number,
    hd: number,
  ): { gy: number; gm: number; gd: number } {
    // Hijri → JDN
    const jdn =
      Math.floor((11 * hy + 3) / 30) +
      354 * hy +
      30 * hm -
      Math.floor((hm - 1) / 2) +
      hd +
      1948440 -
      385;
    // JDN → Gregorian
    return this.jdnToGregorian(jdn);
  }

  // ── JDN helpers ───────────────────────────────────────────────────────

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
}
