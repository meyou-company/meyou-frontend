import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lunaMarkdownToHtml, normalizeLunaText } from "./lunaMarkdown.js";

describe("luna markdown", () => {
  it("turns escaped newlines into real breaks", () => {
    assert.equal(normalizeLunaText("a\\nb"), "a\nb");
  });

  it("renders bold lists and code without raw HTML", () => {
    const html = lunaMarkdownToHtml("**Hi**\n- one\n- two\n<script>x</script>\n`code`");
    assert.match(html, /<strong>Hi<\/strong>/);
    assert.match(html, /<ul>/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /<code>code<\/code>/);
  });

  it("only allows http(s) links", () => {
    const html = lunaMarkdownToHtml("[x](javascript:alert(1)) [ok](https://lunmeyo.com)");
    assert.doesNotMatch(html, /javascript:/);
    assert.match(html, /href="https:\/\/lunmeyo.com"/);
  });
});
