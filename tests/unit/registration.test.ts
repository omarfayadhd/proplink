import { describe, expect, it } from "vitest";
import { registrationSchema } from "@/services/users/registration";

const valid = {
  email: "Test@Example.COM",
  password: "Password123",
  name: "Test User",
  role: "INVESTOR",
  gdprConsent: true,
};

describe("registrationSchema", () => {
  it("accepts a valid registration and lowercases the email", () => {
    const result = registrationSchema.parse(valid);
    expect(result.email).toBe("test@example.com");
    expect(result.role).toBe("INVESTOR");
  });

  it.each(["AGENT", "INVESTOR", "BUYER"])("allows self-serve role %s", (role) => {
    expect(registrationSchema.safeParse({ ...valid, role }).success).toBe(true);
  });

  it("rejects ADMIN registration (seed-only role)", () => {
    expect(registrationSchema.safeParse({ ...valid, role: "ADMIN" }).success).toBe(false);
  });

  it("rejects passwords under 8 characters", () => {
    expect(registrationSchema.safeParse({ ...valid, password: "Pass1" }).success).toBe(
      false,
    );
  });

  it("rejects passwords without a number", () => {
    expect(
      registrationSchema.safeParse({ ...valid, password: "PasswordOnly" }).success,
    ).toBe(false);
  });

  it("rejects missing GDPR consent", () => {
    expect(registrationSchema.safeParse({ ...valid, gdprConsent: false }).success).toBe(
      false,
    );
  });

  it("rejects invalid emails", () => {
    expect(
      registrationSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });
});
