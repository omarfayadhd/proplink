import { describe, expect, it } from "vitest";
import {
  ACTIVE_AGENT_PROFILE_COOKIE,
  resolveActiveAgentProfileId,
} from "@/lib/activeAgentProfile";

const PROFILES = [{ id: "profile-a" }, { id: "profile-b" }, { id: "profile-c" }];

describe("resolveActiveAgentProfileId", () => {
  it("returns null when the user has no profiles", () => {
    expect(resolveActiveAgentProfileId([], "profile-a")).toBeNull();
  });

  it("returns the cookie value when it matches one of the user's profiles", () => {
    expect(resolveActiveAgentProfileId(PROFILES, "profile-b")).toBe("profile-b");
  });

  it("falls back to the first profile when the cookie value doesn't belong to the user", () => {
    expect(resolveActiveAgentProfileId(PROFILES, "someone-elses-profile")).toBe(
      "profile-a",
    );
  });

  it("falls back to the first profile when there is no cookie", () => {
    expect(resolveActiveAgentProfileId(PROFILES, null)).toBe("profile-a");
    expect(resolveActiveAgentProfileId(PROFILES, undefined)).toBe("profile-a");
  });

  it("exports a stable cookie name", () => {
    expect(ACTIVE_AGENT_PROFILE_COOKIE).toBe("proplink_active_agent_profile");
  });
});
