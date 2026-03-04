/**
 * TPS DriverManager
 * Manages the registry of calendar driver plugins.
 */
/**
 * A dedicated registry for TPS calendar driver plugins.
 * The global `TPS` class exposes a shared singleton instance (`TPS.driverManager`).
 */
export class DriverManager {
    constructor() {
        this.registry = new Map();
    }
    /**
     * Registers a calendar driver.
     * Overwrites any previously registered driver with the same code.
     */
    register(driver) {
        if (!driver || !driver.code) {
            throw new Error("DriverManager: driver must have a valid `code` string.");
        }
        this.registry.set(driver.code, driver);
    }
    /**
     * Returns the driver registered for the given calendar code, or `undefined`.
     */
    get(code) {
        return this.registry.get(code);
    }
    /**
     * Returns `true` if a driver with the given code has been registered.
     */
    has(code) {
        return this.registry.has(code);
    }
    /**
     * Returns an array of all registered calendar codes.
     */
    list() {
        return Array.from(this.registry.keys());
    }
    /**
     * Removes a driver from the registry.
     * Returns `true` if the driver existed and was removed.
     */
    unregister(code) {
        return this.registry.delete(code);
    }
}
//# sourceMappingURL=driver-manager.js.map