import { ref } from "vue";
import { describe, expect, it } from "vitest";
import { useSelfFishState } from "../composables/useSelfFishState.js";

describe("self fish state composable", () => {
  it("shows the non-study timer subject as a localized label", () => {
    const fish = useSelfFishState(ref(null));

    expect(fish.subjectName("nonStudy")).toBe("非学习");

    fish.setLanguage("en");
    expect(fish.subjectName("nonStudy")).toBe("Non-study");
  });
});
