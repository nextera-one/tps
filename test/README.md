# Test Folder Contents

This folder contains comprehensive guides and examples for using TPS calendar drivers.

## Files

### 1. `DRIVER_GUIDE.md`

A complete guide on how to create, register, and use custom calendar drivers.

**Topics covered:**

- Basic usage of built-in calendars
- Creating custom drivers (step-by-step)
- Driver implementation checklist
- Registering drivers with TPS
- Converting between calendars
- Real-world examples
- Best practices
- Troubleshooting

### 2. `driver-usage.test.ts`

Comprehensive executable examples demonstrating all driver functionality.

**What it shows:**

- Part 1: Built-in calendars (Gregorian, Unix)
- Part 2: Creating a custom Hijri driver
- Part 3: Cross-calendar conversion
- Part 4: TPS URIs with drivers
- Part 5: Validation and error handling
- Part 6: Privacy-aware URIs
- Part 7: Real-world audit trail example
- Part 8: Creating a Julian driver

## Running the Tests

```bash
# Install dependencies (if not done)
npm install

# Run the test file to see output
npx ts-node test/driver-usage.test.ts

# Or compile and run
npx tsc test/driver-usage.test.ts
node test/driver-usage.test.js
```

## Quick Start

### To create a custom calendar driver:

1. Read [DRIVER_GUIDE.md](./DRIVER_GUIDE.md)
2. Look at examples in [driver-usage.test.ts](./driver-usage.test.ts)
3. Follow the checklist in "Driver Implementation Checklist"
4. Implement the `CalendarDriver` interface
5. Test your driver against edge cases
6. Register with `TPS.registerDriver()`

### Example minimal driver:

```typescript
import { CalendarDriver, TPSComponents, CalendarCode } from "../src/index";

class MyDriver implements CalendarDriver {
  readonly code: CalendarCode = "custom";

  fromGregorian(date: Date): Partial<TPSComponents> {
    // Convert Date to your calendar system
    return { year: 2026, month: 1, day: 7 };
  }

  toGregorian(components: Partial<TPSComponents>): Date {
    // Convert your calendar back to Date
    return new Date("2026-01-07T00:00:00Z");
  }

  fromDate(date: Date): string {
    const comp = this.fromGregorian(date);
    return `T:custom.y${comp.year}.M${comp.month}.d${comp.day}`;
  }
}

// Register and use
TPS.registerDriver(new MyDriver());
const time = TPS.fromDate(new Date(), "custom");
```

## Key Concepts

### Calendar Driver Interface

```typescript
interface CalendarDriver {
  readonly code: CalendarCode;
  fromGregorian(date: Date): Partial<TPSComponents>;
  toGregorian(components: Partial<TPSComponents>): Date;
  fromDate(date: Date): string;
}
```

### Three Conversion Methods

1. **fromGregorian()** - Convert a JS Date → Your calendar components
2. **toGregorian()** - Convert your components → JS Date
3. **fromDate()** - Convenience: Date → TPS time string in your calendar

### The Conversion Pipeline

```
Your Calendar → Gregorian Date → Another Calendar
                   ↓
              (Gregorian is always the hub)
```

## Built-in Calendars (No Driver Needed)

- `greg` - Gregorian calendar (default)
- `unix` - Unix epoch seconds

## Example Drivers (In Tests)

- `hij` - Hijri (Islamic) calendar
- `jul` - Julian (historical) calendar

## Common Patterns

### Converting to Multiple Calendars

```typescript
const date = new Date();
const greg = TPS.fromDate(date, "greg");
const hijri = TPS.fromDate(date, "hij");
const unix = TPS.fromDate(date, "unix");
```

### Round-trip Conversion

```typescript
const original = new Date();
const timeStr = TPS.fromDate(original, "greg");
const restored = TPS.toDate(timeStr);
// Approximately equal (may lose milliseconds)
```

### With Location Data

```typescript
const time = TPS.fromDate(new Date(), "hij");
const components = TPS.parse(time);
if (components) {
  components.latitude = 31.95;
  components.longitude = 35.91;
  const uri = TPS.toURI(components);
  // "tps://31.95,35.91@T:hij.y1447..."
}
```

## Support for Privacy Flags

When creating URIs, you can mask location data:

```typescript
// Exact coordinates
{ latitude: 31.95, longitude: 35.91 }
// → "tps://31.95,35.91@T:..."

// Hidden (user choice)
{ isHiddenLocation: true }
// → "tps://hidden@T:..."

// Redacted (legal/security)
{ isRedactedLocation: true }
// → "tps://redacted@T:..."

// Unknown (technical failure)
{ isUnknownLocation: true }
// → "tps://unknown@T:..."
```

## Testing Your Driver

Verify these work:

```typescript
// 1. Basic conversion
const comp = driver.fromGregorian(new Date());
console.log("Has year:", comp.year !== undefined);

// 2. Round trip
const date = new Date("2026-01-07T13:20:45Z");
const comp = driver.fromGregorian(date);
const restored = driver.toGregorian(comp);
console.log("Same year:", date.getUTCFullYear() === restored.getUTCFullYear());

// 3. String generation
const str = driver.fromDate(date);
console.log("Valid format:", str.startsWith("T:"));

// 4. Registration
TPS.registerDriver(driver);
const retrieved = TPS.getDriver(driver.code);
console.log("Registered:", retrieved !== undefined);
```

## Next Steps

1. ✅ Read the [README.md](../README.md) for API reference
2. ✅ Read [DRIVER_GUIDE.md](./DRIVER_GUIDE.md) for detailed instructions
3. ✅ Review [driver-usage.test.ts](./driver-usage.test.ts) for examples
4. ✅ Create your own driver
5. ✅ Write tests for edge cases
6. ✅ Share your driver with the community!

---

**Version:** 0.4.2  
**License:** Apache-2.0 — see [../LICENSE](../LICENSE).
