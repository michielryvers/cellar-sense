import { getOnlineStatus, useOnlineStatus } from "../network-status";
import { describe, it, expect } from "vitest";

describe("network-status", () => {
  it("returns a boolean for current status", () => {
    const status = getOnlineStatus();
    expect(typeof status).toBe("boolean");
  });

  it("useOnlineStatus returns observable and value", () => {
    const { isOnline$, currentStatus } = useOnlineStatus();
    expect(isOnline$).toBeDefined();
    expect(currentStatus).toBeDefined();
  });
});
