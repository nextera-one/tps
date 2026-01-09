# TPS Driver Guide

## How to Use the Driver

This guide shows you how to work with TPS calendar drivers, including the enhanced interface for parsing calendar-specific date strings and integrating external libraries.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Creating Custom Drivers](#creating-custom-drivers)
3. [Enhanced Driver Methods](#enhanced-driver-methods)
4. [Parsing Calendar Date Strings](#parsing-calendar-date-strings)
5. [Wrapping External Libraries](#wrapping-external-libraries)
6. [Registering Drivers](#registering-drivers)
7. [Converting Between Calendars](#converting-between-calendars)
8. [Real-World Examples](#real-world-examples)

---

## Basic Usage

### Using Built-in Calendars

TPS has built-in support for Gregorian and Unix calendars (no driver needed):

```typescript
import { TPS } from "@nextera.one/tps-standard";

// Gregorian Calendar (default)
const gregTime = TPS.fromDate(new Date(), "greg");
console.log(gregTime);
// "T:greg.m3.c1.y26.M01.d07.h13.n20.s45"

// Unix Epoch
const unixTime = TPS.fromDate(new Date(), "unix");
console.log(unixTime);
// "T:unix.s1704729645.123"

// Convert back to Date
const date = TPS.toDate(gregTime);
console.log(date); // Date object
```

---

## Creating Custom Drivers

To add support for other calendars, create a driver implementing the `CalendarDriver` interface:

```typescript
import {
  CalendarDriver,
  TPSComponents,
  CalendarCode,
} from "@nextera.one/tps-standard";

class HijriDriver implements CalendarDriver {
  readonly code: CalendarCode = "hij";
  readonly name = "Hijri (Islamic)"; // Optional human-readable name

  /**
   * Convert Gregorian Date to Hijri components
   */
  fromGregorian(date: Date): Partial<TPSComponents> {
    const gregYear = date.getUTCFullYear();

    // Apply Hijri conversion algorithm
    // (This is simplified - use proper algorithms for production)
    const hijYear = Math.floor((gregYear - 622) * 1.03);

    return {
      calendar: "hij",
      year: hijYear,
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }

  /**
   * Convert Hijri components back to Gregorian Date
   */
  toGregorian(components: Partial<TPSComponents>): Date {
    const hijYear = components.year || 1;
    const gregYear = Math.floor(hijYear / 1.03 + 622);

    return new Date(
      Date.UTC(
        gregYear,
        (components.month || 1) - 1,
        components.day || 1,
        components.hour || 0,
        components.minute || 0,
        Math.floor(components.second || 0)
      )
    );
  }

  /**
   * Generate TPS time string
   */
  fromDate(date: Date): string {
    const comp = this.fromGregorian(date);
    const pad = (n?: number) => String(n || 0).padStart(2, "0");
    return (
      `T:hij.y${comp.year}` +
      `.M${pad(comp.month)}` +
      `.d${pad(comp.day)}` +
      `.h${pad(comp.hour)}` +
      `.n${pad(comp.minute)}` +
      `.s${pad(Math.floor(comp.second || 0))}`
    );
  }
}
```

### Driver Implementation Checklist

**Required Methods:**

- [ ] Implement `CalendarDriver` interface
- [ ] Set `readonly code` property
- [ ] Implement `fromGregorian()` method
- [ ] Implement `toGregorian()` method
- [ ] Implement `fromDate()` method

**Optional Enhanced Methods:**

- [ ] Implement `parseDate()` - Parse calendar-native date strings
- [ ] Implement `format()` - Format components to calendar-native strings
- [ ] Implement `validate()` - Validate dates for this calendar
- [ ] Implement `getMetadata()` - Provide month names, etc.

**Best Practices:**

- [ ] Use proper conversion algorithms (not simplified versions)
- [ ] Handle edge cases and invalid inputs
- [ ] Add unit tests

---

## Enhanced Driver Methods

The `CalendarDriver` interface includes optional enhanced methods for better usability:

```typescript
export interface CalendarDriver {
  // Required
  readonly code: CalendarCode;
  fromGregorian(date: Date): Partial<TPSComponents>;
  toGregorian(components: Partial<TPSComponents>): Date;
  fromDate(date: Date): string;

  // Optional Enhanced Methods
  readonly name?: string;
  parseDate?(input: string, format?: string): Partial<TPSComponents>;
  format?(components: Partial<TPSComponents>, format?: string): string;
  validate?(input: string | Partial<TPSComponents>): boolean;
  getMetadata?(): CalendarMetadata;
}

export interface CalendarMetadata {
  name: string;
  monthNames?: string[];
  monthNamesShort?: string[];
  dayNames?: string[];
  dayNamesShort?: string[];
  isLunar?: boolean;
  monthsPerYear?: number;
  epochYear?: number;
}
```

---

## Parsing Calendar Date Strings

### The `parseDate()` Method

Implement `parseDate()` to parse calendar-native date strings like `'1447-07-21'`:

```typescript
class HijriDriver implements CalendarDriver {
  readonly code: CalendarCode = "hij";
  readonly name = "Hijri (Islamic)";

  /**
   * Parse a Hijri date string into TPS components
   * Supports formats like:
   * - '1447-07-21' (date only)
   * - '1447-07-21 14:30:00' (date and time)
   */
  parseDate(input: string, format?: string): Partial<TPSComponents> {
    // Handle different formats
    const parts = input.trim().split(/[\s,T]+/);
    const datePart = parts[0];
    const timePart = parts[1];

    const [year, month, day] = datePart.split("-").map(Number);

    const result: Partial<TPSComponents> = {
      calendar: "hij",
      year,
      month,
      day,
    };

    // Parse time if provided
    if (timePart) {
      const [hour, minute, second] = timePart.split(":").map(Number);
      result.hour = hour || 0;
      result.minute = minute || 0;
      result.second = second || 0;
    }

    return result;
  }

  /**
   * Format TPS components to a Hijri date string
   */
  format(components: Partial<TPSComponents>, format?: string): string {
    const pad = (n?: number) => String(n || 0).padStart(2, "0");

    if (format === "short") {
      return `${components.day}/${components.month}/${components.year}`;
    }

    // Default ISO-like format
    return `${components.year}-${pad(components.month)}-${pad(components.day)}`;
  }

  // ... other required methods
}
```

### Using `parseDate()` via TPS

Once your driver implements `parseDate()`, you can use TPS convenience methods:

```typescript
// Register the driver
TPS.registerDriver(new HijriDriver());

// Parse a Hijri date string
const components = TPS.parseCalendarDate("hij", "1447-07-21");
console.log(components);
// { calendar: 'hij', year: 1447, month: 7, day: 21 }

// Convert directly to TPS URI with location
const uri = TPS.fromCalendarDate("hij", "1447-07-21", {
  latitude: 31.95,
  longitude: 35.91,
});
console.log(uri);
// "tps://31.95,35.91@T:hij.y1447.M07.d21"

// With privacy flag
const hiddenUri = TPS.fromCalendarDate("hij", "1447-07-21", {
  isHiddenLocation: true,
});
console.log(hiddenUri);
// "tps://hidden@T:hij.y1447.M07.d21"

// Format TPS components back to calendar-native string
const parsed = TPS.parse("tps://unknown@T:hij.y1447.M07.d21");
const formatted = TPS.formatCalendarDate("hij", parsed!);
console.log(formatted);
// "1447-07-21"
```

---

## Wrapping External Libraries

### Example: Using `moment-hijri`

Wrap external date libraries for accurate calendar conversions:

```typescript
import moment from "moment-hijri";
import {
  CalendarDriver,
  TPSComponents,
  CalendarCode,
  CalendarMetadata,
} from "@nextera.one/tps-standard";

class MomentHijriDriver implements CalendarDriver {
  readonly code: CalendarCode = "hij";
  readonly name = "Hijri (Islamic)";

  /**
   * Parse Hijri date string using moment-hijri
   */
  parseDate(input: string, format = "iYYYY-iMM-iDD"): Partial<TPSComponents> {
    const m = moment(input, format);

    if (!m.isValid()) {
      throw new Error(`Invalid Hijri date: ${input}`);
    }

    return {
      calendar: "hij",
      year: m.iYear(),
      month: m.iMonth() + 1,
      day: m.iDate(),
      hour: m.hour(),
      minute: m.minute(),
      second: m.second(),
    };
  }

  /**
   * Format components to Hijri date string
   */
  format(components: Partial<TPSComponents>, format = "iYYYY-iMM-iDD"): string {
    const m = moment()
      .iYear(components.year || 1)
      .iMonth((components.month || 1) - 1)
      .iDate(components.day || 1);

    return m.format(format);
  }

  /**
   * Validate Hijri date
   */
  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === "string") {
      return moment(input, "iYYYY-iMM-iDD").isValid();
    }

    // Validate components
    const { year, month, day } = input;
    if (!year || !month || !day) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 30) return false;

    return true;
  }

  /**
   * Get Hijri calendar metadata
   */
  getMetadata(): CalendarMetadata {
    return {
      name: "Hijri (Islamic)",
      monthNames: [
        "Muharram",
        "Safar",
        "Rabi' al-Awwal",
        "Rabi' al-Thani",
        "Jumada al-Awwal",
        "Jumada al-Thani",
        "Rajab",
        "Sha'ban",
        "Ramadan",
        "Shawwal",
        "Dhu al-Qi'dah",
        "Dhu al-Hijjah",
      ],
      monthNamesShort: [
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
        "Dhul Q",
        "Dhul H",
      ],
      isLunar: true,
      monthsPerYear: 12,
      epochYear: 622,
    };
  }

  fromGregorian(date: Date): Partial<TPSComponents> {
    const m = moment(date);
    return {
      calendar: "hij",
      year: m.iYear(),
      month: m.iMonth() + 1,
      day: m.iDate(),
      hour: m.hour(),
      minute: m.minute(),
      second: m.second(),
    };
  }

  toGregorian(components: Partial<TPSComponents>): Date {
    const m = moment()
      .iYear(components.year || 1)
      .iMonth((components.month || 1) - 1)
      .iDate(components.day || 1)
      .hour(components.hour || 0)
      .minute(components.minute || 0)
      .second(Math.floor(components.second || 0));

    return m.toDate();
  }

  fromDate(date: Date): string {
    const c = this.fromGregorian(date);
    const p = (n?: number) => String(n || 0).padStart(2, "0");
    return `T:hij.y${c.year}.M${p(c.month)}.d${p(c.day)}.h${p(c.hour)}.n${p(
      c.minute
    )}.s${p(c.second)}`;
  }
}
```

### Example: Using `@js-joda/extra`

```typescript
import { HijrahChronology, HijrahDate } from "@js-joda/extra";

class JodaHijriDriver implements CalendarDriver {
  readonly code: CalendarCode = "hij";

  parseDate(input: string): Partial<TPSComponents> {
    const hijrahDate = HijrahDate.parse(input);
    return {
      calendar: "hij",
      year: hijrahDate.year(),
      month: hijrahDate.monthValue(),
      day: hijrahDate.dayOfMonth(),
    };
  }

  // ... other methods using js-joda
}
```

---

## Registering Drivers

Once you create a driver, register it with TPS:

```typescript
// Create instance
const hijriDriver = new HijriDriver();

// Register with TPS
TPS.registerDriver(hijriDriver);

// Now it's available for all operations
const hijriTime = TPS.fromDate(new Date(), "hij");
console.log(hijriTime);
// "T:hij.y1447.M01.d07.h13.n20.s45"

// Use convenience methods if parseDate is implemented
const components = TPS.parseCalendarDate("hij", "1447-07-21");
const uri = TPS.fromCalendarDate("hij", "1447-07-21", {
  latitude: 31.95,
  longitude: 35.91,
});

// Retrieve the registered driver
const driver = TPS.getDriver("hij");
if (driver) {
  console.log(`Driver registered: ${driver.name || driver.code}`);

  // Use driver methods directly
  if (driver.parseDate) {
    const comp = driver.parseDate("1447-07-21");
    console.log(comp);
  }

  if (driver.getMetadata) {
    const meta = driver.getMetadata();
    console.log("Month names:", meta.monthNames);
  }
}
```

---

## Converting Between Calendars

Once multiple drivers are registered, you can convert between calendars:

```typescript
// Register both Gregorian (built-in) and Hijri drivers
TPS.registerDriver(new HijriDriver());

// Start with a Gregorian time
const gregTime = "T:greg.m3.c1.y26.M01.d07.h13.n20.s45";

// Convert to Hijri
const hijriTime = TPS.to("hij", gregTime);
console.log(hijriTime);
// "T:hij.y1447.M01.d07.h13.n20.s45"

// Convert back to Gregorian
const backToGreg = TPS.to("greg", hijriTime);
console.log(backToGreg);
// "T:greg.m3.c1.y26.M01.d07.h13.n20.s45"

// The conversion always goes through a Gregorian Date internally:
// Source Calendar → Gregorian Date → Target Calendar
```

---

## Real-World Examples

### Example 1: Multi-Calendar Audit Log

Track events in multiple calendar systems:

```typescript
class AuditLogger {
  constructor() {
    // Register all supported calendars
    TPS.registerDriver(new HijriDriver());
    TPS.registerDriver(new JulianDriver());
  }

  logEvent(event: string, calendar: "greg" | "hij" | "jul" = "greg") {
    const timestamp = TPS.fromDate(new Date(), calendar);
    console.log(`[${calendar.toUpperCase()}] ${timestamp} - ${event}`);
  }
}

const logger = new AuditLogger();
logger.logEvent("User logged in", "greg");
logger.logEvent("User logged in", "hij");
logger.logEvent("User logged in", "jul");
```

### Example 2: Location + Time from Calendar Date String

```typescript
// Register driver with parseDate support
TPS.registerDriver(new HijriDriver());

// Create TPS URI from a Hijri date string
function createEventFromHijriDate(
  hijriDate: string,
  lat: number,
  lon: number
): string {
  return TPS.fromCalendarDate("hij", hijriDate, {
    latitude: lat,
    longitude: lon,
  });
}

const eventUri = createEventFromHijriDate("1447-07-21", 31.95, 35.91);
console.log(eventUri);
// "tps://31.95,35.91@T:hij.y1447.M07.d21"
```

### Example 3: Privacy-Aware Location Tracking

Use privacy flags while maintaining calendar flexibility:

```typescript
function trackWithPrivacy(
  calendarDate: string,
  calendar: CalendarCode,
  lat: number | null,
  lon: number | null,
  privacyMode: "open" | "hidden" | "redacted" = "open"
): string {
  const location: any = {};

  if (privacyMode === "open" && lat && lon) {
    location.latitude = lat;
    location.longitude = lon;
  } else if (privacyMode === "hidden") {
    location.isHiddenLocation = true;
  } else if (privacyMode === "redacted") {
    location.isRedactedLocation = true;
  }

  return TPS.fromCalendarDate(calendar, calendarDate, location);
}

// Usage
console.log(trackWithPrivacy("1447-07-21", "hij", 31.95, 35.91, "open"));
// "tps://31.95,35.91@T:hij.y1447.M07.d21"

console.log(trackWithPrivacy("1447-07-21", "hij", null, null, "hidden"));
// "tps://hidden@T:hij.y1447.M07.d21"

console.log(trackWithPrivacy("1447-07-21", "hij", null, null, "redacted"));
// "tps://redacted@T:hij.y1447.M07.d21"
```

### Example 4: Calendar Metadata for UI

```typescript
TPS.registerDriver(new MomentHijriDriver());

const driver = TPS.getDriver("hij");
if (driver?.getMetadata) {
  const meta = driver.getMetadata();

  // Use in a dropdown
  console.log("Calendar:", meta.name);
  console.log("Months:", meta.monthNames);
  console.log("Is Lunar:", meta.isLunar);

  // Render month selector
  meta.monthNames?.forEach((name, index) => {
    console.log(`<option value="${index + 1}">${name}</option>`);
  });
}
```

---

## Best Practices

1. **Use UTC Internally** - Always work with UTC dates, apply timezone conversions as display logic
2. **Validate Input** - Check for null/undefined components in conversion methods
3. **Implement `parseDate()`** - Makes it easy to work with calendar-native date strings
4. **Implement `validate()`** - Prevents invalid dates from being processed
5. **Use External Libraries** - For production, use battle-tested libraries like `moment-hijri`
6. **Test Edge Cases** - Leap years, month boundaries, century changes
7. **Document Algorithms** - Include references to conversion formulas
8. **Performance** - Cache driver instances, don't recreate them frequently
9. **Error Handling** - Return null or throw descriptive errors for invalid input
10. **Type Safety** - Use proper TypeScript types for all components

---

## Troubleshooting

### Driver Not Found Error

```typescript
// ❌ Wrong - driver not registered
const time = TPS.fromDate(new Date(), "hij");
// Error: Calendar driver 'hij' not implemented

// ✅ Correct - register first
TPS.registerDriver(new HijriDriver());
const time = TPS.fromDate(new Date(), "hij");
```

### parseDate Not Implemented Error

```typescript
// ❌ Wrong - driver doesn't implement parseDate
const comp = TPS.parseCalendarDate("hij", "1447-07-21");
// Error: Driver 'hij' does not implement parseDate()

// ✅ Correct - implement parseDate in your driver
class HijriDriver implements CalendarDriver {
  parseDate(input: string): Partial<TPSComponents> {
    const [year, month, day] = input.split("-").map(Number);
    return { calendar: "hij", year, month, day };
  }
  // ...
}
```

### Invalid Parse Results

```typescript
// ❌ Wrong - invalid calendar code
const result = TPS.parse("T:invalid.m3.c1.y26");
// Returns null

// ✅ Correct - use registered calendar
const result = TPS.parse("T:greg.m3.c1.y26");
// Returns TPSComponents
```

### Conversion Accuracy

```typescript
// Note: Conversions may not be perfectly reversible due to rounding
const original = new Date("2026-01-07T13:20:45.123Z");
const gregTime = TPS.fromDate(original, "greg");
const back = TPS.toDate(gregTime);
// May lose milliseconds due to TPS second precision
```

---

## See Also

- [TPS Specification](../README.md)
- [API Reference](../README.md#-api-reference)
- [TPS-UID Documentation](../README.md#-tps-uid--temporal-positioning-identifier)
- [Examples](./driver-usage.test.ts)
