/**
 * TpsDate Date-like wrapper with native TPS conversion helpers.
 */
import { TPSTimeOptions } from "./types";
export declare class TpsDate {
    private readonly internal;
    private _cachedComponents;
    private _cachedTps;
    constructor();
    constructor(value: string | number | Date | TpsDate);
    constructor(year: number, monthIndex: number, day?: number, hours?: number, minutes?: number, seconds?: number, ms?: number);
    private static looksLikeTPS;
    private getTpsComponents;
    private getTpsFullYear;
    static now(): number;
    static parse(input: string): number;
    static UTC(year: number, monthIndex: number, day?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
    static fromTPS(tps: string): TpsDate;
    toGregorianDate(): Date;
    toDate(): Date;
    toTPS(calendar?: string, opts?: TPSTimeOptions): string;
    toTPSURI(calendar?: string, opts?: {
        order?: TPSTimeOptions["order"];
        timeMode?: TPSTimeOptions["timeMode"];
        indexedPrecision?: TPSTimeOptions["indexedPrecision"];
        latitude?: number;
        longitude?: number;
        altitude?: number;
        isUnknownLocation?: boolean;
        isHiddenLocation?: boolean;
        isRedactedLocation?: boolean;
    }): string;
    getTime(): number;
    valueOf(): number;
    toString(): string;
    toISOString(): string;
    toUTCString(): string;
    toJSON(): string | null;
    getFullYear(): number;
    getUTCFullYear(): number;
    getMonth(): number;
    getUTCMonth(): number;
    getDate(): number;
    getUTCDate(): number;
    getHours(): number;
    getUTCHours(): number;
    getMinutes(): number;
    getUTCMinutes(): number;
    getSeconds(): number;
    getUTCSeconds(): number;
    getMilliseconds(): number;
    getUTCMilliseconds(): number;
    [Symbol.toPrimitive](hint: string): string | number;
}
