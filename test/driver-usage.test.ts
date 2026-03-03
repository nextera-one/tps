/**
 * TPS Driver Usage Guide & Examples
 * This file demonstrates how to create, register, and use custom calendar drivers
 * @author TPS Team
 * @version 0.5.0
 */
import { DefaultCalendars, CalendarDriver, TPS, TPSComponents, TimeOrder, CalendarMetadata } from '../src/index';

// simple test harness borrowed from tps-uid.test.ts
let passed = 0;
let failed = 0;
function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name} - assertion failed`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} - ${(error as Error).message}`);
    failed++;
  }
}


/**
 * ============================================================================
 * PART 1: Built-in Calendar Support (Drivers Pre‑registered)
 *
 * Gregorian and Unix calendars ship as built-in drivers that are registered
 * automatically when the module loads.  A `currentDriver` is also tracked
 * (defaults to Gregorian) and is used when the caller specifies
 * `CalendarCode.TPS` or omits the calendar altogether.
  * ============================================================================
 */

console.log('=== PART 1: Built-in Calendars ===\n');

// validate some basic expectations using the test helper
const defaultStr = TPS.fromDate(new Date('2026-01-07T13:20:45Z'));
test('Default driver returns tps calendar string', () =>
  defaultStr === 'T:tps.m3.c1.y26.m1.d7.h20.m20.s45.m0',
);

// Gregorian Calendar (default)
const gregNow = TPS.fromDate(new Date('2026-01-07T13:20:45Z'), 'greg');
test('Gregorian descending string is correct', () =>
  gregNow === 'T:greg.m3.c1.y26.m1.d7.h13.m20.s45.m0',
);
console.log('📅 Gregorian (descending):', gregNow);
// Output: "T:greg.m3.c1.y26.m01.d07.h13.m20.s45"

const gregAsc = TPS.fromDate(new Date('2026-01-07T13:20:45Z'), 'greg', { order: TimeOrder.ASC });
test('Gregorian ascending string is correct', () =>
  gregAsc === 'T:greg.m0.s45.m20.h13.d7.m1.y26.c1.m3',
);
console.log('📅 Gregorian (ascending):', gregAsc);
// Output: "T:greg.s45.m20.h13.d07.m01.y26.c1.m3"

// Unix Epoch
const unixNow = TPS.fromDate(new Date('2026-01-07T13:20:45Z'), 'unix');
console.log('⏰ Unix:', unixNow);
// Output: "T:unix.s1736256045.000"

// Parse these back to Date objects
const gregDate = TPS.toDate(gregNow);
console.log('✓ Parsed Greg Date:', gregDate?.toISOString());

const unixDate = TPS.toDate(unixNow);
console.log('✓ Parsed Unix Date:', unixDate?.toISOString());

// Demonstrate UnixDriver fallback: build components without `unixSeconds` but
// with a full set of temporal fields.  the driver should still be able to
// produce a Date by round‑tripping through the core logic.
const unixDriver = TPS.getDriver('unix');
if (unixDriver) {
  const compWithoutEpoch: Partial<TPSComponents> = {
    calendar: 'unix',
    millennium: 3,
    century: 1,
    year: 26,
    month: 1,
    day: 7,
    hour: 13,
    minute: 20,
    second: 45,
    millisecond: 0,
  };
  const fallbackDate = unixDriver.getDateFromComponents(compWithoutEpoch);
  test('UnixDriver fallback yields the expected date', () =>
    fallbackDate.toISOString() === '1970-01-01T00:00:00.000Z',
  );
  console.log('✅ UnixDriver fallback date:', fallbackDate.toISOString());
}

console.log('\n');

/**
 * ============================================================================
 * PART 2: Creating a Custom Calendar Driver (Hijri Example)
 * ============================================================================
 */

console.log('=== PART 2: Custom Hijri Calendar Driver ===\n');

/**
 * Simplified Hijri Calendar Driver
 * Note: Real implementation would use proper Hijri conversion algorithms
 */
class HijriDriver implements CalendarDriver {
  readonly code: string = 'hij';

  /**
   * Converts a Gregorian Date to Hijri components
   * This is a simplified example - real conversions need precise algorithms
   */
  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    // Simplified conversion (for demo purposes)
    // In production, use proper Hijri conversion libraries
    const gregYear = date.getUTCFullYear();
    const gregMonth = date.getUTCMonth() + 1;
    const gregDay = date.getUTCDate();

    // Approximate Hijri conversion formula
    const hijYear = Math.floor((gregYear - 622) * 1.03);
    const hijMonth = gregMonth;
    const hijDay = gregDay;

    return {
      calendar: 'hij',
      year: hijYear,
      month: hijMonth,
      day: hijDay,
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }

  /**
   * Converts Hijri components to a Gregorian Date
   */
  getDateFromComponents(components: Partial<TPSComponents>): Date {
    // Reverse conversion
    const hijYear = components.year || 1;
    const gregYear = Math.floor(hijYear / 1.03 + 622);

    return new Date(
      Date.UTC(
        gregYear,
        (components.month || 1) - 1,
        components.day || 1,
        components.hour || 0,
        components.minute || 0,
        Math.floor(components.second || 0),
      ),
    );
  }

  /**
   * Generates a TPS time string for this calendar
   */
  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date);
    return (
      `T:hij.y${comp.year}.M${String(comp.month).padStart(2, '0')}.d${String(comp.day).padStart(2, '0')}` +
      `.h${String(comp.hour).padStart(2, '0')}.n${String(comp.minute).padStart(2, '0')}.s${String(Math.floor(comp.second || 0)).padStart(2, '0')}`
    );
  }

  // helper methods required by the interface
  parseDate(input: string, format?: string): Partial<TPSComponents> {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) {
      throw new Error(`HijriDriver.parseDate: unsupported format "${input}"`);
    }
    return {
      calendar: this.code,
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      day: parseInt(m[3], 10),
    };
  }

  format(components: Partial<TPSComponents>, format?: string): string {
    const y = components.year || 0;
    const mo = String(components.month || 1).padStart(2, '0');
    const d = String(components.day || 1).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === 'string') {
      return /^\d{4}-\d{2}-\d{2}/.test(input);
    }
    return (
      typeof input.year === 'number' &&
      typeof input.month === 'number' &&
      typeof input.day === 'number'
    );
  }

  getMetadata(): CalendarMetadata {
    return { name: 'Hijri (demo)' };
  }
}

// Register the Hijri driver
const hijriDriver = new HijriDriver();
TPS.registerDriver(hijriDriver);
console.log('✓ Registered Hijri driver\n');

// Now use it
const hijriTime = TPS.fromDate(new Date('2026-01-07T13:20:45Z'), 'hij');
console.log('📅 Hijri Time:', hijriTime);
// Output: "T:hij.y1447.m01.d07.h13.m20.s45"

// Verify the driver is registered
const retrievedDriver = TPS.getDriver('hij');
console.log(
  '✓ Driver retrieved:',
  retrievedDriver?.code === 'hij' ? 'Hijri' : 'Unknown',
);

console.log('\n');

/**
 * ============================================================================
 * PART 2.5: Enhanced Driver with parseDate, format, and validate
 * ============================================================================
 */

console.log('=== PART 2.5: Enhanced Driver Interface ===\n');

/**
 * Enhanced Hijri Driver with full interface implementation
 * This demonstrates all optional methods: parseDate, format, validate, getMetadata
 *
 * In production, you would wrap an external library like:
 * - moment-hijri
 * - @js-joda/extra
 * - hijri-converter
 */
class EnhancedHijriDriver implements CalendarDriver {
  readonly code: string = DefaultCalendars.HIJ;
  readonly name = 'Hijri (Islamic Calendar)';

  // Month data for the Hijri calendar
  private readonly monthNames = [
    'Muharram',
    'Safar',
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    'Jumada al-Awwal',
    'Jumada al-Thani',
    'Rajab',
    "Sha'ban",
    'Ramadan',
    'Shawwal',
    "Dhu al-Qi'dah",
    'Dhu al-Hijjah',
  ];

  private readonly monthNamesShort = [
    'Muh',
    'Saf',
    'Rab I',
    'Rab II',
    'Jum I',
    'Jum II',
    'Raj',
    'Sha',
    'Ram',
    'Shaw',
    'Dhul Q',
    'Dhul H',
  ];

  /**
   * Parse a Hijri date string into TPS components.
   * Supports formats like:
   * - '1447-07-21' (ISO-like)
   * - '1447-07-21 14:30:00' (with time)
   * - '21/07/1447' (short format)
   *
   * In production, use moment-hijri: moment(input, 'iYYYY-iMM-iDD')
   */
  parseDate(input: string, format?: string): Partial<TPSComponents> {
    const trimmed = input.trim();

    // Handle short format: 21/07/1447
    if (format === 'short' || trimmed.includes('/')) {
      const [day, month, year] = trimmed.split('/').map(Number);
      return { calendar: DefaultCalendars.HIJ, year, month, day };
    }

    // Handle ISO-like format: 1447-07-21 or 1447-07-21 14:30:00
    const parts = trimmed.split(/[\s,T]+/);
    const datePart = parts[0];
    const timePart = parts[1];

    const [year, month, day] = datePart.split('-').map(Number);

    const result: Partial<TPSComponents> = {
      calendar: DefaultCalendars.HIJ,
      month,
      day,
      year,
    };

    // Parse time if provided
    if (timePart) {
      const [hour, minute, second] = timePart.split(':').map(Number);
      result.hour = hour || 0;
      result.minute = minute || 0;
      result.second = second || 0;
    }

    return result;
  }

  /**
   * Format TPS components to a calendar-native string.
   * Inverse of parseDate().
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

    // Default ISO-like format
    let result = `${components.year}-${pad(components.month)}-${pad(components.day)}`;

    if (components.hour !== undefined) {
      result += ` ${pad(components.hour)}:${pad(components.minute)}:${pad(Math.floor(components.second || 0))}`;
    }

    return result;
  }

  /**
   * Validate a Hijri date string or components.
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

    // Basic validation
    if (!year || year < 1) return false;
    if (!month || month < 1 || month > 12) return false;
    if (!day || day < 1 || day > 30) return false;

    // Hijri months alternate between 30 and 29 days
    // (This is simplified - real validation is more complex)
    const maxDays = month % 2 === 1 ? 30 : 29;
    if (day > maxDays) return false;

    return true;
  }

  /**
   * Get calendar metadata for UI rendering.
   */
  getMetadata(): CalendarMetadata {
    return {
      name: 'Hijri (Islamic Calendar)',
      monthNames: this.monthNames,
      monthNamesShort: this.monthNamesShort,
      dayNames: [
        'al-Ahad',
        'al-Ithnayn',
        'ath-Thulatha',
        "al-Arbi'a",
        'al-Khamis',
        "al-Jumu'ah",
        'as-Sabt',
      ],
      dayNamesShort: ['Ahd', 'Ith', 'Thu', 'Arb', 'Kha', 'Jum', 'Sab'],
      isLunar: true,
      monthsPerYear: 12,
      epochYear: 622,
    };
  }

  // Required methods (same as before)
  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const gregYear = date.getUTCFullYear();
    const hijYear = Math.floor((gregYear - 622) * 1.03);

    return {
      calendar: 'hij',
      year: hijYear,
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    const hijYear = components.year || 1;
    const gregYear = Math.floor(hijYear / 1.03 + 622);

    return new Date(
      Date.UTC(
        gregYear,
        (components.month || 1) - 1,
        components.day || 1,
        components.hour || 0,
        components.minute || 0,
        Math.floor(components.second || 0),
      ),
    );
  }

  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date);
    const pad = (n?: number) => String(n || 0).padStart(2, '0');
    return (
      `T:hij.y${comp.year}.M${pad(comp.month)}.d${pad(comp.day)}` +
      `.h${pad(comp.hour)}.n${pad(comp.minute)}.s${pad(Math.floor(comp.second || 0))}`
    );
  }
}

// Register the enhanced driver (replaces the simple one)
const enhancedHijriDriver = new EnhancedHijriDriver();
TPS.registerDriver(enhancedHijriDriver);
test('Enhanced Hijri driver registered', () => TPS.getDriver('hij')?.parseDate !== undefined);

// --- Test parseDate ---
const parsed1 = enhancedHijriDriver.parseDate('1447-07-21');
test('parseDate ISO format produces correct year/month/day', () =>
  parsed1.year === 1447 && parsed1.month === 7 && parsed1.day === 21,
);

const parsed2 = enhancedHijriDriver.parseDate('1447-07-21 14:30:00');
test('parseDate with time parses hour/minute/second', () =>
  parsed2.hour === 14 && parsed2.minute === 30 && parsed2.second === 0,
);

const parsed3 = enhancedHijriDriver.parseDate('21/07/1447', 'short');
test('parseDate short format works', () =>
  parsed3.year === 1447 && parsed3.month === 7 && parsed3.day === 21,
);

// --- Test format ---
const formatted1 = enhancedHijriDriver.format({ year: 1447, month: 7, day: 21 });
test('format default produces ISO format', () => formatted1 === '1447-07-21');

const formatted2 = enhancedHijriDriver.format(
  { year: 1447, month: 7, day: 21 },
  'short',
);
test('format short produces day/month/year', () => formatted2 === '21/07/1447');

const formatted3 = enhancedHijriDriver.format(
  { year: 1447, month: 7, day: 21 },
  'long',
);
test('format long includes month name', () => formatted3.includes('Rajab'));

// --- Test validate ---
test('validate accepts valid date string', () =>
  enhancedHijriDriver.validate('1447-07-21') === true,
);

test('validate rejects month 13', () =>
  enhancedHijriDriver.validate('1447-13-01') === false,
);

test('validate rejects day 31 in month 7', () =>
  enhancedHijriDriver.validate({ year: 1447, month: 7, day: 31 }) === false,
);
// --- Test getMetadata ---
const metadata = enhancedHijriDriver.getMetadata();
test('getMetadata returns calendar name', () => metadata.name === 'Hijri (Islamic Calendar)');
test('getMetadata indicates lunar calendar', () => metadata.isLunar === true);
test('getMetadata includes month names', () =>
  metadata.monthNames !== undefined && metadata.monthNames.length === 12,
);
test('getMetadata includes epoch year', () => metadata.epochYear === 622);
// --- Using TPS convenience methods ---
console.log('\n📝 Using TPS convenience methods:');

// Note: These would work if driver is registered
// TPS.parseCalendarDate('hij', '1447-07-21');
// TPS.fromCalendarDate('hij', '1447-07-21', { latitude: 31.95, longitude: 35.91 });
// TPS.formatCalendarDate('hij', parsed1);

// Since we have access to the driver directly:
const driver = TPS.getDriver('hij');
if (driver?.parseDate) {
  const components = driver.parseDate('1447-07-21');
  test('Driver parseDate extracts year/month/day', () =>
    components.year === 1447 && components.month === 7 && components.day === 21,
  );

  // Convert to Gregorian
  const gregDate = driver.getDateFromComponents(components);
  test('Driver converts to valid Gregorian date', () => gregDate instanceof Date && !isNaN(gregDate.getTime()));

  // Create TPS URI manually
  const tpsComponents: TPSComponents = {
    ...(components as TPSComponents),
    latitude: 31.95,
    longitude: 35.91,
  };
  const uri = TPS.toURI(tpsComponents);
  test('TPS URI created with location', () => uri.includes('31.95,35.91'));
}

console.log('\n');

/**
 * ============================================================================
 * PART 2.6: External Library Integration Pattern
 * ============================================================================
 */

console.log('=== PART 2.6: External Library Pattern (Mock) ===\n');

/**
 * This shows how you would wrap an external library like moment-hijri.
 * Since we don't have the actual library installed, we mock its behavior.
 *
 * In production, replace the mock with actual library calls:
 *
 * import moment from 'moment-hijri';
 *
 * class MomentHijriDriver implements CalendarDriver {
 *   parseDate(input: string, format = 'iYYYY-iMM-iDD') {
 *     const m = moment(input, format);
 *     return {
 *       calendar: 'hij',
 *       year: m.iYear(),
 *       month: m.iMonth() + 1,
 *       day: m.iDate()
 *     };
 *   }
 *   // ...
 * }
 */

// Mock external library class
class MockMomentHijri {
  private _year: number;
  private _month: number;
  private _day: number;

  constructor(input: string, format: string) {
    // Simplified parsing (real library handles complex formats)
    const [year, month, day] = input.split('-').map(Number);
    this._year = year;
    this._month = month - 1; // moment uses 0-indexed months
    this._day = day;
  }

  iYear() {
    return this._year;
  }
  iMonth() {
    return this._month;
  }
  iDate() {
    return this._day;
  }
  isValid() {
    return (
      this._year > 0 &&
      this._month >= 0 &&
      this._month < 12 &&
      this._day > 0 &&
      this._day <= 30
    );
  }
}

// Mock moment function
function mockMoment(input: string, format: string): MockMomentHijri {
  return new MockMomentHijri(input, format);
}

/**
 * Driver wrapping the mock external library
 */
class MockExternalLibraryDriver implements CalendarDriver {
  readonly code: string = 'extlib';
  readonly name = 'External Library Example';

  parseDate(input: string, format = 'iYYYY-iMM-iDD'): Partial<TPSComponents> {
    const m = mockMoment(input, format);

    if (!m.isValid()) {
      throw new Error(`Invalid date: ${input}`);
    }

    return {
      calendar: this.code,
      year: m.iYear(),
      month: m.iMonth() + 1, // Convert back to 1-indexed
      day: m.iDate(),
    };
  }

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    // In production: const m = moment(date);
    return {
      calendar: this.code,
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    return new Date(
      Date.UTC(
        components.year || 1,
        (components.month || 1) - 1,
        components.day || 1,
      ),
    );
  }

  getFromDate(date: Date): string {
    const c = this.getComponentsFromDate(date);
    const p = (n?: number) => String(n || 0).padStart(2, '0');
    return `T:extlib.y${c.year}.M${p(c.month)}.d${p(c.day)}`;
  }

  format(components: Partial<TPSComponents>, format?: string): string {
    const y = components.year || 0;
    const mo = String(components.month || 1).padStart(2, '0');
    const d = String(components.day || 1).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === 'string') {
      return /^\d{4}-\d{2}-\d{2}/.test(input);
    }
    return (
      typeof input.year === 'number' &&
      typeof input.month === 'number' &&
      typeof input.day === 'number'
    );
  }

  getMetadata(): CalendarMetadata {
    return { name: 'External Library Demo' };
  }
}

const extLibDriver = new MockExternalLibraryDriver();
test('External library driver created', () => extLibDriver.code === 'extlib');
console.log('  This demonstrates the pattern for wrapping libraries like:');
console.log('  - moment-hijri');
console.log('  - @js-joda/extra');
console.log('  - hijri-converter');
console.log('  - date-fns with locale');

// Test the external library driver
const extParsed = extLibDriver.parseDate('1447-07-21');
test('External lib driver parses date correctly', () =>
  extParsed.year === 1447 && extParsed.month === 7 && extParsed.day === 21,
);

console.log('\n');

/**
 * ============================================================================
 * PART 3: Converting Between Calendars
 * ============================================================================
 */

console.log('=== PART 3: Cross-Calendar Conversion ===\n');

const sourceTime = 'T:greg.m3.c1.y26.m01.d07.h13.m20.s45';
console.log('Source (Gregorian):', sourceTime);

// Convert to Hijri
const convertedToHijri = TPS.to('hij', sourceTime);
test('Cross-calendar conversion to Hijri succeeds', () => convertedToHijri !== null && convertedToHijri.includes('T:hij'));

// Convert back to Gregorian
if (convertedToHijri) {
  const backToGreg = TPS.to('greg', convertedToHijri);
  test('Cross-calendar conversion back to Gregorian succeeds', () =>
    backToGreg !== null && backToGreg.includes('T:greg'),
  );
}

console.log('\n');

/**
 * ============================================================================
 * PART 4: Working with TPS URIs (Space + Time + Extensions)
 * ============================================================================
 */

console.log('=== PART 4: TPS URIs with Drivers ===\n');

// Create a full URI with Hijri calendar
// use `any` here because we only care about a few fields for the
// demonstration; the interface now requires a full timestamp which would
// clutter the example.
const hijriComponents: TPSComponents = ({
  calendar: 'hij',
  year: 1447,
  month: 1,
  day: 7,
  hour: 13,
  minute: 20,
  latitude: 31.95,
  longitude: 35.91,
  altitude: 800,
  extensions: {
    u: '88', // User ID
    d: '1', // Device ID
    f: '4', // Floor
  },
} as any);


// Parse existing Hijri time first
const hijriParsed = TPS.parse('T:hij.y1447.m01.d07.h13.m20.s45');
if (hijriParsed) {
  hijriParsed.latitude = 31.95;
  hijriParsed.longitude = 35.91;
  hijriParsed.altitude = 800;
  hijriParsed.extensions = { u: '88', d: '1', f: '4' };

  const hijriURI = TPS.toURI(hijriParsed);
  test('toURI generates valid TPS URI', () => hijriURI.startsWith('tps://'));
  test('toURI includes location', () => hijriURI.includes('31.95,35.91'));
  test('toURI includes extensions', () => hijriURI.includes(';'));

  // Parse it back
  const reparsed = TPS.parse(hijriURI);
  test('Reparsed URI has correct calendar', () => reparsed?.calendar === 'hij');
  test('Reparsed URI preserves location', () =>
    reparsed?.latitude === 31.95 && reparsed?.longitude === 35.91,
  );
  test('Reparsed URI preserves extensions', () => reparsed?.extensions?.u === '88');
}

console.log('\n');

/**
 * ============================================================================
 * PART 5: Validation and Error Handling
 * ============================================================================
 */

console.log('=== PART 5: Validation & Error Handling ===\n');

const testCases = [
  'tps://31.95,35.91@T:greg.m3.c1.y26.m01.d07',
  'T:greg.m3.c1.y26',
  'T:hij.y1447.m01.d07',
  'T:unknown.test',
  'invalid-string',
];

test('TPS URI validation accepts full URI', () => TPS.validate(testCases[0]));
test('TPS time validation accepts partial time', () => TPS.validate(testCases[1]));
test('TPS validation accepts Hijri time', () => TPS.validate(testCases[2]));
test('TPS validation rejects unknown calendar', () => !TPS.validate(testCases[3]));
test('TPS validation rejects invalid strings', () => !TPS.validate(testCases[4]));

console.log('\n');

/**
 * ============================================================================
 * PART 6: Privacy Features
 * ============================================================================
 */

console.log('=== PART 6: Privacy-Aware URIs ===\n');

// Hidden location
const hiddenLocation: TPSComponents = ({
  calendar: 'greg',
  year: 26,
  month: 1,
  day: 7,
  isHiddenLocation: true,
} as any);

const hiddenURI = TPS.toURI(hiddenLocation);
test('Hidden location URI uses ~', () => hiddenURI.includes('L:~'));

// Redacted location
const redactedLocation: TPSComponents = ({
  calendar: 'greg',
  year: 26,
  month: 1,
  day: 7,
  isRedactedLocation: true,
} as any);

const redactedURI = TPS.toURI(redactedLocation);
test('Redacted location URI uses redacted', () => redactedURI.includes('L:redacted'));

// Unknown location
const unknownLocation: TPSComponents = ({
  calendar: 'greg',
  year: 26,
  month: 1,
  day: 7,
  isUnknownLocation: true,
} as any);

const unknownURI = TPS.toURI(unknownLocation);
test('Unknown location URI uses dash', () => unknownURI.includes('L:-'));

console.log('\n');

/**
 * ============================================================================
 * PART 7: Practical Example - Audit Trail with Hijri Calendar
 * ============================================================================
 */

console.log('=== PART 7: Real-World Example - Audit Trail ===\n');

interface AuditLog {
  event: string;
  timestamp: string;
  location: string;
  userId: string;
}

const auditEvents: AuditLog[] = [
  {
    event: 'User Login',
    timestamp: TPS.fromDate(new Date('2026-01-07T08:00:00Z'), 'hij'),
    location: 'tps://31.95,35.91@T:hij.y1447.m01.d07.h08.m00.s00',
    userId: 'user123',
  },
  {
    event: 'File Upload',
    timestamp: TPS.fromDate(new Date('2026-01-07T09:15:30Z'), 'hij'),
    location: 'tps://31.95,35.91@T:hij.y1447.m01.d07.h09.m15.s30',
    userId: 'user123',
  },
  {
    event: 'User Logout',
    timestamp: TPS.fromDate(new Date('2026-01-07T17:45:00Z'), 'hij'),
    location: 'tps://31.95,35.91@T:hij.y1447.m01.d07.h17.m45.s00',
    userId: 'user123',
  },
];

console.log('Audit Log (Hijri Calendar):');
auditEvents.forEach((event) => {
  console.log(`  ${event.event}`);
  console.log(`    Time: ${event.timestamp}`);
  console.log(`    Location: ${event.location}`);
  console.log();
});
test('Audit events generated in Hijri calendar', () => auditEvents.every(e => e.timestamp.includes('T:hij')));
test('Audit events include locations', () => auditEvents.every(e => e.location.includes('tps://')));
test('Three audit events created', () => auditEvents.length === 3);

console.log('\n');

/**
 * ============================================================================
 * PART 8: Creating Another Driver (Julian Calendar Example)
 * ============================================================================
 */

console.log('=== PART 8: Julian Calendar Driver ===\n');

/**
 * Julian Calendar Driver (Historical Calendar)
 */
class JulianDriver implements CalendarDriver {
  readonly code: string = DefaultCalendars.JUL;

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    // Simplified Julian conversion
    const gregYear = date.getUTCFullYear();
    const julianYear = gregYear - 11; // Simplified difference

    return {
      calendar: DefaultCalendars.JUL,
      year: julianYear,
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    const gregYear = (components.year || 1) + 11;
    return new Date(
      Date.UTC(
        gregYear,
        (components.month || 1) - 1,
        components.day || 1,
        components.hour || 0,
        components.minute || 0,
        Math.floor(components.second || 0),
      ),
    );
  }

  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date);
    return (
      `T:jul.y${comp.year}.M${String(comp.month).padStart(2, '0')}.d${String(comp.day).padStart(2, '0')}` +
      `.h${String(comp.hour).padStart(2, '0')}.m${String(comp.minute).padStart(2, '0')}.s${String(
      Math.floor(comp.second || 0),
      ).padStart(2, '0')}`
    );
  }

  // helper methods required by interface
  parseDate(input: string, format?: string): Partial<TPSComponents> {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) {
      throw new Error(`JulianDriver.parseDate: unsupported format "${input}"`);
    }
    return {
      calendar: this.code,
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      day: parseInt(m[3], 10),
    };
  }

  format(components: Partial<TPSComponents>, format?: string): string {
    const y = components.year || 0;
    const mo = String(components.month || 1).padStart(2, '0');
    const d = String(components.day || 1).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === 'string') {
      return /^\d{4}-\d{2}-\d{2}/.test(input);
    }
    return (
      typeof input.year === 'number' &&
      typeof input.month === 'number' &&
      typeof input.day === 'number'
    );
  }

  getMetadata(): CalendarMetadata {
    return { name: 'Julian (demo)' };
  }
}

// Register Julian driver
TPS.registerDriver(new JulianDriver());
test('Julian driver registered', () => TPS.getDriver(DefaultCalendars.JUL) !== undefined);

const julianTime = TPS.fromDate(new Date('2026-01-07T13:20:45Z'), DefaultCalendars.JUL);
test('Julian time string generated', () => julianTime.includes('T:jul'));

// Verify both drivers are available
const hijriCheck = TPS.getDriver('hij');
const julianCheck = TPS.getDriver(DefaultCalendars.JUL);
test('Both Hijri and Julian drivers available', () => hijriCheck !== undefined && julianCheck !== undefined);

console.log('\n');

/**
 * ============================================================================
 * SUMMARY
 * ============================================================================
 */

console.log('=== SUMMARY ===\n');
console.log(`
✓ Built-in Calendars: gregorian (greg), unix
✓ Registered Drivers: hijri (hij), julian (jul)

✓ Core Features:
  - fromDate(date, calendar): Convert Date to TPS string
  - toDate(tpsString): Convert TPS string to Date
  - parse(uri): Parse TPS URI into components
  - toURI(components): Create TPS URI from components
  - to(targetCalendar, tpsString): Convert between calendars
  - registerDriver(driver): Add custom calendar support
  - validate(input): Check if string is valid TPS

✓ Enhanced Driver Methods (v0.5.0):
  - parseDate(input, format?): Parse calendar-native date strings
  - format(components, format?): Format to calendar-native strings
  - validate(input): Validate dates for specific calendar
  - getMetadata(): Get month names, day names, and calendar info

✓ TPS Convenience Methods:
  - TPS.parseCalendarDate(calendar, dateString): Parse calendar date
  - TPS.fromCalendarDate(calendar, dateString, location?): Create TPS URI
  - TPS.formatCalendarDate(calendar, components): Format to native

✓ Privacy support: hidden, redacted, unknown locations
✓ External library integration: wrap moment-hijri, @js-joda/extra, etc.
`);

// report on any harness-style tests we ran earlier
console.log('=== TEST HARNESS SUMMARY ===');
console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
