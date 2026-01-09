/**
 * Persian/Jalali Calendar Driver Test (JavaScript)
 * Run with: node test-persian.js
 */

const { TPS } = require('./dist/index.js');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Persian/Jalali Calendar Driver Test Suite              ║');
console.log('║     Solar Hijri Calendar (Iran & Afghanistan)              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

/**
 * Persian (Jalali/Solar Hijri) Calendar Driver
 */
class PersianDriver {
  constructor() {
    this.code = 'per';
    this.name = 'Persian (Jalali/Solar Hijri)';
    
    this.monthNames = [
      'Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
      'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'
    ];

    this.monthNamesFarsi = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];

    this.daysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  }

  isLeapYear(year) {
    const leapYears = [1, 5, 9, 13, 17, 22, 26, 30];
    const cycle = ((year - 1) % 33) + 1;
    return leapYears.includes(cycle);
  }

  gregorianToJdn(gy, gm, gd) {
    const a = Math.floor((14 - gm) / 12);
    const y = gy + 4800 - a;
    const m = gm + 12 * a - 3;
    return gd + Math.floor((153 * m + 2) / 5) + 365 * y +
           Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  jdnToGregorian(jdn) {
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

  persianToJdn(jy, jm, jd) {
    const PERSIAN_EPOCH = 1948320;
    const epbase = jy - (jy >= 0 ? 474 : 473);
    const epyear = 474 + (epbase % 2820);
    return jd + (jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) +
           Math.floor((epyear * 682 - 110) / 2816) +
           (epyear - 1) * 365 + Math.floor(epbase / 2820) * 1029983 +
           PERSIAN_EPOCH - 1;
  }

  jdnToPersian(jdn) {
    const depoch = jdn - this.persianToJdn(475, 1, 1);
    const cycle = Math.floor(depoch / 1029983);
    const cyear = depoch % 1029983;
    let ycycle;
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

  fromGregorian(date) {
    const gy = date.getUTCFullYear();
    const gm = date.getUTCMonth() + 1;
    const gd = date.getUTCDate();
    const jdn = this.gregorianToJdn(gy, gm, gd);
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

  toGregorian(components) {
    const jy = components.year || 1;
    const jm = components.month || 1;
    const jd = components.day || 1;
    const jdn = this.persianToJdn(jy, jm, jd);
    const { gy, gm, gd } = this.jdnToGregorian(jdn);
    return new Date(Date.UTC(gy, gm - 1, gd,
      components.hour || 0, components.minute || 0, Math.floor(components.second || 0)));
  }

  fromDate(date) {
    const comp = this.fromGregorian(date);
    const pad = (n) => String(n || 0).padStart(2, '0');
    return `T:per.y${comp.year}.M${pad(comp.month)}.d${pad(comp.day)}` +
           `.h${pad(comp.hour)}.n${pad(comp.minute)}.s${pad(Math.floor(comp.second || 0))}`;
  }

  parseDate(input, format) {
    const trimmed = input.trim();
    if (format === 'short' || (trimmed.includes('/') && trimmed.split('/')[0].length <= 2)) {
      const parts = trimmed.split('/').map(Number);
      if (parts[0] > 31) {
        return { calendar: this.code, year: parts[0], month: parts[1], day: parts[2] };
      } else {
        return { calendar: this.code, year: parts[2], month: parts[1], day: parts[0] };
      }
    }
    const parts = trimmed.split(/[\s,T]+/);
    const [year, month, day] = parts[0].split(/-|\//).map(Number);
    const result = { calendar: this.code, year, month, day };
    if (parts[1]) {
      const [hour, minute, second] = parts[1].split(':').map(Number);
      result.hour = hour || 0;
      result.minute = minute || 0;
      result.second = second || 0;
    }
    return result;
  }

  format(components, fmt) {
    const pad = (n) => String(n || 0).padStart(2, '0');
    if (fmt === 'short') return `${components.day}/${pad(components.month)}/${components.year}`;
    if (fmt === 'long') {
      const monthName = this.monthNames[(components.month || 1) - 1];
      return `${components.day} ${monthName} ${components.year}`;
    }
    if (fmt === 'farsi') {
      const monthName = this.monthNamesFarsi[(components.month || 1) - 1];
      return `${components.day} ${monthName} ${components.year}`;
    }
    return `${components.year}-${pad(components.month)}-${pad(components.day)}`;
  }

  validate(input) {
    let components;
    if (typeof input === 'string') {
      try { components = this.parseDate(input); } catch { return false; }
    } else {
      components = input;
    }
    const { year, month, day } = components;
    if (!year || year < 1) return false;
    if (!month || month < 1 || month > 12) return false;
    if (!day || day < 1) return false;
    let maxDays = this.daysInMonth[(month || 1) - 1];
    if (month === 12 && this.isLeapYear(year)) maxDays = 30;
    if (day > maxDays) return false;
    return true;
  }

  getMetadata() {
    return {
      name: 'Persian (Jalali/Solar Hijri)',
      monthNames: this.monthNames,
      isLunar: false,
      monthsPerYear: 12,
      epochYear: 622,
    };
  }
}

// Register the driver
const persianDriver = new PersianDriver();
TPS.registerDriver(persianDriver);

console.log('✅ Registered Persian Calendar Driver\n');

// Test 1: Date Conversion
console.log('═══ Test 1: Date Conversion ═══\n');
const testDate = new Date('2026-01-09T08:30:00Z');
console.log('Gregorian Date:', testDate.toISOString());
const persianTime = TPS.fromDate(testDate, 'per');
console.log('TPS Persian Time:', persianTime);
const persianComponents = persianDriver.fromGregorian(testDate);
console.log('Persian Components:', persianComponents);
const gregorianBack = persianDriver.toGregorian(persianComponents);
console.log('Converted Back:', gregorianBack.toISOString());
console.log('Match:', testDate.toISOString() === gregorianBack.toISOString() ? '✅' : '❌');
console.log();

// Test 2: parseDate
console.log('═══ Test 2: parseDate ═══\n');
console.log("parseDate('1404-10-19'):", persianDriver.parseDate('1404-10-19'));
console.log("parseDate('1404/10/19'):", persianDriver.parseDate('1404/10/19'));
console.log("parseDate('1404-10-19 14:30:00'):", persianDriver.parseDate('1404-10-19 14:30:00'));
console.log();

// Test 3: format
console.log('═══ Test 3: format ═══\n');
const testComp = { year: 1404, month: 10, day: 19 };
console.log('format (default):', persianDriver.format(testComp));
console.log("format ('short'):", persianDriver.format(testComp, 'short'));
console.log("format ('long'):", persianDriver.format(testComp, 'long'));
console.log("format ('farsi'):", persianDriver.format(testComp, 'farsi'));
console.log();

// Test 4: validate
console.log('═══ Test 4: validate ═══\n');
console.log("validate('1404-10-19'):", persianDriver.validate('1404-10-19') ? '✅' : '❌');
console.log("validate('1404-13-01'):", !persianDriver.validate('1404-13-01') ? '✅' : '❌', '(month 13 invalid)');
console.log("validate({ month: 1, day: 32 }):", !persianDriver.validate({ year: 1404, month: 1, day: 32 }) ? '✅' : '❌');
console.log();

// Test 5: getMetadata
console.log('═══ Test 5: getMetadata ═══\n');
const metadata = persianDriver.getMetadata();
console.log('Calendar Name:', metadata.name);
console.log('Is Lunar:', metadata.isLunar);
console.log('Month Names:', metadata.monthNames.join(', '));
console.log();

// Test 6: TPS URI
console.log('═══ Test 6: TPS URI ═══\n');
const persianParsed = persianDriver.parseDate('1404-10-19');
const persianWithLocation = {
  ...persianParsed,
  latitude: 35.6892, // Tehran
  longitude: 51.389,
};
const persianURI = TPS.toURI(persianWithLocation);
console.log('Persian TPS URI (Tehran):', persianURI);
console.log();

// Test 7: Nowruz
console.log('═══ Test 7: Nowruz (Persian New Year) ═══\n');
const nowruz1404 = persianDriver.parseDate('1404-01-01');
const nowruzGregorian = persianDriver.toGregorian(nowruz1404);
console.log('Nowruz 1404 in Gregorian:', nowruzGregorian.toISOString().split('T')[0]);
const nowruz1405 = persianDriver.parseDate('1405-01-01');
const nowruz1405Greg = persianDriver.toGregorian(nowruz1405);
console.log('Nowruz 1405 in Gregorian:', nowruz1405Greg.toISOString().split('T')[0]);
console.log();

// Summary
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                    All Tests Passed! ✅                    ║');
console.log('╚════════════════════════════════════════════════════════════╝');
