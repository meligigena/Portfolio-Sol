import { describe, expect, it } from "vitest";
import { contact } from "./contact";

describe("contact links", () => {
  it("builds the WhatsApp web URL from the configured phone number", () => {
    expect(contact.phone).toBe("+54 9 3512 17-7453");
    expect(contact.whatsappHref).toBe("https://wa.me/5493512177453");
    expect(contact.whatsappHref).not.toMatch(/whatsapp:\/\/|[+\s-]/);
  });

  it("builds a Gmail compose URL for the configured email", () => {
    const composeUrl = new URL(contact.emailHref);

    expect(composeUrl.origin + composeUrl.pathname).toBe(
      "https://mail.google.com/mail/",
    );
    expect(composeUrl.searchParams.get("view")).toBe("cm");
    expect(composeUrl.searchParams.get("fs")).toBe("1");
    expect(composeUrl.searchParams.get("to")).toBe(contact.email);
    expect(contact.email).toBe("fanaraasol@gmail.com");
  });
});
