/**
 * TpsDate Date-like wrapper with native TPS conversion helpers.
 */
import { DefaultCalendars } from "./types";
import { TPS } from "./index";
export class TpsDate {
    constructor(...args) {
        this._cachedComponents = null;
        this._cachedTps = null;
        if (args.length === 0) {
            this.internal = new Date();
            return;
        }
        if (args.length === 1) {
            const value = args[0];
            if (value instanceof TpsDate) {
                this.internal = new Date(value.getTime());
                return;
            }
            if (value instanceof Date) {
                this.internal = new Date(value.getTime());
                return;
            }
            if (typeof value === "string" && TpsDate.looksLikeTPS(value)) {
                const parsed = TPS.toDate(value);
                if (!parsed) {
                    throw new RangeError(`Invalid TPS date string: ${value}`);
                }
                this.internal = parsed;
                return;
            }
            this.internal = new Date(value);
            return;
        }
        const [year, monthIndex, day, hours, minutes, seconds, ms] = args;
        this.internal = new Date(year, monthIndex, day ?? 1, hours ?? 0, minutes ?? 0, seconds ?? 0, ms ?? 0);
    }
    static looksLikeTPS(input) {
        const s = input.trim();
        return s.startsWith("tps://") || s.startsWith("T:") || s.startsWith("t:");
    }
    getTpsComponents() {
        const currentTps = this.toTPS(DefaultCalendars.TPS);
        if (this._cachedTps === currentTps && this._cachedComponents) {
            return this._cachedComponents;
        }
        const parsed = TPS.parse(currentTps);
        if (!parsed) {
            throw new Error("TpsDate: failed to derive TPS components");
        }
        this._cachedTps = currentTps;
        this._cachedComponents = parsed;
        return parsed;
    }
    getTpsFullYear() {
        const comp = this.getTpsComponents();
        return (comp.millennium - 1) * 1000 + (comp.century - 1) * 100 + comp.year;
    }
    static now() {
        return Date.now();
    }
    static parse(input) {
        if (this.looksLikeTPS(input)) {
            const d = TPS.toDate(input);
            return d ? d.getTime() : Number.NaN;
        }
        return Date.parse(input);
    }
    static UTC(year, monthIndex, day, hours, minutes, seconds, ms) {
        return Date.UTC(year, monthIndex, day ?? 1, hours ?? 0, minutes ?? 0, seconds ?? 0, ms ?? 0);
    }
    static fromTPS(tps) {
        return new TpsDate(tps);
    }
    toGregorianDate() {
        return new Date(this.internal.getTime());
    }
    toDate() {
        return this.toGregorianDate();
    }
    toTPS(calendar = DefaultCalendars.TPS, opts) {
        return TPS.fromDate(this.internal, calendar, opts);
    }
    toTPSURI(calendar = DefaultCalendars.TPS, opts) {
        const time = this.toTPS(calendar, { order: opts?.order });
        const comp = TPS.parse(time);
        if (opts?.latitude !== undefined && opts?.longitude !== undefined) {
            comp.latitude = opts.latitude;
            comp.longitude = opts.longitude;
            if (opts.altitude !== undefined)
                comp.altitude = opts.altitude;
        }
        else if (opts?.isHiddenLocation) {
            comp.isHiddenLocation = true;
        }
        else if (opts?.isRedactedLocation) {
            comp.isRedactedLocation = true;
        }
        else {
            comp.isUnknownLocation = true;
        }
        return TPS.toURI(comp);
    }
    getTime() {
        return this.internal.getTime();
    }
    valueOf() {
        return this.internal.valueOf();
    }
    toString() {
        return this.toTPS(DefaultCalendars.TPS);
    }
    toISOString() {
        return this.internal.toISOString();
    }
    toUTCString() {
        return this.internal.toUTCString();
    }
    toJSON() {
        return this.internal.toJSON();
    }
    getFullYear() {
        return this.getTpsFullYear();
    }
    getUTCFullYear() {
        return this.getTpsFullYear();
    }
    getMonth() {
        return this.getTpsComponents().month - 1;
    }
    getUTCMonth() {
        return this.getTpsComponents().month - 1;
    }
    getDate() {
        return this.getTpsComponents().day;
    }
    getUTCDate() {
        return this.getTpsComponents().day;
    }
    getHours() {
        return this.getTpsComponents().hour;
    }
    getUTCHours() {
        return this.getTpsComponents().hour;
    }
    getMinutes() {
        return this.getTpsComponents().minute;
    }
    getUTCMinutes() {
        return this.getTpsComponents().minute;
    }
    getSeconds() {
        return this.getTpsComponents().second;
    }
    getUTCSeconds() {
        return this.getTpsComponents().second;
    }
    getMilliseconds() {
        return this.getTpsComponents().millisecond;
    }
    getUTCMilliseconds() {
        return this.getTpsComponents().millisecond;
    }
    [Symbol.toPrimitive](hint) {
        if (hint === "number")
            return this.valueOf();
        return this.toString();
    }
}
//# sourceMappingURL=date.js.map