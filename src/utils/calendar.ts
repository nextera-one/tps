/**
 * Shared Calendar Math Utilities
 */

/**
 * Gregorian -> Julian Day Number
 */
export function gregorianToJdn(gy: number, gm: number, gd: number): number {
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  return (
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Julian Day Number -> Gregorian
 */
export function jdnToGregorian(jdn: number): {
  gy: number;
  gm: number;
  gd: number;
} {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const gd = e - Math.floor((153 * m + 2) / 5) + 1;
  const gm = m + 3 - 12 * Math.floor(m / 10);
  const gy = 100 * b + d - 4800 + Math.floor(m / 10);
  return { gy, gm, gd };
}

/**
 * Julian -> Julian Day Number
 */
export function julianToJdn(jy: number, jm: number, jd: number): number {
  const a = Math.floor((14 - jm) / 12);
  const y = jy + 4800 - a;
  const m = jm + 12 * a - 3;
  return (
    jd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083
  );
}

/**
 * Julian Day Number -> Julian
 */
export function jdnToJulian(jdn: number): {
  jy: number;
  jm: number;
  jd: number;
} {
  const c = jdn + 32082;
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const jd = e - Math.floor((153 * m + 2) / 5) + 1;
  const jm = m + 3 - 12 * Math.floor(m / 10);
  const jy = d - 4800 + Math.floor(m / 10);
  return { jy, jm, jd };
}

/**
 * Persian -> Julian Day Number
 */
export function persianToJdn(jy: number, jm: number, jd: number): number {
  const EPOCH = 1948320;
  const epbase = jy - (jy >= 0 ? 474 : 473);
  const epyear = 474 + (epbase % 2820);
  return (
    jd +
    (jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) +
    Math.floor((epyear * 682 - 110) / 2816) +
    (epyear - 1) * 365 +
    Math.floor(epbase / 2820) * 1029983 +
    EPOCH -
    1
  );
}

/**
 * Julian Day Number -> Persian
 */
export function jdnToPersian(jdn: number): {
  jy: number;
  jm: number;
  jd: number;
} {
  const depoch = jdn - persianToJdn(475, 1, 1);
  const cycle = Math.floor(depoch / 1029983);
  const cyear = depoch % 1029983;
  let ycycle: number;
  if (cyear === 1029982) {
    ycycle = 2820;
  } else {
    const aux1 = Math.floor(cyear / 366);
    const aux2 = cyear % 366;
    ycycle =
      Math.floor((2134 * aux1 + 2816 * aux2 + 2815) / 1028522) + aux1 + 1;
  }
  const jy = ycycle + 2820 * cycle + 474;
  const yday = jdn - persianToJdn(jy, 1, 1) + 1;
  const jm = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
  const jd = jdn - persianToJdn(jy, jm, 1) + 1;
  return { jy: jy <= 0 ? jy - 1 : jy, jm, jd };
}

/**
 * Convert Gregorian to Hijri (Tabular Islamic Calendar).
 */
export function gregorianToHijri(
  gy: number,
  gm: number,
  gd: number,
): { hy: number; hm: number; hd: number } {
  const jdn = gregorianToJdn(gy, gm, gd);
  const L = jdn - 1948440 + 10632;
  const N = Math.floor((L - 1) / 10631);
  const L2 = L - 10631 * N + 354;
  const J =
    Math.floor((10985 - L2) / 5316) * Math.floor((50 * L2) / 17719) +
    Math.floor(L2 / 5670) * Math.floor((43 * L2) / 15238);
  const L3 =
    L2 -
    Math.floor((30 - J) / 15) * Math.floor((17719 * J) / 50) -
    Math.floor(J / 16) * Math.floor((15238 * J) / 43) +
    29;
  const hm = Math.floor((24 * L3) / 709);
  const hd = L3 - Math.floor((709 * hm) / 24);
  const hy = 30 * N + J - 30;
  return { hy, hm, hd };
}

/**
 * Convert Hijri to Gregorian.
 */
export function hijriToGregorian(
  hy: number,
  hm: number,
  hd: number,
): { gy: number; gm: number; gd: number } {
  const jdn =
    Math.floor((11 * hy + 3) / 30) +
    354 * hy +
    30 * hm -
    Math.floor((hm - 1) / 2) +
    hd +
    1948440 -
    385;
  return jdnToGregorian(jdn);
}
