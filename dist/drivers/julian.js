"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JulianDriver = void 0;
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
const index_1 = require("../index");
class JulianDriver {
    constructor() {
        this.code = "jul";
        this.name = "Julian Calendar";
        this.MONTH_NAMES = [
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
        this.MONTH_NAMES_SHORT = [
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
        this.DAYS_IN_MONTH = [
            31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
        ];
    }
    // ── CalendarDriver interface ──────────────────────────────────────────
    getComponentsFromDate(date) {
        const jdn = this.gregorianToJdn(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
        const { jy, jm, jd } = this.jdnToJulian(jdn);
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
    getDateFromComponents(components) {
        let fullYear;
        if (components.millennium !== undefined) {
            const m = components.millennium ?? 0;
            const c = components.century ?? 1;
            const y = components.year ?? 0;
            fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;
        }
        else {
            fullYear = components.year ?? 1;
        }
        const jm = components.month ?? 1;
        const jd = components.day ?? 1;
        const jdn = this.julianToJdn(fullYear, jm, jd);
        const { gy, gm, gd } = this.jdnToGregorian(jdn);
        return new Date(Date.UTC(gy, gm - 1, gd, components.hour ?? 0, components.minute ?? 0, Math.floor(components.second ?? 0), components.millisecond ?? 0));
    }
    getFromDate(date) {
        const comp = this.getComponentsFromDate(date);
        return index_1.TPS.buildTimePart(comp);
    }
    parseDate(input, format) {
        const trimmed = input.trim();
        const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/);
        if (!m) {
            throw new Error(`JulianDriver.parseDate: unsupported format "${input}"`);
        }
        const fullYear = parseInt(m[1], 10);
        const result = {
            calendar: this.code,
            millennium: Math.floor(fullYear / 1000) + 1,
            century: Math.floor((fullYear % 1000) / 100) + 1,
            year: fullYear % 100,
            month: parseInt(m[2], 10),
            day: parseInt(m[3], 10),
        };
        if (m[4] !== undefined)
            result.hour = parseInt(m[4], 10);
        if (m[5] !== undefined)
            result.minute = parseInt(m[5], 10);
        if (m[6] !== undefined)
            result.second = parseInt(m[6], 10);
        if (m[7] !== undefined)
            result.millisecond = parseInt((m[7] + "000").slice(0, 3), 10);
        return result;
    }
    format(components, format) {
        const pad = (n, w = 2) => String(n ?? 0).padStart(w, "0");
        let fullYear;
        if (components.millennium !== undefined) {
            const m = components.millennium ?? 0;
            const c = components.century ?? 1;
            const y = components.year ?? 0;
            fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;
        }
        else {
            fullYear = components.year ?? 0;
        }
        let out = `${pad(fullYear, 4)}-${pad(components.month)}-${pad(components.day)}`;
        if (components.hour !== undefined ||
            components.minute !== undefined ||
            components.second !== undefined ||
            components.millisecond !== undefined) {
            out += `T${pad(components.hour)}:${pad(components.minute)}:${pad(Math.floor(components.second ?? 0))}`;
            if (components.millisecond !== undefined)
                out += `.${pad(components.millisecond, 3)}`;
        }
        return out;
    }
    validate(input) {
        if (typeof input === "string") {
            return /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/.test(input.trim());
        }
        if (typeof input === "object") {
            // Reconstruct full year for leap check
            let fullYear;
            if (input.millennium !== undefined) {
                fullYear =
                    ((input.millennium ?? 0) - 1) * 1000 +
                        ((input.century ?? 1) - 1) * 100 +
                        (input.year ?? 0);
            }
            else {
                fullYear = input.year ?? 0;
            }
            const { month, day } = input;
            if (month === undefined || day === undefined)
                return false;
            if (month < 1 || month > 12 || day < 1)
                return false;
            let maxDay = this.DAYS_IN_MONTH[month - 1];
            if (month === 2 && this.isLeapYear(fullYear))
                maxDay = 29;
            return day <= maxDay;
        }
        return false;
    }
    getMetadata() {
        return {
            name: "Julian Calendar",
            monthNames: this.MONTH_NAMES,
            monthNamesShort: this.MONTH_NAMES_SHORT,
            isLunar: false,
            monthsPerYear: 12,
            epochYear: 1,
        };
    }
    // ── Internal helpers ──────────────────────────────────────────────────
    /** Julian leap year: every 4 years, no century exception */
    isLeapYear(year) {
        return year % 4 === 0;
    }
    // ── JDN algorithms ────────────────────────────────────────────────────
    julianToJdn(jy, jm, jd) {
        const a = Math.floor((14 - jm) / 12);
        const y = jy + 4800 - a;
        const m = jm + 12 * a - 3;
        return (jd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083);
    }
    jdnToJulian(jdn) {
        const c = jdn + 32082;
        const d = Math.floor((4 * c + 3) / 1461);
        const e = c - Math.floor((1461 * d) / 4);
        const m = Math.floor((5 * e + 2) / 153);
        const jd = e - Math.floor((153 * m + 2) / 5) + 1;
        const jm = m + 3 - 12 * Math.floor(m / 10);
        const jy = d - 4800 + Math.floor(m / 10);
        return { jy, jm, jd };
    }
    /** Gregorian → JDN (for converting incoming Gregorian Date) */
    gregorianToJdn(gy, gm, gd) {
        const a = Math.floor((14 - gm) / 12);
        const y = gy + 4800 - a;
        const m = gm + 12 * a - 3;
        return (gd +
            Math.floor((153 * m + 2) / 5) +
            365 * y +
            Math.floor(y / 4) -
            Math.floor(y / 100) +
            Math.floor(y / 400) -
            32045);
    }
    jdnToGregorian(jdn) {
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
exports.JulianDriver = JulianDriver;
//# sourceMappingURL=julian.js.map