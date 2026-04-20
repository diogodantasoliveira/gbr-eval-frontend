import { describe, it, expect } from "vitest";
import { redactString, redactRecord, scanForPii } from "../redactor";

describe("redactString", () => {
  it("redacts a formatted CPF", () => {
    const { value, redacted, matches } = redactString("123.456.789-09");
    expect(redacted).toBe(true);
    expect(matches).toContain("CPF");
    // Last 2 digits preserved per pattern replacement
    expect(value).toContain("09");
    expect(value).not.toContain("123.456.789");
  });

  it("redacts a formatted CNPJ", () => {
    const { value, redacted, matches } = redactString("11.222.333/0001-81");
    expect(redacted).toBe(true);
    expect(matches).toContain("CNPJ");
    // Last 2 digits preserved per pattern replacement
    expect(value).toContain("81");
    expect(value).not.toContain("11.222.333");
  });

  it("redacts an email address", () => {
    const { value, redacted, matches } = redactString("contact user@example.com please");
    expect(redacted).toBe(true);
    expect(matches).toContain("Email");
    expect(value).toContain("redacted@example.com");
    expect(value).not.toContain("user@example.com");
  });

  it("does not modify text with no PII", () => {
    const input = "Hello world, no sensitive data here.";
    const { value, redacted } = redactString(input);
    expect(redacted).toBe(false);
    expect(value).toBe(input);
  });

  it("redacts multiple PII items in the same string", () => {
    const input = "Name: user@test.com CPF: 123.456.789-09";
    const { redacted, matches } = redactString(input);
    expect(redacted).toBe(true);
    expect(matches).toContain("Email");
    expect(matches).toContain("CPF");
  });
});

describe("redactRecord", () => {
  it("redacts PII in top-level string fields", () => {
    const record = { email: "admin@example.com", name: "John" };
    const result = redactRecord(record);
    expect(result.email).toBe("redacted@example.com");
    expect(result.name).toBe("John");
  });

  it("redacts PII in nested objects recursively", () => {
    const record = {
      user: {
        contact: { email: "user@example.com" },
        name: "Jane",
      },
    };
    const result = redactRecord(record) as { user: { contact: { email: string }; name: string } };
    expect(result.user.contact.email).toBe("redacted@example.com");
    expect(result.user.name).toBe("Jane");
  });

  it("redacts PII inside arrays of strings", () => {
    const record = { emails: ["a@example.com", "plain text"] };
    const result = redactRecord(record) as { emails: string[] };
    expect(result.emails[0]).toBe("redacted@example.com");
    expect(result.emails[1]).toBe("plain text");
  });

  it("redacts PII inside arrays of objects", () => {
    const record = {
      contacts: [{ email: "x@example.com" }, { email: "no-pii-here" }],
    };
    const result = redactRecord(record) as {
      contacts: Array<{ email: string }>;
    };
    expect(result.contacts[0].email).toBe("redacted@example.com");
    expect(result.contacts[1].email).toBe("no-pii-here");
  });

  it("does not crash on null or undefined values in fields", () => {
    const record = { a: null, b: undefined, c: "safe" } as Record<string, unknown>;
    expect(() => redactRecord(record)).not.toThrow();
    const result = redactRecord(record);
    expect(result.c).toBe("safe");
    expect(result.a).toBeNull();
    expect(result.b).toBeUndefined();
  });

  it("passes through records with no PII unchanged", () => {
    const record = { title: "Report Q1", count: 42 };
    const result = redactRecord(record);
    expect(result.title).toBe("Report Q1");
    expect(result.count).toBe(42);
  });
});

describe("scanForPii", () => {
  it("detects PII in top-level fields", () => {
    const data = { email: "user@example.com" };
    const { hasPii, findings } = scanForPii(data);
    expect(hasPii).toBe(true);
    expect(findings[0].field).toBe("email");
    expect(findings[0].patterns).toContain("Email");
  });

  it("detects PII in nested objects with dot-notation field paths", () => {
    const data = { user: { contact: { email: "x@example.com" } } };
    const { findings } = scanForPii(data);
    expect(findings[0].field).toBe("user.contact.email");
  });

  it("returns hasPii false and empty findings for clean data", () => {
    const data = { name: "Acme Corp", year: 2024 };
    const { hasPii, findings } = scanForPii(data);
    expect(hasPii).toBe(false);
    expect(findings).toHaveLength(0);
  });
});
