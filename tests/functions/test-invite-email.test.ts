import { describe, it, expect } from "vitest";

import { testInviteEmail } from "../../functions/_lib/email-templates";

const baseInput = {
  testTitle: "Cybersecurity awareness",
  authorName: "Anna Author",
  authorEmail: "anna@example.com",
  shareUrl: "https://subenai.sk/t/abcdefgh1234",
};

describe("testInviteEmail", () => {
  it("uses the plain subject when password is NOT included", () => {
    const { subject } = testInviteEmail(baseInput);
    expect(subject).toBe("Pozvánka na test: Cybersecurity awareness");
  });

  it("uses the marker subject when password IS included (Appendix B § 1)", () => {
    const { subject } = testInviteEmail({ ...baseInput, password: "secret-pwd" });
    expect(subject).toBe("Pozvánka na test: Cybersecurity awareness (heslo v tomto e-maile)");
  });

  it("renders the share URL into both html + text", () => {
    const { html, text } = testInviteEmail(baseInput);
    expect(html).toContain("https://subenai.sk/t/abcdefgh1234");
    expect(text).toContain("https://subenai.sk/t/abcdefgh1234");
  });

  it("names the author + author's email in both html + text", () => {
    const { html, text } = testInviteEmail(baseInput);
    expect(html).toContain("Anna Author");
    expect(html).toContain("anna@example.com");
    expect(text).toContain("Anna Author");
    expect(text).toContain("anna@example.com");
  });

  it("does NOT include the plaintext password unless explicitly opted in (D7)", () => {
    const { html, text } = testInviteEmail(baseInput);
    expect(html).not.toContain("Heslo k testu");
    expect(text).not.toMatch(/Heslo k testu:/);
    // Without password, body explains the author shares it out-of-band.
    expect(html).toContain("Autor ti ho pošle samostatne");
  });

  it("includes the plaintext password in body when opted in, with a warning", () => {
    const { html, text } = testInviteEmail({ ...baseInput, password: "secret-pwd-123" });
    expect(html).toContain("Heslo k testu");
    expect(html).toContain("secret-pwd-123");
    expect(html).toContain("výnimočne v tomto e-maile");
    expect(text).toMatch(/Heslo k testu: secret-pwd-123/);
  });

  it("HTML-escapes author name + title to prevent injection", () => {
    const { html } = testInviteEmail({
      ...baseInput,
      authorName: "Anna <script>alert(1)</script>",
      testTitle: "<img src=x onerror=alert(1)>",
    });
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x onerror");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x");
  });

  it("escapes the share URL inside the href attribute (XSS guard)", () => {
    const { html } = testInviteEmail({
      ...baseInput,
      shareUrl: 'https://example.com/" onload="alert(1)',
    });
    // The href value must contain the &quot;-escaped form; the raw `"` would
    // close the attribute and let `onload="alert(1)"` execute when the email
    // is opened in a permissive client.
    expect(html).toMatch(/href="https:\/\/example\.com\/&quot; onload=&quot;alert\(1\)"/);
    // (The same URL appears inside <code>...</code> as plain text — quotes
    // there are NOT an attribute boundary, so they don't need escaping for
    // XSS purposes. We only verify the href, not every quote in the file.)
  });
});
