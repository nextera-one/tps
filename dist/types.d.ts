/**
 * TPS: Temporal Positioning System
 * Shared types and interfaces.
 */
/**
 * Calendar codes are plain strings to allow arbitrary user-defined
 * calendars. The library still exports constants for the built-in values.
 */
export declare const DefaultCalendars: {
    readonly TPS: "tps";
    readonly GREG: "greg";
    readonly HIJ: "hij";
    readonly PER: "per";
    readonly JUL: "jul";
    readonly HOLO: "holo";
    readonly UNIX: "unix";
};
/**
 * Specifies the direction of the time-component hierarchy when serializing or
 * deserializing a TPS string. The default is 'descending'.
 */
export declare enum TimeOrder {
    DESC = "desc",
    ASC = "asc"
}
export interface TPSComponents {
    calendar: string;
    millennium: number;
    century: number;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
    unixSeconds?: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    s2Cell?: string;
    h3Cell?: string;
    plusCode?: string;
    what3words?: string;
    building?: string;
    floor?: string;
    room?: string;
    zone?: string;
    /** Raw pre-@ space anchor */
    spaceAnchor?: string;
    isUnknownLocation?: boolean;
    isRedactedLocation?: boolean;
    isHiddenLocation?: boolean;
    actor?: string;
    signature?: string;
    extensions?: Record<string, string>;
    order?: TimeOrder;
}
/**
 * Interface for Calendar Driver plugins.
 */
export interface CalendarDriver {
    readonly code: string;
    readonly name?: string;
    getComponentsFromDate(date: Date): Partial<TPSComponents>;
    getDateFromComponents(components: Partial<TPSComponents>): Date;
    getFromDate(date: Date): string;
    parseDate(input: string, format?: string): Partial<TPSComponents>;
    format(components: Partial<TPSComponents>, format?: string): string;
    validate(input: string | Partial<TPSComponents>): boolean;
    getMetadata(): CalendarMetadata;
}
/**
 * Metadata about a calendar system.
 */
export interface CalendarMetadata {
    name: string;
    monthNames?: string[];
    monthNamesShort?: string[];
    dayNames?: string[];
    dayNamesShort?: string[];
    isLunar?: boolean;
    monthsPerYear?: number;
    epochYear?: number;
}
