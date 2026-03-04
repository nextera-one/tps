import { buildTimePart } from "../utils/tps-string";
import { gregorianToJdn, jdnToGregorian, persianToJdn, jdnToPersian, } from "../utils/calendar";
export class PersianDriver {
    constructor() {
        this.code = "per";
        this.name = "Persian (Jalali/Solar Hijri)";
        this.MONTH_NAMES = [
            "Farvardin",
            "Ordibehesht",
            "Khordad",
            "Tir",
            "Mordad",
            "Shahrivar",
            "Mehr",
            "Aban",
            "Azar",
            "Dey",
            "Bahman",
            "Esfand",
        ];
        this.MONTH_NAMES_SHORT = [
            "Far",
            "Ord",
            "Kho",
            "Tir",
            "Mor",
            "Sha",
            "Meh",
            "Aba",
            "Aza",
            "Dey",
            "Bah",
            "Esf",
        ];
        this.DAY_NAMES = [
            "Yekshanbeh",
            "Doshanbeh",
            "Seshanbeh",
            "Chaharshanbeh",
            "Panjshanbeh",
            "Jomeh",
            "Shanbeh",
        ];
        /** Days per month (non-leap): 6×31 + 5×30 + 1×29 = 365 */
        this.DAYS_IN_MONTH = [
            31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29,
        ];
    }
    getComponentsFromDate(date) {
        const jdn = gregorianToJdn(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
        const { jy, jm, jd } = jdnToPersian(jdn);
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
        let jy;
        if (components.millennium !== undefined) {
            const m = components.millennium ?? 0;
            const c = components.century ?? 1;
            const y = components.year ?? 0;
            jy = (m - 1) * 1000 + (c - 1) * 100 + y;
        }
        else {
            jy = components.year ?? 1;
        }
        const jm = components.month ?? 1;
        const jd = components.day ?? 1;
        const jdn = persianToJdn(jy, jm, jd);
        const { gy, gm, gd } = jdnToGregorian(jdn);
        return new Date(Date.UTC(gy, gm - 1, gd, components.hour ?? 0, components.minute ?? 0, Math.floor(components.second ?? 0), components.millisecond ?? 0));
    }
    getFromDate(date) {
        const comp = this.getComponentsFromDate(date);
        return buildTimePart(comp);
    }
    parseDate(input, format) {
        const trimmed = input.trim();
        if (format === "short" ||
            (trimmed.includes("/") && trimmed.split("/")[0].length <= 2)) {
            const parts = trimmed.split("/").map(Number);
            let fullYear, month, day;
            if (parts[0] > 31) {
                [fullYear, month, day] = parts;
            }
            else {
                [day, month, fullYear] = parts;
            }
            return {
                calendar: this.code,
                millennium: Math.floor(fullYear / 1000) + 1,
                century: Math.floor((fullYear % 1000) / 100) + 1,
                year: fullYear % 100,
                month,
                day,
            };
        }
        const segments = trimmed.split(/[\s,T]+/);
        const [parsedYear, month, day] = segments[0].split(/[-/]/).map(Number);
        const result = { calendar: this.code };
        const fullYear = parsedYear;
        result.millennium = Math.floor(fullYear / 1000) + 1;
        result.century = Math.floor((fullYear % 1000) / 100) + 1;
        result.year = fullYear % 100;
        result.month = month;
        result.day = day;
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
        if (year === undefined || year < 1)
            return false;
        if (month === undefined || month < 1 || month > 12)
            return false;
        if (day === undefined || day < 1)
            return false;
        // leap check
        const leapYears = [1, 5, 9, 13, 17, 22, 26, 30];
        const cycle = ((year - 1) % 33) + 1;
        const isLeap = leapYears.includes(cycle);
        let max = this.DAYS_IN_MONTH[month - 1];
        if (month === 12 && isLeap)
            max = 30;
        return day <= max;
    }
    getMetadata() {
        return {
            name: "Persian (Jalali/Solar Hijri)",
            monthNames: this.MONTH_NAMES,
            monthNamesShort: this.MONTH_NAMES_SHORT,
            dayNames: this.DAY_NAMES,
            dayNamesShort: this.DAY_NAMES.map((d) => d.slice(0, 3)),
            isLunar: false,
            monthsPerYear: 12,
            epochYear: 622,
        };
    }
}
//# sourceMappingURL=persian.js.map