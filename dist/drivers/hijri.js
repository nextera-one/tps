"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HijriDriver = void 0;
const tps_string_1 = require("../utils/tps-string");
const calendar_1 = require("../utils/calendar");
class HijriDriver {
    constructor() {
        this.code = "hij";
        this.name = "Hijri (Islamic Calendar)";
        this.MONTH_NAMES = [
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
        this.MONTH_NAMES_SHORT = [
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
        this.DAY_NAMES = [
            "al-Ahad",
            "al-Ithnayn",
            "ath-Thulatha",
            "al-Arbi'a",
            "al-Khamis",
            "al-Jumu'ah",
            "as-Sabt",
        ];
    }
    getComponentsFromDate(date) {
        const { hy, hm, hd } = (0, calendar_1.gregorianToHijri)(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
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
    getDateFromComponents(components) {
        let hy;
        if (components.millennium !== undefined) {
            const m = components.millennium ?? 0;
            const c = components.century ?? 1;
            const y = components.year ?? 0;
            hy = (m - 1) * 1000 + (c - 1) * 100 + y;
        }
        else {
            hy = components.year ?? 1;
        }
        const hm = components.month ?? 1;
        const hd = components.day ?? 1;
        const { gy, gm, gd } = (0, calendar_1.hijriToGregorian)(hy, hm, hd);
        return new Date(Date.UTC(gy, gm - 1, gd, components.hour ?? 0, components.minute ?? 0, Math.floor(components.second ?? 0), components.millisecond ?? 0));
    }
    getFromDate(date) {
        const comp = this.getComponentsFromDate(date);
        return (0, tps_string_1.buildTimePart)(comp);
    }
    parseDate(input, format) {
        const trimmed = input.trim();
        if (format === "short" ||
            (trimmed.includes("/") && trimmed.split("/")[0].length <= 2)) {
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
        const result = {
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
    format(components, format) {
        const pad = (n) => String(n ?? 0).padStart(2, "0");
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
        if (format === "short")
            return `${components.day}/${pad(components.month)}/${fullYear}`;
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
    validate(input) {
        let comp;
        if (typeof input === "string") {
            try {
                comp = this.parseDate(input);
            }
            catch {
                return false;
            }
        }
        else {
            comp = input;
        }
        const { year, month, day } = comp;
        let fullYear;
        if (comp.millennium !== undefined) {
            fullYear =
                ((comp.millennium ?? 0) - 1) * 1000 +
                    ((comp.century ?? 1) - 1) * 100 +
                    (year ?? 0);
        }
        else {
            fullYear = year ?? 0;
        }
        if (fullYear < 1)
            return false;
        if (!month || month < 1 || month > 12)
            return false;
        if (!day || day < 1)
            return false;
        // leap check (cycle of 30 years)
        const isLeap = new Set([2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29]).has(((fullYear - 1) % 30) + 1);
        const maxDays = month === 12 && isLeap ? 30 : month % 2 === 1 ? 30 : 29;
        return day <= maxDays;
    }
    getMetadata() {
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
}
exports.HijriDriver = HijriDriver;
//# sourceMappingURL=hijri.js.map