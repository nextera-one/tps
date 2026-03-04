/**
 * Shared Calendar Math Utilities
 */
/**
 * Gregorian -> Julian Day Number
 */
export declare function gregorianToJdn(gy: number, gm: number, gd: number): number;
/**
 * Julian Day Number -> Gregorian
 */
export declare function jdnToGregorian(jdn: number): {
    gy: number;
    gm: number;
    gd: number;
};
/**
 * Julian -> Julian Day Number
 */
export declare function julianToJdn(jy: number, jm: number, jd: number): number;
/**
 * Julian Day Number -> Julian
 */
export declare function jdnToJulian(jdn: number): {
    jy: number;
    jm: number;
    jd: number;
};
/**
 * Persian -> Julian Day Number
 */
export declare function persianToJdn(jy: number, jm: number, jd: number): number;
/**
 * Julian Day Number -> Persian
 */
export declare function jdnToPersian(jdn: number): {
    jy: number;
    jm: number;
    jd: number;
};
/**
 * Convert Gregorian to Hijri (Tabular Islamic Calendar).
 */
export declare function gregorianToHijri(gy: number, gm: number, gd: number): {
    hy: number;
    hm: number;
    hd: number;
};
/**
 * Convert Hijri to Gregorian.
 */
export declare function hijriToGregorian(hy: number, hm: number, hd: number): {
    gy: number;
    gm: number;
    gd: number;
};
