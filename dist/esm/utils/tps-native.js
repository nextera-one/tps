export const TPS_DAY_MS = 24 * 60 * 60 * 1000;
export const TPS_DAY_START_OFFSET_MS = 7 * 60 * 60 * 1000;
export const TPS_DAYS_PER_WEEK = 7;
export const TPS_WEEKS_PER_MONTH = 4;
export const TPS_MONTHS_PER_YEAR = 12;
export const TPS_DAYS_PER_MONTH = TPS_DAYS_PER_WEEK * TPS_WEEKS_PER_MONTH;
export const TPS_DAYS_PER_YEAR = TPS_DAYS_PER_MONTH * TPS_MONTHS_PER_YEAR;
export const TPS_EPOCH_START_MS = Date.UTC(1999, 7, 11, 7, 0, 0, 0);
function floorDiv(value, divisor) {
    return Math.floor(value / divisor);
}
function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
}
function getFractionalMilliseconds(second) {
    if (second === undefined)
        return 0;
    const fractional = second - Math.floor(second);
    return Math.round(fractional * 1000);
}
function normalizeIndexedParts(dayIndex, dayFraction) {
    const roundedSubDayMilliseconds = Math.round(dayFraction * TPS_DAY_MS);
    const dayCarry = floorDiv(roundedSubDayMilliseconds, TPS_DAY_MS);
    const subDayMilliseconds = mod(roundedSubDayMilliseconds, TPS_DAY_MS);
    const normalizedDayIndex = dayIndex + dayCarry;
    return {
        dayIndex: normalizedDayIndex,
        dayFraction: subDayMilliseconds / TPS_DAY_MS,
        subDayMilliseconds,
    };
}
export function splitTpsFullYear(fullYear) {
    const millennium = floorDiv(fullYear, 1000) + 1;
    const withinMillennium = mod(fullYear, 1000);
    const century = floorDiv(withinMillennium, 100) + 1;
    const year = mod(fullYear, 100);
    return { millennium, century, year };
}
export function getTpsFullYear(components) {
    if (components.millennium !== undefined ||
        components.century !== undefined) {
        return (((components.millennium ?? 1) - 1) * 1000 +
            ((components.century ?? 1) - 1) * 100 +
            (components.year ?? 0));
    }
    return components.year ?? 0;
}
export function getTpsDayOfMonth(components) {
    const day = components.day ?? 1;
    const week = components.week;
    if (week !== undefined && day >= 1 && day <= TPS_DAYS_PER_WEEK) {
        return (week - 1) * TPS_DAYS_PER_WEEK + day;
    }
    return day;
}
export function getTpsSubDayMilliseconds(input) {
    if (input instanceof Date) {
        const indexed = getTpsIndexedFromDate(input);
        return indexed.subDayMilliseconds;
    }
    if (input.subDayMilliseconds !== undefined) {
        return input.subDayMilliseconds;
    }
    const hour = input.hour ?? 0;
    const minute = input.minute ?? 0;
    const second = Math.floor(input.second ?? 0);
    const millisecond = input.millisecond ?? getFractionalMilliseconds(input.second);
    return (hour * 60 * 60 * 1000 +
        minute * 60 * 1000 +
        second * 1000 +
        millisecond);
}
export function getTpsIndexedFromDate(date) {
    const deltaMs = date.getTime() - TPS_EPOCH_START_MS;
    const dayIndex = floorDiv(deltaMs, TPS_DAY_MS);
    const subDayMilliseconds = mod(deltaMs, TPS_DAY_MS);
    return {
        dayIndex,
        dayFraction: subDayMilliseconds / TPS_DAY_MS,
        subDayMilliseconds,
    };
}
export function buildTpsComponentsFromDayIndex(dayIndex, dayFraction = 0) {
    const indexed = normalizeIndexedParts(dayIndex, dayFraction);
    const fullYear = floorDiv(indexed.dayIndex, TPS_DAYS_PER_YEAR);
    const dayOfYear = mod(indexed.dayIndex, TPS_DAYS_PER_YEAR);
    const month = floorDiv(dayOfYear, TPS_DAYS_PER_MONTH) + 1;
    const dayOfMonth = mod(dayOfYear, TPS_DAYS_PER_MONTH) + 1;
    const week = floorDiv(dayOfMonth - 1, TPS_DAYS_PER_WEEK) + 1;
    let remainder = indexed.subDayMilliseconds;
    const hour = floorDiv(remainder, 60 * 60 * 1000);
    remainder = mod(remainder, 60 * 60 * 1000);
    const minute = floorDiv(remainder, 60 * 1000);
    remainder = mod(remainder, 60 * 1000);
    const second = floorDiv(remainder, 1000);
    const millisecond = mod(remainder, 1000);
    return {
        calendar: "tps",
        ...splitTpsFullYear(fullYear),
        month,
        week,
        day: dayOfMonth,
        hour,
        minute,
        second,
        millisecond,
        dayIndex: indexed.dayIndex,
        dayFraction: indexed.dayFraction,
        subDayMilliseconds: indexed.subDayMilliseconds,
    };
}
export function normalizeTpsComponents(components) {
    if (components.dayIndex !== undefined) {
        const dayFraction = components.dayFraction ??
            (getTpsSubDayMilliseconds(components) / TPS_DAY_MS);
        const normalized = buildTpsComponentsFromDayIndex(components.dayIndex, dayFraction);
        return {
            ...components,
            ...normalized,
            calendar: "tps",
            fractionPrecision: components.fractionPrecision,
        };
    }
    const fullYear = getTpsFullYear(components);
    const month = components.month ?? 1;
    const dayOfMonth = getTpsDayOfMonth(components);
    const subDayMilliseconds = getTpsSubDayMilliseconds(components);
    const week = components.week ?? floorDiv(dayOfMonth - 1, TPS_DAYS_PER_WEEK) + 1;
    const timeParts = buildTpsComponentsFromDayIndex(fullYear * TPS_DAYS_PER_YEAR +
        (month - 1) * TPS_DAYS_PER_MONTH +
        (dayOfMonth - 1), subDayMilliseconds / TPS_DAY_MS);
    return {
        ...components,
        ...splitTpsFullYear(fullYear),
        ...timeParts,
        calendar: "tps",
        month,
        week,
        day: dayOfMonth,
        dayIndex: fullYear * TPS_DAYS_PER_YEAR +
            (month - 1) * TPS_DAYS_PER_MONTH +
            (dayOfMonth - 1),
        dayFraction: subDayMilliseconds / TPS_DAY_MS,
        subDayMilliseconds,
    };
}
export function getTpsDayIndex(input) {
    if (input instanceof Date) {
        return getTpsIndexedFromDate(input).dayIndex;
    }
    if (input.dayIndex !== undefined) {
        return input.dayIndex;
    }
    const fullYear = getTpsFullYear(input);
    const month = input.month ?? 1;
    const dayOfMonth = getTpsDayOfMonth(input);
    return (fullYear * TPS_DAYS_PER_YEAR +
        (month - 1) * TPS_DAYS_PER_MONTH +
        (dayOfMonth - 1));
}
export function getTpsDayFraction(input) {
    if (input instanceof Date) {
        return getTpsIndexedFromDate(input).dayFraction;
    }
    if (input.dayFraction !== undefined) {
        return input.dayFraction;
    }
    return getTpsSubDayMilliseconds(input) / TPS_DAY_MS;
}
export function parseTpsIndexedToken(token) {
    const match = token.trim().match(/^i(\d+)(?:\.(\d+))?$/i);
    if (!match)
        return null;
    const dayIndex = Number(match[1]);
    if (!Number.isSafeInteger(dayIndex) || dayIndex < 0) {
        return null;
    }
    const digits = match[2];
    if (digits && digits.endsWith("0")) {
        return null;
    }
    const dayFraction = digits ? Number(`0.${digits}`) : 0;
    if (!Number.isFinite(dayFraction) || dayFraction < 0 || dayFraction >= 1) {
        return null;
    }
    const normalized = normalizeIndexedParts(dayIndex, dayFraction);
    return {
        ...normalized,
        fractionPrecision: digits?.length,
    };
}
export function formatTpsIndexedToken(components, precision) {
    const normalized = normalizeTpsComponents(components);
    const dayIndex = normalized.dayIndex ?? 0;
    const dayFraction = normalized.dayFraction ?? 0;
    const effectivePrecision = precision ?? normalized.fractionPrecision ?? 9;
    let fraction = "";
    if (dayFraction > 0 && effectivePrecision > 0) {
        fraction = dayFraction
            .toFixed(effectivePrecision)
            .slice(2)
            .replace(/0+$/g, "");
    }
    return fraction ? `i${dayIndex}.${fraction}` : `i${dayIndex}`;
}
export function isTpsIndexedToken(token) {
    return /^i\d+(?:\.\d+)?$/i.test(token.trim());
}
export function validateTpsComponents(components) {
    const month = components.month ?? 1;
    const day = components.day ?? 1;
    const week = components.week;
    const hour = components.hour ?? 0;
    const minute = components.minute ?? 0;
    const second = components.second ?? 0;
    const millisecond = components.millisecond ?? getFractionalMilliseconds(components.second);
    if (components.dayIndex !== undefined &&
        (!Number.isSafeInteger(components.dayIndex) || components.dayIndex < 0)) {
        return false;
    }
    if (components.dayFraction !== undefined &&
        (!Number.isFinite(components.dayFraction) ||
            components.dayFraction < 0 ||
            components.dayFraction >= 1)) {
        return false;
    }
    if (month < 1 || month > TPS_MONTHS_PER_YEAR)
        return false;
    if (day < 1 || day > TPS_DAYS_PER_MONTH)
        return false;
    if (week !== undefined && (week < 1 || week > TPS_WEEKS_PER_MONTH)) {
        return false;
    }
    if (week !== undefined && day > TPS_DAYS_PER_WEEK) {
        const expectedWeek = floorDiv(day - 1, TPS_DAYS_PER_WEEK) + 1;
        if (expectedWeek !== week)
            return false;
    }
    if (hour < 0 || hour > 23)
        return false;
    if (minute < 0 || minute > 59)
        return false;
    if (second < 0 || second >= 60)
        return false;
    if (millisecond < 0 || millisecond >= 1000)
        return false;
    return true;
}
//# sourceMappingURL=tps-native.js.map