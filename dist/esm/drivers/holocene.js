import { buildTimePart } from "../utils/tps-string";
import { GregorianDriver } from "./gregorian";
/**
 * Holocene (Human Era) Calendar Driver
 */
export class HoloceneDriver {
    constructor() {
        this.code = "holo";
        this.name = "Holocene (Human Era)";
        this.gregorian = new GregorianDriver();
        this.YEAR_OFFSET = 10000;
    }
    getComponentsFromDate(date) {
        const greg = this.gregorian.getComponentsFromDate(date);
        const fullYear = date.getUTCFullYear() + this.YEAR_OFFSET;
        return {
            ...greg,
            calendar: this.code,
            millennium: Math.floor(fullYear / 1000) + 1,
            century: Math.floor((fullYear % 1000) / 100) + 1,
            year: fullYear % 100,
        };
    }
    getDateFromComponents(components) {
        const m = components.millennium ?? 0;
        const c = components.century ?? 1;
        const y = components.year ?? 0;
        const holoYear = (m - 1) * 1000 + (c - 1) * 100 + y;
        const gregYear = holoYear - this.YEAR_OFFSET;
        return new Date(Date.UTC(gregYear, (components.month ?? 1) - 1, components.day ?? 1, components.hour ?? 0, components.minute ?? 0, Math.floor(components.second ?? 0), components.millisecond ??
            Math.round(((components.second ?? 0) % 1) * 1000)));
    }
    getFromDate(date) {
        const comp = this.getComponentsFromDate(date);
        return buildTimePart(comp);
    }
    parseDate(input, _format) {
        const m = input
            .trim()
            .match(/^(\d{4,5})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/);
        if (!m)
            throw new Error(`HoloceneDriver.parseDate: unsupported format "${input}"`);
        const result = {
            calendar: this.code,
            year: parseInt(m[1], 10),
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
    format(components, _format) {
        const pad = (n, w = 2) => String(n ?? 0).padStart(w, "0");
        let holoYear;
        if (components.millennium !== undefined) {
            const m = components.millennium ?? 0;
            const c = components.century ?? 1;
            const y = components.year ?? 0;
            holoYear = (m - 1) * 1000 + (c - 1) * 100 + y;
        }
        else {
            holoYear = components.year ?? 0;
        }
        let out = `${String(holoYear).padStart(5, "0")}-${pad(components.month)}-${pad(components.day)}`;
        if (components.hour !== undefined ||
            components.minute !== undefined ||
            components.second !== undefined) {
            out += `T${pad(components.hour)}:${pad(components.minute)}:${pad(Math.floor(components.second ?? 0))}`;
        }
        return out;
    }
    validate(input) {
        if (typeof input === "string") {
            return /^\d{4,5}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/.test(input.trim());
        }
        if (typeof input === "object") {
            return this.gregorian.validate({
                year: input.year,
                month: input.month,
                day: input.day,
            });
        }
        return false;
    }
    getMetadata() {
        return {
            name: "Holocene (Human Era)",
            monthNames: [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ],
            isLunar: false,
            monthsPerYear: 12,
            epochYear: -10000,
        };
    }
}
//# sourceMappingURL=holocene.js.map