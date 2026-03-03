# TPS — Temporal Positioning Standard

![TPS — Temporal Positioning Standard](assets/tps-banner.svg)

A universal protocol for representing **time + location + context** in a single coordinate.

## Installation

```bash
npm i @nextera.one/tps-standard
```

## Quick Start

```ts
import {
  TPS,
  TpsDate,
  DefaultCalendars,
  TimeOrder,
  TPSUID7RB,
} from "@nextera.one/tps-standard";

// 1) Date -> TPS time string
const tpsTime = TPS.fromDate(
  new Date("2026-01-09T14:30:25Z"),
  DefaultCalendars.GREG,
);
// T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0

// 2) Build full TPS URI
const uri = TPS.toURI({
  calendar: "greg",
  millennium: 3,
  century: 1,
  year: 26,
  month: 1,
  day: 9,
  hour: 14,
  minute: 30,
  second: 25,
  millisecond: 0,
  latitude: 31.95,
  longitude: 35.91,
  altitude: 800,
});
// tps://L:31.95,35.91,800m@T:greg.m3.c1.y26.m1.d9.h14.m30.s25.m0

// 3) Parse back
const parsed = TPS.parse(uri);

// 4) Generate reversible TPS UID (binary base64url form)
const uid = TPSUID7RB.encodeBinaryB64(uri);
const decoded = TPSUID7RB.decodeBinaryB64(uid);
```

## Time Format

Canonical time token order is descending hierarchy:

```txt
T:greg.m3.c1.y26.m01.d13.h09.m30.s12.m0
```

Where:

- `m` (rank 8) = millennium
- `c` = century
- `y` = year in century
- `m` (rank 5) = month
- `d` = day
- `h` = hour
- `m` (rank 2) = minute
- `s` = second
- `m` (rank 0) = millisecond

Ascending order is supported via `TimeOrder.ASC` and is auto-detected during parsing.

## URI Format

```txt
tps://[SPACE][ /A:actor ]@T:[calendar].[tokens][!signature][;extensions][?query][#fragment]
```

### Supported space anchors

- Privacy: `L:-`, `L:~`, `L:redacted`, `unknown`, `hidden`, `redacted`
- Coordinates: `L:lat,lon[,alt]m`
- Cells: `L:s2=...`, `L:h3=...`, `L:plus=...`, `L:w3w=...`
- Structural: `L:bldg=...(.floor=...)(.room=...)(.zone=...)`
- Generic pre-`@` anchors: `adm:...`, `node:...`, `net:ip4:...`, `net:ip6:...`, `planet:...`, `P:...`

## Calendars

Built-in drivers:

- `tps`
- `greg`
- `unix`

Additional calendars can be plugged in via `TPS.registerDriver(driver)`.

Calendar code width is enforced to **3–4 lowercase letters** when generating TPS time strings.

## TpsDate

`TpsDate` is a Date-like wrapper that works directly with TPS.

```ts
import {
  TpsDate,
  DefaultCalendars,
  TimeOrder,
} from "@nextera.one/tps-standard";

const td = new TpsDate("tps://unknown@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0");

// Native Gregorian Date clone
const gregorian = td.toGregorianDate();

// Alias (same value)
const same = td.toDate();

// TPS time in desired calendar
const asTps = td.toTPS(DefaultCalendars.TPS, { order: TimeOrder.DESC });

// Full URI
const uri = td.toTPSURI(DefaultCalendars.GREG, {
  latitude: 31.95,
  longitude: 35.91,
  altitude: 800,
});
```

## TPSUID7RB (Reversible Binary ID)

```ts
import { TPSUID7RB } from "@nextera.one/tps-standard";

const tps = "tps://node:api-1@T:greg.m3.c1.y26.m01.d09.h14.m30.s25.m0";

const id = TPSUID7RB.encodeBinaryB64(tps, { compress: true });
const out = TPSUID7RB.decodeBinaryB64(id);
// out.tps === tps
```

## Scripts

```bash
npm run build
npm run tests
```

## License

Apache-2.0
