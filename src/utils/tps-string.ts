import {
  TPSComponents,
  TimeOrder,
  DefaultCalendars,
  TPSTimeOptions,
} from "../types";
import {
  formatTpsIndexedToken,
  isTpsIndexedToken,
  normalizeTpsComponents,
  parseTpsIndexedToken,
} from "./tps-native";

/**
 * Generate the canonical `T:` time string for a set of components.
 */
export function buildTimePart(
  comp: Partial<TPSComponents>,
  options?: TPSTimeOptions,
): string {
  const calendar = (comp.calendar || "").toLowerCase();
  if (!/^[a-z]{3,4}$/.test(calendar)) {
    throw new Error(
      `Invalid calendar code '${comp.calendar}'. Calendar code width must be 3–4 lowercase letters.`,
    );
  }

  let time = `T:${calendar}`;
  if (calendar === DefaultCalendars.UNIX) {
    if (comp.unixSeconds !== undefined) {
      time += `.s${comp.unixSeconds}`;
    }
    return time;
  }

  if (calendar === DefaultCalendars.TPS && options?.timeMode === "indexed-fraction") {
    time += `.${formatTpsIndexedToken(comp, options.indexedPrecision)}`;

    if (comp.signature) {
      time += `!${comp.signature}`;
    }

    return time;
  }

  const source =
    calendar === DefaultCalendars.TPS ? normalizeTpsComponents(comp) : comp;

  const tokens: Array<[string, number | undefined, number]> = [
    ["m", source.millennium, 8],
    ["c", source.century, 7],
    ["y", source.year, 6],
    ["m", source.month, 5],
    ...(calendar === DefaultCalendars.TPS && source.week !== undefined
      ? [["w", source.week, 4.5] as [string, number | undefined, number]]
      : []),
    ["d", source.day, 4],
    ["h", source.hour, 3],
    ["m", source.minute, 2],
    ["s", source.second, 1],
    ["m", source.millisecond, 0],
  ];

  const order: TimeOrder = options?.order || source.order || TimeOrder.DESC;
  const activeTokens = order === TimeOrder.ASC ? [...tokens].reverse() : tokens;

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
export function parseTimeString(
  input: string,
): { components: Partial<TPSComponents>; order: TimeOrder } | null {
  let s = input.trim();
  s = s.split(/[!;?#]/)[0];
  if (s.startsWith("T:")) s = s.slice(2);

  const firstDot = s.indexOf(".");
  const calendar = firstDot === -1 ? s : s.slice(0, firstDot);
  const rawTokenString = firstDot === -1 ? "" : s.slice(firstDot + 1);

  if (calendar === DefaultCalendars.TPS && isTpsIndexedToken(rawTokenString)) {
    const indexed = parseTpsIndexedToken(rawTokenString);
    if (!indexed) return null;
    return {
      components: normalizeTpsComponents({
        calendar,
        ...indexed,
      }),
      order: TimeOrder.DESC,
    };
  }

  if (calendar === DefaultCalendars.TPS && /^i/i.test(rawTokenString)) {
    return null;
  }

  const parts = s.split(".");
  if (parts.length === 0) return null;
  const comp: Partial<TPSComponents> = { calendar };

  const fixedRankMap: Record<string, number> = {
    c: 7,
    y: 6,
    w: 4.5,
    d: 4,
    h: 3,
    s: 1,
  };

  let initialOrder: TimeOrder = TimeOrder.DESC;
  if (calendar !== DefaultCalendars.UNIX) {
    const nonMRanks: number[] = [];
    for (let i = 1; i < parts.length; i++) {
      const pr = parts[i]?.charAt(0);
      if (pr && pr in fixedRankMap) nonMRanks.push(fixedRankMap[pr]);
    }
    if (nonMRanks.length >= 2) {
      const isAsc = nonMRanks.every((v, i, a) => i === 0 || a[i - 1] <= v);
      if (isAsc) initialOrder = TimeOrder.ASC;
    }
  }

  const assignMRank = (lastRank: number | null, ord: TimeOrder): number => {
    if (ord === TimeOrder.DESC) {
      if (lastRank === null) return 8;
      if (lastRank > 5) return 5;
      if (lastRank > 2) return 2;
      return 0;
    } else {
      if (lastRank === null) return 0;
      if (lastRank < 2) return 2;
      if (lastRank < 5) return 5;
      return 8;
    }
  };

  const ranks: number[] = [];
  let lastAssignedRank: number | null = null;

  for (let i = 1; i < parts.length; i++) {
    const token = parts[i];
    if (!token) continue;
    const prefix = token.charAt(0);
    const value = token.slice(1);

    if (calendar === DefaultCalendars.UNIX && prefix === "s") {
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
    } else {
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

  let order: TimeOrder = TimeOrder.DESC;
  if (ranks.length > 1) {
    const isAsc = ranks.every((v, i, a) => i === 0 || a[i - 1] <= v);
    const isDesc = ranks.every((v, i, a) => i === 0 || a[i - 1] >= v);
    if (isAsc && !isDesc) order = TimeOrder.ASC;
  }

  if (
    calendar === DefaultCalendars.TPS &&
    comp.month !== undefined &&
    comp.day !== undefined &&
    comp.month >= 1 &&
    comp.day >= 1
  ) {
    return {
      components: normalizeTpsComponents(comp),
      order,
    };
  }

  return { components: comp, order };
}
