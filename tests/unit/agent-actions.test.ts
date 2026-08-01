import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/listings/listingService", () => ({
  listActiveAgentProfiles: vi.fn(),
}));

const mockCookieStore = { set: vi.fn(), get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { auth } from "@/lib/auth";
import { listActiveAgentProfiles } from "@/services/listings/listingService";
import { ACTIVE_AGENT_PROFILE_COOKIE } from "@/lib/activeAgentProfile";
import { setActiveAgentProfile } from "@/app/agent/actions";

const mockAuth = vi.mocked(auth);
const mockListProfiles = vi.mocked(listActiveAgentProfiles);

beforeEach(() => vi.clearAllMocks());

describe("setActiveAgentProfile server action", () => {
  it("does nothing when there is no session (never trust the client)", async () => {
    mockAuth.mockResolvedValue(null as never);

    await setActiveAgentProfile("profile-1");

    expect(mockListProfiles).not.toHaveBeenCalled();
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it("ignores a profileId that isn't one of the caller's own active profiles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "agent-1", role: "AGENT" } } as never);
    mockListProfiles.mockResolvedValue([{ id: "profile-a" }] as never);

    await setActiveAgentProfile("someone-elses-profile");

    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it("persists the cookie when the profileId is one of the caller's own active profiles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "agent-1", role: "AGENT" } } as never);
    mockListProfiles.mockResolvedValue([
      { id: "profile-a" },
      { id: "profile-b" },
    ] as never);

    await setActiveAgentProfile("profile-b");

    expect(mockListProfiles).toHaveBeenCalledWith("agent-1");
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      ACTIVE_AGENT_PROFILE_COOKIE,
      "profile-b",
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });
});
