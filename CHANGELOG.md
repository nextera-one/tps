# Changelog

All notable changes to `@nextera.one/tps-standard` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.5.35] — 2026-03-04

### Added

- **`TPS.now(calendar?, opts?)`** — shorthand for `TPS.fromDate(new Date(), calendar, opts)`.
- **`TPS.diff(t1, t2)`** — returns elapsed time in milliseconds between two TPS strings (`t2 − t1`).
- **`TPS.add(tpsStr, duration)`** — returns a new TPS string shifted by a `{days, hours, minutes, seconds, milliseconds}` duration object. Preserves original calendar and time order.
- **Chinese Lunisolar calendar driver** (`chin`) — Huangdi year numbering (≈4722 = 2024 CE), Sexagenary ganzhi cycle, month formatting in romanized and Chinese character form (`zh` format).
- **`DriverManager` class** — dedicated driver registry. `TPS.driverManager` exposes `register()`, `get()`, `has()`, `list()`, and `unregister()`. The static `TPS.registerDriver()` / `TPS.getDriver()` methods are preserved as convenience shorthands.
- **`src/utils/timezone.ts`** — zero-dependency timezone utility using `Intl.DateTimeFormat`. Supports IANA names (`Asia/Tehran`), fixed offsets (`+03:30`), and common abbreviations (`IRST`, `JST`, `EST`, …).
- **Timezone-aware `TPS.toDate()`** — when a parsed TPS URI has a `;tz=` extension, the returned `Date` is automatically converted from local → UTC.
- **ESM dual-mode build** — `dist/esm/index.js` emitted via `tsconfig.esm.json`. `package.json` `"exports"` field routes `import` to ESM and `require` to CJS.
- **Browser IIFE bundle** — `dist/tps.min.js` (global `window.TPS`) built via Rollup (`npm run bundle`).

### Changed

- Internal driver registry moved from a private `Map` in `TPS` to `DriverManager`.
- `package.json`: added `"module"`, `"browser"`, `"exports"` fields; build script now also emits ESM.

---

## [0.5.34] — 2026-03-04

### Changed

- Version bump after authentication issue during 0.5.4 publish attempt.

---

## [0.5.33] — 2026-03-03

### Added

- Full library modularization:
  - `src/types.ts` — shared interfaces and enums.
  - `src/uid.ts` — `TPSUID7RB` binary UID logic.
  - `src/date.ts` — `TpsDate` wrapper with component caching.
  - `src/utils/env.ts` — Node.js / Browser polyfill layer.
  - `src/utils/calendar.ts` — centralized JDN math.
  - `src/utils/tps-string.ts` — TPS string build / parse utilities (breaks circular deps).
- Calendar drivers: **Persian** (`per`), **Hijri** (`hij`), **Julian** (`jul`), **Holocene** (`holo`).
- `TPS.parseCalendarDate()`, `TPS.fromCalendarDate()`, `TPS.formatCalendarDate()` convenience helpers.
- `TPS.sanitizeTimeInput()` — normalizes casing, whitespace, legacy `/T:` separator, and detects ascending order.

### Fixed

- Persian calendar JDN → month calculation typo (divisor 108 → 31).
- All circular dependencies between drivers and the main TPS class.

---

## [0.5.3] — 2026-03-02

### Changed

- Minor internal refactoring and stability fixes.

---

## [0.5.2] — 2026-02-28

### Added

- `TPSUID7RB` binary reversible IDs.
- Ascending (`TimeOrder.ASC`) time string support.
- Pre-`@` generic space anchors (`adm:`, `node:`, `net:ip4:`, `planet:`, …).
- Structural anchors (`bldg=`, `floor=`, `room=`, `zone=`).
- Geospatial cell anchors (`s2=`, `h3=`, `plus=`, `w3w=`).
- Actor anchor (`A:`), cryptographic signature (`!`).

---

## [0.5.0] — 2026-02-01

### Added

- Initial public release.
- Core TPS URI parsing, validation, and serialization.
- Gregorian (`greg`) and Unix (`unix`) built-in calendar drivers.
- `TpsDate` — Date-like wrapper with TPS conversion helpers.
