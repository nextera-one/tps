import { buildTimePart } from "../utils/tps-string";
/**
 * Unix calendar driver. Represents the epoch timestamp in seconds with
 * fractional milliseconds.
 */
export class UnixDriver {
    constructor() {
        this.code = "unix";
    }
    getComponentsFromDate(date) {
        const s = (date.getTime() / 1000).toFixed(3);
        return { calendar: this.code, unixSeconds: parseFloat(s) };
    }
    getDateFromComponents(components) {
        if (components.unixSeconds !== undefined) {
            return new Date(components.unixSeconds * 1000);
        }
        return new Date(0);
    }
    getFromDate(date) {
        const comp = this.getComponentsFromDate(date);
        return buildTimePart(comp);
    }
    parseDate(input, _format) {
        const s = input.trim();
        if (!/^[0-9]+(?:\.[0-9]+)?$/.test(s)) {
            throw new Error(`UnixDriver.parseDate: unsupported format "${input}"`);
        }
        return { calendar: this.code, unixSeconds: parseFloat(s) };
    }
    format(components, _format) {
        if (components.unixSeconds === undefined)
            throw new Error("UnixDriver.format: missing unixSeconds");
        return new Date(components.unixSeconds * 1000).toISOString();
    }
    validate(input) {
        if (typeof input === "string")
            return /^[0-9]+(?:\.[0-9]+)?$/.test(input.trim());
        if (typeof input === "object")
            return typeof input.unixSeconds === "number" && !isNaN(input.unixSeconds);
        return false;
    }
    getMetadata() {
        return {
            name: "Unix Epoch",
            monthsPerYear: 0,
        };
    }
}
//# sourceMappingURL=unix.js.map