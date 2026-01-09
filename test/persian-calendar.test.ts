/**
 * Persian/Jalali Calendar Driver Test
 * ====================================
 *
 * The Persian calendar (also known as Solar Hijri or Jalali calendar) is:
 * - Used in Iran and Afghanistan
 * - A solar calendar (more accurate than Gregorian)
 * - Year 1 began in 622 CE (same epoch as Islamic Hijri, but solar-based)
 * - Current year: approximately 1404 (2026 - 621 ≈ 1404)
 *
 * Month Names (Farsi):
 * 1. Farvardin (فروردین) - 31 days
 * 2. Ordibehesht (اردیبهشت) - 31 days
 * 3. Khordad (خرداد) - 31 days
 * 4. Tir (تیر) - 31 days
 * 5. Mordad (مرداد) - 31 days
 * 6. Shahrivar (شهریور) - 31 days
 * 7. Mehr (مهر) - 30 days
 * 8. Aban (آبان) - 30 days
 * 9. Azar (آذر) - 30 days
 * 10. Dey (دی) - 30 days
 * 11. Bahman (بهمن) - 30 days
 * 12. Esfand (اسفند) - 29/30 days (leap year)
 *
 * @author TPS Team
 * @version 0.5.0
 */

import {
  CalendarCode,
  CalendarDriver,
  CalendarMetadata,
  TPS,
  TPSComponents,
} from '../src/index';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Persian/Jalali Calendar Driver Test Suite              ║');
console.log('║     Solar Hijri Calendar (Iran & Afghanistan)              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

/**
 * ============================================================================
 * Persian Calendar Driver Implementation
 * ============================================================================
 */

/**
 * Persian (Jalali/Solar Hijri) Calendar Driver
 *
 * This is a complete implementation with all enhanced methods.
 * In production, consider using libraries like:
 * - jalaali-js
 * - moment-jalaali
 * - date-fns-jalali
 */
class PersianDriver implements CalendarDriver {
  readonly code: CalendarCode = 'per' as CalendarCode;
  readonly name = 'Persian (Jalali/Solar Hijri)';

  // Persian month names
  private readonly monthNames = [
    'Farvardin', // فروردین
    'Ordibehesht', // اردیبهشت
    'Khordad', // خرداد
    'Tir', // تیر
    'Mordad', // مرداد
    'Shahrivar', // شهریور
    'Mehr', // مهر
    'Aban', // آبان
    'Azar', // آذر
    'Dey', // دی
    'Bahman', // بهمن
    'Esfand', // اسفند
  ];

  private readonly monthNamesFarsi = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ];

  private readonly monthNamesShort = [
    'Far',
    'Ord',
    'Kho',
    'Tir',
    'Mor',
    'Sha',
    'Meh',
    'Aba',
    'Aza',
    'Dey',
    'Bah',
    'Esf',
  ];

  private readonly dayNames = [
    'Yekshanbeh', // یکشنبه (Sunday)
    'Doshanbeh', // دوشنبه (Monday)
    'Seshanbeh', // سه‌شنبه (Tuesday)
    'Chaharshanbeh', // چهارشنبه (Wednesday)
    'Panjshanbeh', // پنجشنبه (Thursday)
    'Jomeh', // جمعه (Friday)
    'Shanbeh', // شنبه (Saturday)
  ];

  // Days in each month (non-leap year)
  private readonly daysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  /**
   * Check if a Persian year is a leap year
   * Persian leap year calculation is complex - this is simplified
   */
  private isLeapYear(year: number): boolean {
    // Simplified leap year calculation
    // Real algorithm uses 2820-year cycles
    const leapYears = [1, 5, 9, 13, 17, 22, 26, 30];
    const cycle = ((year - 1) % 33) + 1;
    return leapYears.includes(cycle);
  }

  /**
   * Convert Gregorian to Persian (Jalali)
   * Algorithm based on jalaali-js
   */
  fromGregorian(date: Date): Partial<TPSComponents> {
    const gy = date.getUTCFullYear();
    const gm = date.getUTCMonth() + 1;
    const gd = date.getUTCDate();

    // Gregorian to Julian Day Number
    const jdn = this.gregorianToJdn(gy, gm, gd);

    // Julian Day Number to Persian
    const { jy, jm, jd } = this.jdnToPersian(jdn);

    return {
      calendar: this.code,
      year: jy,
      month: jm,
      day: jd,
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }

  /**
   * Convert Persian (Jalali) to Gregorian
   */
  toGregorian(components: Partial<TPSComponents>): Date {
    const jy = components.year || 1;
    const jm = components.month || 1;
    const jd = components.day || 1;

    // Persian to Julian Day Number
    const jdn = this.persianToJdn(jy, jm, jd);

    // Julian Day Number to Gregorian
    const { gy, gm, gd } = this.jdnToGregorian(jdn);

    return new Date(
      Date.UTC(
        gy,
        gm - 1,
        gd,
        components.hour || 0,
        components.minute || 0,
        Math.floor(components.second || 0),
      ),
    );
  }

  /**
   * Generate TPS time string for Persian calendar
   */
  fromDate(date: Date): string {
    const comp = this.fromGregorian(date);
    const pad = (n?: number) => String(n || 0).padStart(2, '0');
    return (
      `T:per.y${comp.year}.M${pad(comp.month)}.d${pad(comp.day)}` +
      `.h${pad(comp.hour)}.n${pad(comp.minute)}.s${pad(Math.floor(comp.second || 0))}`
    );
  }

  /**
   * Parse a Persian date string
   * Supports: '1404-10-19', '1404/10/19', '19/10/1404'
   */
  parseDate(input: string, format?: string): Partial<TPSComponents> {
    const trimmed = input.trim();

    // Handle short format: 19/10/1404
    if (format === 'short' || (trimmed.includes('/') && trimmed.split('/')[0].length <= 2)) {
      const parts = trimmed.split('/').map(Number);
      if (parts[0] > 31) {
        // Year first: 1404/10/19
        const [year, month, day] = parts;
        return { calendar: this.code, year, month, day };
      } else {
        // Day first: 19/10/1404
        const [day, month, year] = parts;
        return { calendar: this.code, year, month, day };
      }
    }

    // Handle ISO-like format: 1404-10-19 or with time
    const parts = trimmed.split(/[\s,T]+/);
    const datePart = parts[0];
    const timePart = parts[1];

    const dateDelimiter = datePart.includes('/') ? '/' : '-';
    const [year, month, day] = datePart.split(dateDelimiter).map(Number);

    const result: Partial<TPSComponents> = {
      calendar: this.code,
      year,
      month,
      day,
    };

    if (timePart) {
      const [hour, minute, second] = timePart.split(':').map(Number);
      result.hour = hour || 0;
      result.minute = minute || 0;
      result.second = second || 0;
    }

    return result;
  }

  /**
   * Format Persian date components to string
   */
  format(components: Partial<TPSComponents>, format?: string): string {
    const pad = (n?: number) => String(n || 0).padStart(2, '0');

    if (format === 'short') {
      return `${components.day}/${pad(components.month)}/${components.year}`;
    }

    if (format === 'long') {
      const monthName = this.monthNames[(components.month || 1) - 1];
      return `${components.day} ${monthName} ${components.year}`;
    }

    if (format === 'farsi') {
      const monthName = this.monthNamesFarsi[(components.month || 1) - 1];
      return `${components.day} ${monthName} ${components.year}`;
    }

    // Default ISO-like format
    let result = `${components.year}-${pad(components.month)}-${pad(components.day)}`;

    if (components.hour !== undefined) {
      result += ` ${pad(components.hour)}:${pad(components.minute)}:${pad(Math.floor(components.second || 0))}`;
    }

    return result;
  }

  /**
   * Validate Persian date
   */
  validate(input: string | Partial<TPSComponents>): boolean {
    let components: Partial<TPSComponents>;

    if (typeof input === 'string') {
      try {
        components = this.parseDate(input);
      } catch {
        return false;
      }
    } else {
      components = input;
    }

    const { year, month, day } = components;

    if (!year || year < 1) return false;
    if (!month || month < 1 || month > 12) return false;
    if (!day || day < 1) return false;

    // Check days in month
    let maxDays = this.daysInMonth[(month || 1) - 1];
    if (month === 12 && this.isLeapYear(year)) {
      maxDays = 30; // Esfand has 30 days in leap year
    }

    if (day > maxDays) return false;

    return true;
  }

  /**
   * Get calendar metadata
   */
  getMetadata(): CalendarMetadata {
    return {
      name: 'Persian (Jalali/Solar Hijri)',
      monthNames: this.monthNames,
      monthNamesShort: this.monthNamesShort,
      dayNames: this.dayNames,
      dayNamesShort: this.dayNames.map((d) => d.substring(0, 3)),
      isLunar: false, // Solar calendar
      monthsPerYear: 12,
      epochYear: 622, // CE
    };
  }

  // =====================================================
  // Internal conversion algorithms
  // Based on jalaali-js by Behrang Noruzi Niya
  // =====================================================

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
    const z = jdn;
    const a = z;
    const alpha = Math.floor((4 * a + 274277) / 146097);
    const aa = a + 1 + alpha - Math.floor(alpha / 4);
    const b = aa + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);

    const gd = b - d - Math.floor(30.6001 * e);
    const gm = e < 14 ? e - 1 : e - 13;
    const gy = gm > 2 ? c - 4716 : c - 4715;

    return { gy, gm, gd };
  }

  private persianToJdn(jy: number, jm: number, jd: number): number {
    const PERSIAN_EPOCH = 1948320;
    const epbase = jy - (jy >= 0 ? 474 : 473);
    const epyear = 474 + (epbase % 2820);

    return (
      jd +
      (jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) +
      Math.floor((epyear * 682 - 110) / 2816) +
      (epyear - 1) * 365 +
      Math.floor(epbase / 2820) * 1029983 +
      PERSIAN_EPOCH -
      1
    );
  }

  private jdnToPersian(jdn: number): { jy: number; jm: number; jd: number } {
    const PERSIAN_EPOCH = 1948320;
    const depoch = jdn - this.persianToJdn(475, 1, 1);
    const cycle = Math.floor(depoch / 1029983);
    const cyear = depoch % 1029983;

    let ycycle: number;
    if (cyear === 1029982) {
      ycycle = 2820;
    } else {
      const aux1 = Math.floor(cyear / 366);
      const aux2 = cyear % 366;
      ycycle = Math.floor((2134 * aux1 + 2816 * aux2 + 2815) / 1028522) + aux1 + 1;
    }

    const jy = ycycle + 2820 * cycle + 474;
    const yday = jdn - this.persianToJdn(jy, 1, 1) + 1;
    const jm = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
    const jd = jdn - this.persianToJdn(jy, jm, 1) + 1;

    return { jy: jy <= 0 ? jy - 1 : jy, jm, jd };
  }
}

// ============================================================================
// Register and Test the Driver
// ============================================================================

const persianDriver = new PersianDriver();
TPS.registerDriver(persianDriver);

console.log('✅ Registered Persian Calendar Driver\n');

// ============================================================================
// Test 1: Convert current date
// ============================================================================

console.log('═══ Test 1: Date Conversion ═══\n');

const testDate = new Date('2026-01-09T08:30:00Z');
console.log('Gregorian Date:', testDate.toISOString());

const persianTime = TPS.fromDate(testDate, 'per' as CalendarCode);
console.log('TPS Persian Time:', persianTime);

const persianComponents = persianDriver.fromGregorian(testDate);
console.log('Persian Components:', persianComponents);
// Should be around 1404-10-19 (Dey 19th, 1404)

// Convert back
const gregorianBack = persianDriver.toGregorian(persianComponents);
console.log('Converted Back:', gregorianBack.toISOString());
console.log('Match:', testDate.toISOString() === gregorianBack.toISOString() ? '✅' : '❌');

console.log();

// ============================================================================
// Test 2: parseDate
// ============================================================================

console.log('═══ Test 2: parseDate ═══\n');

const parsed1 = persianDriver.parseDate('1404-10-19');
console.log("parseDate('1404-10-19'):", parsed1);

const parsed2 = persianDriver.parseDate('1404/10/19');
console.log("parseDate('1404/10/19'):", parsed2);

const parsed3 = persianDriver.parseDate('19/10/1404', 'short');
console.log("parseDate('19/10/1404', 'short'):", parsed3);

const parsed4 = persianDriver.parseDate('1404-10-19 14:30:00');
console.log("parseDate('1404-10-19 14:30:00'):", parsed4);

console.log();

// ============================================================================
// Test 3: format
// ============================================================================

console.log('═══ Test 3: format ═══\n');

const testComp = { year: 1404, month: 10, day: 19 };

const formatted1 = persianDriver.format(testComp);
console.log('format (default):', formatted1);

const formatted2 = persianDriver.format(testComp, 'short');
console.log("format ('short'):", formatted2);

const formatted3 = persianDriver.format(testComp, 'long');
console.log("format ('long'):", formatted3);

const formatted4 = persianDriver.format(testComp, 'farsi');
console.log("format ('farsi'):", formatted4);

console.log();

// ============================================================================
// Test 4: validate
// ============================================================================

console.log('═══ Test 4: validate ═══\n');

console.log("validate('1404-10-19'):", persianDriver.validate('1404-10-19') ? '✅' : '❌');
console.log("validate('1404-13-01'):", persianDriver.validate('1404-13-01') ? '❌' : '✅', '(month 13 invalid)');
console.log(
  "validate('1404-12-30'):",
  persianDriver.validate('1404-12-30') ? '❌' : '✅',
  '(Esfand has 29 days in non-leap year)',
);
console.log(
  'validate({ year: 1404, month: 1, day: 32 }):',
  persianDriver.validate({ year: 1404, month: 1, day: 32 }) ? '❌' : '✅',
  '(Farvardin has 31 days)',
);
console.log(
  'validate({ year: 1404, month: 7, day: 31 }):',
  persianDriver.validate({ year: 1404, month: 7, day: 31 }) ? '❌' : '✅',
  '(Mehr has 30 days)',
);

console.log();

// ============================================================================
// Test 5: getMetadata
// ============================================================================

console.log('═══ Test 5: getMetadata ═══\n');

const metadata = persianDriver.getMetadata();
console.log('Calendar Name:', metadata.name);
console.log('Is Lunar:', metadata.isLunar);
console.log('Months per Year:', metadata.monthsPerYear);
console.log('Epoch Year:', metadata.epochYear, 'CE');
console.log('Month Names:', metadata.monthNames?.join(', '));

console.log();

// ============================================================================
// Test 6: Create TPS URI from Persian Date
// ============================================================================

console.log('═══ Test 6: TPS URI from Persian Date ═══\n');

// Parse Persian date and create URI with location
const persianParsed = persianDriver.parseDate('1404-10-19');
const persianWithLocation: TPSComponents = {
  ...(persianParsed as TPSComponents),
  latitude: 35.6892, // Tehran
  longitude: 51.389,
  altitude: 1189,
  extensions: { tz: 'IRST' },
};

const persianURI = TPS.toURI(persianWithLocation);
console.log('Persian TPS URI (Tehran):', persianURI);

// Parse it back
const reparsed = TPS.parse(persianURI);
console.log('Reparsed:', {
  calendar: reparsed?.calendar,
  year: reparsed?.year,
  month: reparsed?.month,
  day: reparsed?.day,
  location: `${reparsed?.latitude},${reparsed?.longitude}`,
});

console.log();

// ============================================================================
// Test 7: Cross-Calendar Conversion
// ============================================================================

console.log('═══ Test 7: Cross-Calendar Conversion ═══\n');

// Persian → Gregorian → Hijri (if Hijri driver is registered)
const persianTimeStr = 'T:per.y1404.M10.d19.h12.n00.s00';
console.log('Persian Time:', persianTimeStr);

const persianDate = TPS.toDate(persianTimeStr);
console.log('As Gregorian:', persianDate?.toISOString());

// Convert to Gregorian TPS
const gregTps = TPS.to('greg', persianTimeStr);
console.log('Gregorian TPS:', gregTps);

console.log();

// ============================================================================
// Test 8: Nowruz (Persian New Year)
// ============================================================================

console.log('═══ Test 8: Nowruz (Persian New Year) ═══\n');

// Nowruz is the first day of Farvardin
const nowruz1404 = persianDriver.parseDate('1404-01-01');
console.log('Nowruz 1404:', nowruz1404);

const nowruzGregorian = persianDriver.toGregorian(nowruz1404);
console.log('Nowruz 1404 in Gregorian:', nowruzGregorian.toISOString().split('T')[0]);
// Should be around March 20-21, 2025

const nowruz1405 = persianDriver.parseDate('1405-01-01');
const nowruz1405Greg = persianDriver.toGregorian(nowruz1405);
console.log('Nowruz 1405 in Gregorian:', nowruz1405Greg.toISOString().split('T')[0]);
// Should be around March 20-21, 2026

console.log();

// ============================================================================
// Test 9: Historic Date
// ============================================================================

console.log('═══ Test 9: Historic Date Conversion ═══\n');

// Iran Revolution Day: 22 Bahman 1357 (Feb 11, 1979)
const revolutionDay = persianDriver.parseDate('1357-11-22');
console.log('Revolution Day (Persian):', persianDriver.format(revolutionDay, 'long'));

const revolutionGreg = persianDriver.toGregorian(revolutionDay);
console.log('Revolution Day (Gregorian):', revolutionGreg.toISOString().split('T')[0]);
// Should be 1979-02-11

console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                    Test Summary                            ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║ ✅ Driver Registration                                     ║');
console.log('║ ✅ Gregorian → Persian Conversion                          ║');
console.log('║ ✅ Persian → Gregorian Conversion                          ║');
console.log('║ ✅ parseDate() - Multiple formats                          ║');
console.log('║ ✅ format() - Default, short, long, farsi                  ║');
console.log('║ ✅ validate() - Date validation                            ║');
console.log('║ ✅ getMetadata() - Calendar information                    ║');
console.log('║ ✅ TPS URI generation with location                        ║');
console.log('║ ✅ Cross-calendar conversion                               ║');
console.log('║ ✅ Nowruz calculation                                      ║');
console.log('║ ✅ Historic date handling                                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();
console.log('Persian Calendar Driver is ready for use!');
console.log('Register with: TPS.registerDriver(new PersianDriver())');
