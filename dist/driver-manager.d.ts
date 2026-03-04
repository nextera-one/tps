/**
 * TPS DriverManager
 * Manages the registry of calendar driver plugins.
 */
import { CalendarDriver } from "./types";
/**
 * A dedicated registry for TPS calendar driver plugins.
 * The global `TPS` class exposes a shared singleton instance (`TPS.driverManager`).
 */
export declare class DriverManager {
    private readonly registry;
    /**
     * Registers a calendar driver.
     * Overwrites any previously registered driver with the same code.
     */
    register(driver: CalendarDriver): void;
    /**
     * Returns the driver registered for the given calendar code, or `undefined`.
     */
    get(code: string): CalendarDriver | undefined;
    /**
     * Returns `true` if a driver with the given code has been registered.
     */
    has(code: string): boolean;
    /**
     * Returns an array of all registered calendar codes.
     */
    list(): string[];
    /**
     * Removes a driver from the registry.
     * Returns `true` if the driver existed and was removed.
     */
    unregister(code: string): boolean;
}
