"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TpsDriver = void 0;
const tps_string_js_1 = require("../utils/tps-string.js");
const tps_native_js_1 = require("../utils/tps-native.js");
/**
 * TPS calendar driver for canonical TPS time strings.
 *
 * TPS Calendar characteristics:
 * - Epoch anchor: 1999-08-11T07:00:00.000Z
 * - Day boundary: 07:00 Gregorian / UTC
 * - Year shape: 12 months × 4 weeks × 7 days = 336 days
 */
class TpsDriver {
    constructor() {
        this.code = "tps";
        this.name = "TPS Indexed";
    }
    getComponentsFromDate(date) {
        const deltaMs = date.getTime() - tps_native_js_1.TPS_EPOCH_START_MS;
        const dayIndex = Math.floor(deltaMs / tps_native_js_1.TPS_DAY_MS);
        const dayFraction = ((deltaMs % tps_native_js_1.TPS_DAY_MS) + tps_native_js_1.TPS_DAY_MS) % tps_native_js_1.TPS_DAY_MS / tps_native_js_1.TPS_DAY_MS;
        return (0, tps_native_js_1.buildTpsComponentsFromDayIndex)(dayIndex, dayFraction);
    }
    getDateFromComponents(components) {
        const normalized = (0, tps_native_js_1.normalizeTpsComponents)({
            ...components,
            calendar: this.code,
        });
        const dayIndex = normalized.dayIndex ?? 0;
        const subDayMilliseconds = normalized.subDayMilliseconds ?? 0;
        return new Date(tps_native_js_1.TPS_EPOCH_START_MS + dayIndex * tps_native_js_1.TPS_DAY_MS + subDayMilliseconds);
    }
    getFromDate(date) {
        const comp = this.getComponentsFromDate(date);
        return (0, tps_string_js_1.buildTimePart)(comp);
    }
    parseDate(input, _format) {
        const s = input.trim();
        const indexed = (0, tps_native_js_1.parseTpsIndexedToken)(s);
        if (indexed) {
            return (0, tps_native_js_1.normalizeTpsComponents)({
                calendar: this.code,
                ...indexed,
            });
        }
        const m = s.match(/^(-?\d{1,6})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/);
        if (!m)
            throw new Error(`TpsDriver.parseDate: unsupported format "${input}"`);
        const year = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const day = parseInt(m[3], 10);
        if (month < 1 || month > tps_native_js_1.TPS_MONTHS_PER_YEAR) {
            throw new Error(`TpsDriver.parseDate: invalid TPS month ${month} (expected 1-12)`);
        }
        if (day < 1 || day > tps_native_js_1.TPS_DAYS_PER_MONTH) {
            throw new Error(`TpsDriver.parseDate: invalid TPS day ${day} (expected 1-28)`);
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
        return (0, tps_native_js_1.normalizeTpsComponents)(comp);
    }
    format(components, _format) {
        const normalized = (0, tps_native_js_1.normalizeTpsComponents)({
            ...components,
            calendar: this.code,
        });
        const fullYear = (0, tps_native_js_1.getTpsFullYear)(normalized);
        const y = normalized.year !== undefined
            ? String(fullYear).padStart(4, "0")
            : "0000";
        const mo = normalized.month !== undefined
            ? String(normalized.month).padStart(2, "0")
            : "01";
        const d = normalized.day !== undefined
            ? String(normalized.day).padStart(2, "0")
            : "01";
        let out = `${y}-${mo}-${d}`;
        if (normalized.hour !== undefined ||
            normalized.minute !== undefined ||
            normalized.second !== undefined ||
            normalized.millisecond !== undefined) {
            const h = normalized.hour !== undefined
                ? String(normalized.hour).padStart(2, "0")
                : "00";
            const mi = normalized.minute !== undefined
                ? String(normalized.minute).padStart(2, "0")
                : "00";
            const s = normalized.second !== undefined
                ? String(Math.floor(normalized.second)).padStart(2, "0")
                : "00";
            const ms = normalized.millisecond !== undefined
                ? String(normalized.millisecond).padStart(3, "0")
                : "000";
            out += `T${h}:${mi}:${s}.${ms}`;
        }
        return out;
    }
    validate(input) {
        if (typeof input === "string") {
            if ((0, tps_native_js_1.parseTpsIndexedToken)(input.trim())) {
                return true;
            }
            try {
                return (0, tps_native_js_1.validateTpsComponents)(this.parseDate(input));
            }
            catch {
                return false;
            }
        }
        if (typeof input === "object") {
            return (0, tps_native_js_1.validateTpsComponents)(input);
        }
        return false;
    }
    getMetadata() {
        return {
            name: "TPS Native (epoch-based 12x4x7)",
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
                "Day 1",
                "Day 2",
                "Day 3",
                "Day 4",
                "Day 5",
                "Day 6",
                "Day 7",
            ],
            monthsPerYear: tps_native_js_1.TPS_MONTHS_PER_YEAR,
            epochYear: 1999,
            isLunar: false,
        };
    }
}
exports.TpsDriver = TpsDriver;
//# sourceMappingURL=tps.js.map