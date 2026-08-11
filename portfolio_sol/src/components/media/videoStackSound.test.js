import { describe, expect, it } from "vitest";
import { shouldResetVideoStackSound } from "./videoStackSound";

describe("video stack sound transitions", () => {
  it("requires a new interaction when the active video changes", () => {
    expect(shouldResetVideoStackSound(3, 0, true)).toBe(true);
    expect(shouldResetVideoStackSound(0, 1, true)).toBe(true);
    expect(shouldResetVideoStackSound(0, 0, true)).toBe(false);
    expect(shouldResetVideoStackSound(0, 1, false)).toBe(false);
  });
});
