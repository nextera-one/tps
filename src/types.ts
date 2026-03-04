/**
 * TPS: Temporal Positioning System
 * Shared types and interfaces.
 */

/**
 * Calendar codes are plain strings to allow arbitrary user-defined
 * calendars. The library still exports constants for the built-in values.
 */
export const DefaultCalendars = {
  TPS: "tps",
  GREG: "greg",
  HIJ: "hij",
  PER: "per",
  JUL: "jul",
  HOLO: "holo",
  UNIX: "unix",
  CHIN: "chin",
} as const;

/**
 * Specifies the direction of the time-component hierarchy when serializing or
 * deserializing a TPS string. The default is 'descending'.
 */
export enum TimeOrder {
  DESC = "desc",
  ASC = "asc",
}

export interface TPSComponents {
  // --- TEMPORAL ---
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

  // --- OPTIONAL UNIX BACKUP ---
  unixSeconds?: number;

  // --- SPATIAL: GPS Coordinates ---
  latitude?: number;
  longitude?: number;
  altitude?: number;

  // --- SPATIAL: Geospatial Cells ---
  s2Cell?: string;
  h3Cell?: string;
  plusCode?: string;
  what3words?: string;

  // --- SPATIAL: Place layer (P:cc=JO,ci=AMM,...) ---
  /** ISO 3166-1 alpha-2 country code, e.g. "JO"  →  P:cc=JO */
  placeCountryCode?: string;
  /** Full country name, e.g. "Jordan"             →  P:cn=Jordan */
  placeCountryName?: string;
  /** City IATA/ISO code, e.g. "AMM"               →  P:ci=AMM */
  placeCityCode?: string;
  /** Full city name, e.g. "Amman"                 →  P:ct=Amman */
  placeCityName?: string;

  // --- SPATIAL: Network / Digital Location ---
  /** IPv4 address (net:ip4:x or NIP4:x) */
  ipv4?: string;
  /** IPv6 address (net:ip6:x or NIP6:x) */
  ipv6?: string;
  /** Logical node / host name (node:api-1 or NODE:api-1) */
  nodeName?: string;

  // --- SPATIAL: Structural Anchors ---
  building?: string;
  floor?: string;
  room?: string;
  door?: string;
  zone?: string;

  /** Raw pre-@ space anchor (generic/legacy/planet/adm) */
  spaceAnchor?: string;

  // --- SPATIAL: Privacy Markers ---
  isUnknownLocation?: boolean;
  isRedactedLocation?: boolean;
  isHiddenLocation?: boolean;

  // --- PROVENANCE ---
  actor?: string;
  signature?: string;

  // --- EXTENSIONS (;KEY:val or ;key=val after T: tokens, before #) ---
  extensions?: Record<string, string>;

  // --- CONTEXT (#C:key=val;key=val in fragment) ---
  /** Structured context key-value pairs from the #C: fragment block */
  context?: Record<string, string>;

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
