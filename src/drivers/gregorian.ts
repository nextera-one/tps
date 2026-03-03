import { CalendarDriver, TPSComponents, TimeOrder, TPS, CalendarMetadata } from '../index';

/**
 * Gregorian calendar driver.
 * This mirrors the built-in logic that used to live in `TPS.fromDate`/`toDate`
 * and provides implementations for the full `CalendarDriver` interface.
 * The driver also implements the optional helpers, enabling unit tests to
 * exercise `parseDate`, `format`, `validate`, and `getMetadata`.
 */
export class GregorianDriver implements CalendarDriver {
  readonly code: string = 'greg';

  getComponentsFromDate(date: Date): Partial<TPSComponents> {
    const fullYear = date.getUTCFullYear();
    return {
      calendar: this.code,
      millennium: Math.floor(fullYear / 1000) + 1,
      century: Math.floor((fullYear % 1000) / 100) + 1,
      year: fullYear % 100,
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      millisecond: date.getUTCMilliseconds(),
    };
  }

  getDateFromComponents(components: Partial<TPSComponents>): Date {
    const m = components.millennium || 0;
    const c = components.century || 1;
    const y = components.year || 0;
    const fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;

    return new Date(
      Date.UTC(
        fullYear,
        (components.month || 1) - 1,
        components.day || 1,
        components.hour || 0,
        components.minute || 0,
        Math.floor(components.second || 0),
        components.millisecond ?? Math.round(((components.second || 0) % 1) * 1000),
      ),
    );
  }

  getFromDate(date: Date): string {
    const comp = this.getComponentsFromDate(date) as TPSComponents;
    // buildTimePart understands the `order` field if the caller has set it
    return TPS.buildTimePart(comp);
  }

  // --- optional helpers --------------------------------------------------

  parseDate(input: string, format?: string): Partial<TPSComponents> {
    // Accept ISO-like formats: "YYYY-MM-DD" and optionally time portion
    const s = input.trim();
    // simple regex - not exhaustive
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/);
    if (!m) {
      throw new Error(`GregorianDriver.parseDate: unsupported format "${input}"`);
    }
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    const hour = m[4] !== undefined ? parseInt(m[4], 10) : undefined;
    const minute = m[5] !== undefined ? parseInt(m[5], 10) : undefined;
    const second = m[6] !== undefined ? parseInt(m[6], 10) : undefined;
    const millisecond = m[7] !== undefined ? parseInt((m[7] + '000').slice(0, 3), 10) : undefined;

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

  format(components: Partial<TPSComponents>, format?: string): string {
    // For simplicity we ignore `format` and always produce ISO-ish string
    const y = components.year !== undefined ? String(components.year).padStart(4, '0') : '0000';
    const mo = components.month !== undefined ? String(components.month).padStart(2, '0') : '01';
    const d = components.day !== undefined ? String(components.day).padStart(2, '0') : '01';
    let out = `${y}-${mo}-${d}`;
    if (
      components.hour !== undefined ||
      components.minute !== undefined ||
      components.second !== undefined ||
      components.millisecond !== undefined
    ) {
      const h = components.hour !== undefined ? String(components.hour).padStart(2, '0') : '00';
      const mi = components.minute !== undefined ? String(components.minute).padStart(2, '0') : '00';
      const s = components.second !== undefined ? String(Math.floor(components.second)).padStart(2, '0') : '00';
      const ms = components.millisecond !== undefined ? String(components.millisecond).padStart(3, '0') : '000';
      out += `T${h}:${mi}:${s}.${ms}`;
    }
    return out;
  }

  validate(input: string | Partial<TPSComponents>): boolean {
    if (typeof input === 'string') {
      // basic ISO date with optional time and fractional seconds
      return /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/.test(
        input.trim(),
      );
    }
    if (typeof input === 'object') {
      return (
        input.year !== undefined &&
        input.month !== undefined &&
        input.day !== undefined &&
        input.year >= 0 &&
        input.month >= 1 &&
        input.month <= 12 &&
        input.day >= 1 &&
        input.day <= 31
      );
    }
    return false;
  }

  getMetadata(): CalendarMetadata {
    return {
      name: 'Gregorian',
      monthNames: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ],
      dayNames: [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ],
      monthsPerYear: 12,
      epochYear: 1,
    };
  }
}
