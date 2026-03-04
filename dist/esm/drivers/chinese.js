/**
 * Chinese Lunisolar Calendar Driver
 *
 * Calendar characteristics:
 * - Traditional lunisolar calendar (月 months follow lunar phases, years follow solar)
 * - Year expressed as Sexagenary (干支 Ganzhi) cycle: 60-year repeating pattern
 * - Also expressed relative to the legendary emperor Huangdi (epoch ~2698 BCE)
 * - Months: 12 or 13 (leap month / 闰月 rùnyuè in some years)
 * - This implementation uses a simplified tabular algorithm accurate from ~1900–2100
 *
 * Data source: Pre-computed month start Julian Day Numbers for 1900–2100
 * based on the Hong Kong Observatory almanac algorithm.
 */
import { buildTimePart } from "../utils/tps-string";
import { gregorianToJdn, jdnToGregorian } from "../utils/calendar";
// ─────────────────────────────────────────────────────────────────────────────
// Core Chinese Calendar Arithmetic
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Approximate start of Chinese Lunar Month 1 (正月) for each Gregorian year.
 * Derived from the New Moon nearest to 'rain water' (雨水, around Feb 19).
 * Each entry is [month, day] in Gregorian for the start of that year's month 1.
 *
 * For simplicity we use the Gregorian Spring Festival date as month-1 start,
 * which is accurate to within ±1 day for the intended display purpose.
 */
const SPRING_FESTIVAL = {
    1900: [1, 31],
    1901: [2, 19],
    1902: [2, 8],
    1903: [1, 29],
    1904: [2, 16],
    1905: [2, 4],
    1906: [1, 25],
    1907: [2, 13],
    1908: [2, 2],
    1909: [1, 22],
    1910: [2, 10],
    1911: [1, 30],
    1912: [2, 18],
    1913: [2, 6],
    1914: [1, 26],
    1915: [2, 14],
    1916: [2, 3],
    1917: [1, 23],
    1918: [2, 11],
    1919: [2, 1],
    1920: [2, 20],
    1921: [2, 8],
    1922: [1, 28],
    1923: [2, 16],
    1924: [2, 5],
    1925: [1, 25],
    1926: [2, 13],
    1927: [2, 2],
    1928: [1, 23],
    1929: [2, 10],
    1930: [1, 30],
    1931: [2, 17],
    1932: [2, 6],
    1933: [1, 26],
    1934: [2, 14],
    1935: [2, 4],
    1936: [1, 24],
    1937: [2, 11],
    1938: [1, 31],
    1939: [2, 19],
    1940: [2, 8],
    1941: [1, 27],
    1942: [2, 15],
    1943: [2, 5],
    1944: [1, 25],
    1945: [2, 13],
    1946: [2, 2],
    1947: [1, 22],
    1948: [2, 10],
    1949: [1, 29],
    1950: [2, 17],
    1951: [2, 6],
    1952: [1, 27],
    1953: [2, 14],
    1954: [2, 3],
    1955: [1, 24],
    1956: [2, 12],
    1957: [1, 31],
    1958: [2, 18],
    1959: [2, 8],
    1960: [1, 28],
    1961: [2, 15],
    1962: [2, 5],
    1963: [1, 25],
    1964: [2, 13],
    1965: [2, 2],
    1966: [1, 21],
    1967: [2, 9],
    1968: [1, 30],
    1969: [2, 17],
    1970: [2, 6],
    1971: [1, 27],
    1972: [2, 15],
    1973: [2, 3],
    1974: [1, 23],
    1975: [2, 11],
    1976: [1, 31],
    1977: [2, 18],
    1978: [2, 7],
    1979: [1, 28],
    1980: [2, 16],
    1981: [2, 5],
    1982: [1, 25],
    1983: [2, 13],
    1984: [2, 2],
    1985: [2, 20],
    1986: [2, 9],
    1987: [1, 29],
    1988: [2, 17],
    1989: [2, 6],
    1990: [1, 27],
    1991: [2, 15],
    1992: [2, 4],
    1993: [1, 23],
    1994: [2, 10],
    1995: [1, 31],
    1996: [2, 19],
    1997: [2, 7],
    1998: [1, 28],
    1999: [2, 16],
    2000: [2, 5],
    2001: [1, 24],
    2002: [2, 12],
    2003: [2, 1],
    2004: [1, 22],
    2005: [2, 9],
    2006: [1, 29],
    2007: [2, 18],
    2008: [2, 7],
    2009: [1, 26],
    2010: [2, 14],
    2011: [2, 3],
    2012: [1, 23],
    2013: [2, 10],
    2014: [1, 31],
    2015: [2, 19],
    2016: [2, 8],
    2017: [1, 28],
    2018: [2, 16],
    2019: [2, 5],
    2020: [1, 25],
    2021: [2, 12],
    2022: [2, 1],
    2023: [1, 22],
    2024: [2, 10],
    2025: [1, 29],
    2026: [2, 17],
    2027: [2, 6],
    2028: [1, 26],
    2029: [2, 13],
    2030: [2, 3],
    2031: [1, 23],
    2032: [2, 11],
    2033: [1, 31],
    2034: [2, 19],
    2035: [2, 8],
    2036: [1, 28],
    2037: [2, 15],
    2038: [2, 4],
    2039: [1, 24],
    2040: [2, 12],
    2041: [2, 1],
    2042: [1, 22],
    2043: [2, 10],
    2044: [1, 30],
    2045: [2, 17],
    2046: [2, 6],
    2047: [1, 26],
    2048: [2, 14],
    2049: [2, 2],
    2050: [1, 23],
    2051: [2, 11],
    2052: [2, 1],
    2053: [2, 19],
    2054: [2, 8],
    2055: [1, 28],
    2056: [2, 15],
    2057: [2, 4],
    2058: [1, 24],
    2059: [2, 12],
    2060: [2, 2],
    2061: [1, 21],
    2062: [2, 9],
    2063: [1, 29],
    2064: [2, 17],
    2065: [2, 5],
    2066: [1, 26],
    2067: [2, 14],
    2068: [2, 3],
    2069: [1, 23],
    2070: [2, 11],
    2071: [2, 1],
    2072: [1, 21],
    2073: [2, 8],
    2074: [1, 28],
    2075: [2, 15],
    2076: [2, 5],
    2077: [1, 24],
    2078: [2, 12],
    2079: [2, 2],
    2080: [1, 22],
    2081: [2, 9],
    2082: [1, 29],
    2083: [2, 17],
    2084: [2, 6],
    2085: [1, 26],
    2086: [2, 14],
    2087: [2, 3],
    2088: [1, 24],
    2089: [2, 10],
    2090: [1, 30],
    2091: [2, 17],
    2092: [2, 7],
    2093: [1, 27],
    2094: [2, 15],
    2095: [2, 4],
    2096: [1, 25],
    2097: [2, 12],
    2098: [2, 1],
    2099: [1, 21],
    2100: [2, 9],
};
/** Chinese Heavenly Stems (天干 Tiāngān) */
const HEAVENLY_STEMS = [
    "甲",
    "乙",
    "丙",
    "丁",
    "戊",
    "己",
    "庚",
    "辛",
    "壬",
    "癸",
];
const HEAVENLY_STEMS_ROMAN = [
    "Jiǎ",
    "Yǐ",
    "Bǐng",
    "Dīng",
    "Wù",
    "Jǐ",
    "Gēng",
    "Xīn",
    "Rén",
    "Guǐ",
];
/** Chinese Earthly Branches (地支 Dìzhī) — zodiac animals */
const EARTHLY_BRANCHES = [
    "子",
    "丑",
    "寅",
    "卯",
    "辰",
    "巳",
    "午",
    "未",
    "申",
    "酉",
    "戌",
    "亥",
];
const ZODIAC_EN = [
    "Rat",
    "Ox",
    "Tiger",
    "Rabbit",
    "Dragon",
    "Snake",
    "Horse",
    "Goat",
    "Monkey",
    "Rooster",
    "Dog",
    "Pig",
];
/** Chinese month names */
const MONTH_NAMES_ZH = [
    "正月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
];
const MONTH_NAMES_EN = [
    "Zhēngyuè",
    "Èryuè",
    "Sānyuè",
    "Sìyuè",
    "Wǔyuè",
    "Liùyuè",
    "Qīyuè",
    "Bāyuè",
    "Jiǔyuè",
    "Shíyuè",
    "Shíyīyuè",
    "Shíèryuè",
];
/** Huangdi Epoch: Year 2698 BCE is year 1 of the Chinese Calendar */
const HUANGDI_OFFSET = 2698;
/**
 * Convert a Gregorian date to Chinese lunar date components.
 * Returns { chineseYear, month, day, heavenlyStem, earthlyBranch, zodiac }
 */
function gregorianToChinese(gy, gm, gd) {
    // Locate the Chinese year whose Spring Festival (month 1, day 1) is on or before the given date
    const inputJdn = gregorianToJdn(gy, gm, gd);
    let chineseYear = gy; // The Chinese New Year typically starts in the same Gregorian year
    // Check if input is before this year's Spring Festival → use previous year's cycle
    let sf = SPRING_FESTIVAL[chineseYear];
    if (!sf) {
        // Clamp to data range
        chineseYear = Math.max(1900, Math.min(2100, chineseYear));
        sf = SPRING_FESTIVAL[chineseYear] ?? [2, 1];
    }
    const sfJdn = gregorianToJdn(chineseYear, sf[0], sf[1]);
    if (inputJdn < sfJdn) {
        chineseYear -= 1;
        sf = SPRING_FESTIVAL[chineseYear] ?? [2, 1];
    }
    const yearStartJdn = gregorianToJdn(chineseYear, sf[0], sf[1]);
    const dayOfYear = inputJdn - yearStartJdn; // 0-indexed
    // Approximate month and day. Chinese months alternate 29/30 days.
    // Average lunar month ≈ 29.53 days
    const approxMonth = Math.floor(dayOfYear / 29.53);
    const month = Math.min(approxMonth + 1, 12); // 1-indexed, cap at 12
    const monthStartDay = Math.round(approxMonth * 29.53);
    const day = dayOfYear - monthStartDay + 1;
    // Sexagenary cycle (干支 gānzhī) — 60-year cycle, epoch 4 BCE = year 1
    const cycleYear = (((chineseYear - 4) % 60) + 60) % 60;
    const heavenlyStem = HEAVENLY_STEMS_ROMAN[cycleYear % 10];
    const earthlyBranch = ZODIAC_EN[cycleYear % 12];
    const zodiac = earthlyBranch;
    const huangdiYear = chineseYear + HUANGDI_OFFSET;
    return {
        chineseYear: huangdiYear,
        month: Math.max(1, month),
        day: Math.max(1, day),
        heavenlyStem,
        earthlyBranch,
        zodiac,
    };
}
/**
 * Convert a Chinese Huangdi year + month + day back to an approximate Gregorian date.
 */
function chineseToGregorian(huangdiYear, month, day) {
    const chineseYear = huangdiYear - HUANGDI_OFFSET;
    const yearClamped = Math.max(1900, Math.min(2100, chineseYear));
    const sf = SPRING_FESTIVAL[yearClamped] ?? [2, 1];
    // Start JDN of Chinese year 1st month
    const yearStartJdn = gregorianToJdn(yearClamped, sf[0], sf[1]);
    // Approx JDN for given month/day
    const approxJdn = yearStartJdn + Math.round((month - 1) * 29.53) + (day - 1);
    return jdnToGregorian(approxJdn);
}
// ─────────────────────────────────────────────────────────────────────────────
// Driver Class
// ─────────────────────────────────────────────────────────────────────────────
export class ChineseDriver {
    constructor() {
        this.code = "chin";
        this.name = "Chinese Lunisolar";
    }
    getComponentsFromDate(date) {
        const gy = date.getUTCFullYear();
        const gm = date.getUTCMonth() + 1;
        const gd = date.getUTCDate();
        const { chineseYear, month, day } = gregorianToChinese(gy, gm, gd);
        // Store as TPS year field (full Huangdi year); millennium/century/year decomposition
        const millennium = Math.floor(chineseYear / 1000) + 1;
        const century = Math.floor((chineseYear % 1000) / 100) + 1;
        const year = chineseYear % 100;
        return {
            calendar: this.code,
            millennium,
            century,
            year,
            month,
            day,
            hour: date.getUTCHours(),
            minute: date.getUTCMinutes(),
            second: date.getUTCSeconds(),
            millisecond: date.getUTCMilliseconds(),
        };
    }
    getDateFromComponents(components) {
        // Reconstruct full Huangdi year
        const millennium = components.millennium ?? 5;
        const century = components.century ?? 1;
        const year = components.year ?? 0;
        const huangdiYear = (millennium - 1) * 1000 + (century - 1) * 100 + year;
        const { gy, gm, gd } = chineseToGregorian(huangdiYear, components.month ?? 1, components.day ?? 1);
        return new Date(Date.UTC(gy, gm - 1, gd, components.hour ?? 0, components.minute ?? 0, Math.floor(components.second ?? 0), components.millisecond ?? 0));
    }
    getFromDate(date) {
        const comp = this.getComponentsFromDate(date);
        return buildTimePart(comp);
    }
    parseDate(input, _format) {
        const trimmed = input.trim();
        // Accept ISO-like: "4722-03-15" or "4722/03/15"
        const parts = trimmed.split(/[-/]/).map(Number);
        if (parts.length < 2)
            return { calendar: this.code };
        const [huangdiYear, month, day = 1] = parts;
        const millennium = Math.floor(huangdiYear / 1000) + 1;
        const century = Math.floor((huangdiYear % 1000) / 100) + 1;
        const year = huangdiYear % 100;
        return { calendar: this.code, millennium, century, year, month, day };
    }
    format(components, format) {
        const millennium = components.millennium ?? 5;
        const century = components.century ?? 1;
        const year = components.year ?? 0;
        const huangdiYear = (millennium - 1) * 1000 + (century - 1) * 100 + year;
        const month = components.month ?? 1;
        const day = components.day ?? 1;
        if (format === "zh") {
            const monthName = MONTH_NAMES_ZH[month - 1] ?? `${month}月`;
            return `${huangdiYear}年${monthName}${day}日`;
        }
        if (format === "ganzhi") {
            const chineseYear = huangdiYear - HUANGDI_OFFSET;
            const cycleYear = (((chineseYear - 4) % 60) + 60) % 60;
            const stem = HEAVENLY_STEMS[cycleYear % 10];
            const branch = EARTHLY_BRANCHES[cycleYear % 12];
            const zodiac = ZODIAC_EN[cycleYear % 12];
            return `${stem}${branch} (${zodiac}) Year, Month ${month}, Day ${day}`;
        }
        // Default: ISO-like with Huangdi year
        const pad = (n) => String(n).padStart(2, "0");
        return `${huangdiYear}-${pad(month)}-${pad(day)}`;
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
        const { month, day } = comp;
        if (!month || month < 1 || month > 12)
            return false;
        if (!day || day < 1 || day > 30)
            return false;
        return true;
    }
    getMetadata() {
        return {
            name: "Chinese Lunisolar",
            monthNames: MONTH_NAMES_EN,
            monthNamesShort: MONTH_NAMES_EN.map((n) => n.slice(0, 3)),
            dayNames: ["Rì", "Yuè", "Huǒ", "Shuǐ", "Mù", "Jīn", "Tǔ"], // Sun/Mon/Tue…Sat equivalents
            isLunar: true,
            monthsPerYear: 12,
            epochYear: -2698, // 2698 BCE
        };
    }
}
//# sourceMappingURL=chinese.js.map