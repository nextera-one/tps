"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TpsDriver = void 0;
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
const index_1 = require("../index");
const gregorian_1 = require("./gregorian");
class TpsDriver {
    constructor() {
        this.code = "tps";
        this.name = "TPS Canonical";
        // TPS Epoch: August 11, 1999, 00:00 UTC
        this.TPS_EPOCH = new Date(Date.UTC(1999, 7, 11, 0, 0, 0, 0));
        // TPS is 7 hours ahead of Gregorian
        this.TPS_OFFSET_HOURS = 7;
        // Each TPS month has 28 days
        this.TPS_DAYS_PER_MONTH = 28;
        // TPS has 12 months per year (12 * 28 = 336 days)
        this.TPS_MONTHS_PER_YEAR = 12;
        this.gregorian = new gregorian_1.GregorianDriver();
    }
    /**
     * Converts a Gregorian Date to TPS components.
     * Applies 7-hour offset and converts day-of-year to TPS month/day (28-day months).
     */
    getComponentsFromDate(date) {
        // Apply 7-hour TPS offset to the Gregorian date
        const offsetMillis = this.TPS_OFFSET_HOURS * 60 * 60 * 1000;
        const offsetDate = new Date(date.getTime() + offsetMillis);
        // Get Gregorian components for the offset date
        const gregComponents = this.gregorian.getComponentsFromDate(offsetDate);
        // Calculate day-of-year (0-indexed) for the offset date
        const yearStart = new Date(Date.UTC(offsetDate.getUTCFullYear(), 0, 1));
        const dayOfYear = Math.floor((offsetDate.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
        // Convert day-of-year to TPS month/day (each month = 28 days)
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
    /**
     * Converts TPS components to a Gregorian Date.
     * Converts TPS month/day (28-day months) to day-of-year, then removes 7-hour offset.
     */
    getDateFromComponents(components) {
        // Convert TPS month/day (28-day months) to day-of-year (0-indexed)
        const tpsMonth = components.month ?? 1;
        const tpsDay = components.day ?? 1;
        const dayOfYear = (tpsMonth - 1) * this.TPS_DAYS_PER_MONTH + (tpsDay - 1);
        // Reconstruct full Gregorian year from millennium/century/year
        const m = components.millennium ?? 0;
        const c = components.century ?? 1;
        const y = components.year ?? 0;
        const fullYear = (m - 1) * 1000 + (c - 1) * 100 + y;
        // Create date at start of year and add day-of-year offset
        const dateInYear = new Date(Date.UTC(fullYear, 0, 1));
        dateInYear.setUTCDate(dateInYear.getUTCDate() + dayOfYear);
        // Set time components
        dateInYear.setUTCHours(components.hour ?? 0);
        dateInYear.setUTCMinutes(components.minute ?? 0);
        dateInYear.setUTCSeconds(components.second ?? 0);
        dateInYear.setUTCMilliseconds(components.millisecond ?? 0);
        // Remove 7-hour TPS offset to get back to Gregorian
        const offsetMillis = this.TPS_OFFSET_HOURS * 60 * 60 * 1000;
        return new Date(dateInYear.getTime() - offsetMillis);
    }
    getFromDate(date) {
        const components = this.getComponentsFromDate(date);
        return index_1.TPS.buildTimePart(components);
    }
    /**
     * Parse a TPS date string: "YYYY-MM-DD" where MM is 01-12, DD is 01-28.
     * Optional time: "YYYY-MM-DD HH:MM:SS.mmm"
     */
    parseDate(input, format) {
        const s = input.trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/);
        if (!m) {
            throw new Error(`TpsDriver.parseDate: unsupported format "${input}"`);
        }
        const year = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const day = parseInt(m[3], 10);
        // Validate TPS month/day constraints
        if (month < 1 || month > this.TPS_MONTHS_PER_YEAR) {
            throw new Error(`TpsDriver.parseDate: invalid TPS month ${month} (expected 1-12)`);
        }
        if (day < 1 || day > this.TPS_DAYS_PER_MONTH) {
            throw new Error(`TpsDriver.parseDate: invalid TPS day ${day} (expected 1-${this.TPS_DAYS_PER_MONTH})`);
        }
        const hour = m[4] !== undefined ? parseInt(m[4], 10) : undefined;
        const minute = m[5] !== undefined ? parseInt(m[5], 10) : undefined;
        const second = m[6] !== undefined ? parseInt(m[6], 10) : undefined;
        const millisecond = m[7] !== undefined ? parseInt((m[7] + "000").slice(0, 3), 10) : undefined;
        const comp = {
            calendar: this.code,
            year,
            month,
            day,
        };
        if (hour !== undefined)
            comp.hour = hour;
        if (minute !== undefined)
            comp.minute = minute;
        if (second !== undefined)
            comp.second = second;
        if (millisecond !== undefined)
            comp.millisecond = millisecond;
        return comp;
    }
    /**
     * Format TPS components to "YYYY-MM-DD" where MM is 01-12, DD is 01-28.
     * With time: "YYYY-MM-DD THH:MM:SS.mmm"
     */
    format(components, format) {
        const y = components.year !== undefined
            ? String(components.year).padStart(4, "0")
            : "0000";
        const mo = components.month !== undefined
            ? String(components.month).padStart(2, "0")
            : "01";
        const d = components.day !== undefined
            ? String(components.day).padStart(2, "0")
            : "01";
        let out = `${y}-${mo}-${d}`;
        if (components.hour !== undefined ||
            components.minute !== undefined ||
            components.second !== undefined ||
            components.millisecond !== undefined) {
            const h = components.hour !== undefined
                ? String(components.hour).padStart(2, "0")
                : "00";
            const mi = components.minute !== undefined
                ? String(components.minute).padStart(2, "0")
                : "00";
            const s = components.second !== undefined
                ? String(Math.floor(components.second)).padStart(2, "0")
                : "00";
            const ms = components.millisecond !== undefined
                ? String(components.millisecond).padStart(3, "0")
                : "000";
            out += `T${h}:${mi}:${s}.${ms}`;
        }
        return out;
    }
    /**
     * Validate TPS date string or components.
     * TPS has months 1-12, each with 28 days.
     */
    validate(input) {
        if (typeof input === "string") {
            const valid = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/.test(input.trim());
            if (!valid)
                return false;
            // Parse and validate constraints
            try {
                this.parseDate(input);
                return true;
            }
            catch {
                return false;
            }
        }
        if (typeof input === "object") {
            return (input.year !== undefined &&
                input.month !== undefined &&
                input.day !== undefined &&
                input.year >= 0 &&
                input.month >= 1 &&
                input.month <= this.TPS_MONTHS_PER_YEAR &&
                input.day >= 1 &&
                input.day <= this.TPS_DAYS_PER_MONTH);
        }
        return false;
    }
    /**
     * Get TPS calendar metadata.
     * TPS has 12 months, each with 28 days.
     */
    getMetadata() {
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
exports.TpsDriver = TpsDriver;
//# sourceMappingURL=tps.js.map