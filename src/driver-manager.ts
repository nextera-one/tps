/**
 * TPS DriverManager
 * Manages the registry of calendar driver plugins.
 */

import { CalendarDriver } from "./types";

/**
 * A dedicated registry for TPS calendar driver plugins.
 * The global `TPS` class exposes a shared singleton instance (`TPS.driverManager`).
 */
export class DriverManager {
  private readonly registry = new Map<string, CalendarDriver>();

  /**
   * Registers a calendar driver.
   * Overwrites any previously registered driver with the same code.
   */
  register(driver: CalendarDriver): void {
    if (!driver || !driver.code) {
      throw new Error("DriverManager: driver must have a valid `code` string.");
    }
    this.registry.set(driver.code, driver);
  }

  /**
   * Returns the driver registered for the given calendar code, or `undefined`.
   */
  get(code: string): CalendarDriver | undefined {
    return this.registry.get(code);
  }

  /**
   * Returns `true` if a driver with the given code has been registered.
   */
  has(code: string): boolean {
    return this.registry.has(code);
  }

  /**
   * Returns an array of all registered calendar codes.
   */
  list(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Removes a driver from the registry.
   * Returns `true` if the driver existed and was removed.
   */
  unregister(code: string): boolean {
    return this.registry.delete(code);
  }
}
