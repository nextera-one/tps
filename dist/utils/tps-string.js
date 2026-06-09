"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTimePart = buildTimePart;
exports.parseTimeString = parseTimeString;
const types_js_1 = require("../types.js");
const tps_native_js_1 = require("./tps-native.js");
/**
 * Generate the canonical `T:` time string for a set of components.
 */
function buildTimePart(comp, options) {
    const calendar = (comp.calendar || "").toLowerCase();
    if (!/^[a-z]{3,4}$/.test(calendar)) {
        throw new Error(`Invalid calendar code '${comp.calendar}'. Calendar code width must be 3–4 lowercase letters.`);
    }
    let time = `T:${calendar}`;
    if (calendar === types_js_1.DefaultCalendars.UNIX) {
        if (comp.unixSeconds !== undefined) {
            time += `.s${comp.unixSeconds}`;
        }
        return time;
    }
    if (calendar === types_js_1.DefaultCalendars.TPS && options?.timeMode === "indexed-fraction") {
        time += `.${(0, tps_native_js_1.formatTpsIndexedToken)(comp, options.indexedPrecision)}`;
        if (comp.signature) {
            time += `!${comp.signature}`;
        }
        return time;
    }
    const source = calendar === types_js_1.DefaultCalendars.TPS ? (0, tps_native_js_1.normalizeTpsComponents)(comp) : comp;
    const tokens = [
        ["m", source.millennium, 8],
        ["c", source.century, 7],
        ["y", source.year, 6],
        ["m", source.month, 5],
        ...(calendar === types_js_1.DefaultCalendars.TPS && source.week !== undefined
            ? [["w", source.week, 4.5]]
            : []),
        ["d", source.day, 4],
        ["h", source.hour, 3],
        ["m", source.minute, 2],
        ["s", source.second, 1],
        ["m", source.millisecond, 0],
    ];
    const order = options?.order || source.order || types_js_1.TimeOrder.DESC;
    const activeTokens = order === types_js_1.TimeOrder.ASC ? [...tokens].reverse() : tokens;
    for (const [pref, val] of activeTokens) {
        if (val !== undefined) {
            time += `.${pref}${val}`;
        }
    }
    if (source.signature) {
        time += `!${source.signature}`;
    }
    return time;
}
/**
 * Parse the time portion of a TPS string into components.
 */
function parseTimeString(input) {
    let s = input.trim();
    s = s.split(/[!;?#]/)[0];
    if (s.startsWith("T:"))
        s = s.slice(2);
    const firstDot = s.indexOf(".");
    const calendar = firstDot === -1 ? s : s.slice(0, firstDot);
    const rawTokenString = firstDot === -1 ? "" : s.slice(firstDot + 1);
    if (calendar === types_js_1.DefaultCalendars.TPS && (0, tps_native_js_1.isTpsIndexedToken)(rawTokenString)) {
        const indexed = (0, tps_native_js_1.parseTpsIndexedToken)(rawTokenString);
        if (!indexed)
            return null;
        return {
            components: (0, tps_native_js_1.normalizeTpsComponents)({
                calendar,
                ...indexed,
            }),
            order: types_js_1.TimeOrder.DESC,
        };
    }
    if (calendar === types_js_1.DefaultCalendars.TPS && /^i/i.test(rawTokenString)) {
        return null;
    }
    const parts = s.split(".");
    if (parts.length === 0)
        return null;
    const comp = { calendar };
    const fixedRankMap = {
        c: 7,
        y: 6,
        w: 4.5,
        d: 4,
        h: 3,
        s: 1,
    };
    let initialOrder = types_js_1.TimeOrder.DESC;
    if (calendar !== types_js_1.DefaultCalendars.UNIX) {
        const nonMRanks = [];
        for (let i = 1; i < parts.length; i++) {
            const pr = parts[i]?.charAt(0);
            if (pr && pr in fixedRankMap)
                nonMRanks.push(fixedRankMap[pr]);
        }
        if (nonMRanks.length >= 2) {
            const isAsc = nonMRanks.every((v, i, a) => i === 0 || a[i - 1] <= v);
            if (isAsc)
                initialOrder = types_js_1.TimeOrder.ASC;
        }
    }
    const assignMRank = (lastRank, ord) => {
        if (ord === types_js_1.TimeOrder.DESC) {
            if (lastRank === null)
                return 8;
            if (lastRank > 5)
                return 5;
            if (lastRank > 2)
                return 2;
            return 0;
        }
        else {
            if (lastRank === null)
                return 0;
            if (lastRank < 2)
                return 2;
            if (lastRank < 5)
                return 5;
            return 8;
        }
    };
    const ranks = [];
    let lastAssignedRank = null;
    for (let i = 1; i < parts.length; i++) {
        const token = parts[i];
        if (!token)
            continue;
        const prefix = token.charAt(0);
        const value = token.slice(1);
        if (calendar === types_js_1.DefaultCalendars.UNIX && prefix === "s") {
            comp.unixSeconds = parseFloat(value);
            ranks.push(9);
            continue;
        }
        if (prefix === "m") {
            const rank = assignMRank(lastAssignedRank, initialOrder);
            switch (rank) {
                case 8:
                    comp.millennium = parseInt(value, 10);
                    break;
                case 5:
                    comp.month = parseInt(value, 10);
                    break;
                case 2:
                    comp.minute = parseInt(value, 10);
                    break;
                case 0:
                    comp.millisecond = parseInt(value, 10);
                    break;
            }
            ranks.push(rank);
            lastAssignedRank = rank;
        }
        else {
            const rank = fixedRankMap[prefix];
            if (rank !== undefined) {
                switch (prefix) {
                    case "c":
                        comp.century = parseInt(value, 10);
                        break;
                    case "y":
                        comp.year = parseInt(value, 10);
                        break;
                    case "w":
                        comp.week = parseInt(value, 10);
                        break;
                    case "d":
                        comp.day = parseInt(value, 10);
                        break;
                    case "h":
                        comp.hour = parseInt(value, 10);
                        break;
                    case "s":
                        comp.second = parseFloat(value);
                        break;
                }
                ranks.push(rank);
                lastAssignedRank = rank;
            }
        }
    }
    let order = types_js_1.TimeOrder.DESC;
    if (ranks.length > 1) {
        const isAsc = ranks.every((v, i, a) => i === 0 || a[i - 1] <= v);
        const isDesc = ranks.every((v, i, a) => i === 0 || a[i - 1] >= v);
        if (isAsc && !isDesc)
            order = types_js_1.TimeOrder.ASC;
    }
    if (calendar === types_js_1.DefaultCalendars.TPS &&
        comp.month !== undefined &&
        comp.day !== undefined &&
        comp.month >= 1 &&
        comp.day >= 1) {
        return {
            components: (0, tps_native_js_1.normalizeTpsComponents)(comp),
            order,
        };
    }
    return { components: comp, order };
}
//# sourceMappingURL=tps-string.js.map