const ESCAPE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE[ch]);
}

export function normalizeLunaText(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function safeHref(href) {
  const url = String(href || "").trim();
  if (/^https?:\/\//i.test(url) || url.startsWith("mailto:")) return url;
  return "";
}

function inlineToHtml(text) {
  let html = escapeHtml(text);
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, href) => {
      const safe = safeHref(href);
      if (!safe) return escapeHtml(label);
      return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function flushList(list, out) {
  if (!list.length) return;
  const tag = list[0].ordered ? "ol" : "ul";
  out.push(
    `<${tag}>${list.map((item) => `<li>${inlineToHtml(item.text)}</li>`).join("")}</${tag}>`,
  );
  list.length = 0;
}

export function lunaMarkdownToHtml(raw) {
  const source = normalizeLunaText(raw);
  if (!source.trim()) return "";
  const lines = source.split("\n");
  const out = [];
  const list = [];
  let fence = null;
  let fenceLines = [];

  const closeFence = () => {
    if (fence == null) return;
    out.push(`<pre><code>${escapeHtml(fenceLines.join("\n"))}</code></pre>`);
    fence = null;
    fenceLines = [];
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^```(.*)$/);
    if (fenceMatch) {
      if (fence != null) closeFence();
      else {
        flushList(list, out);
        fence = fenceMatch[1] || "";
        fenceLines = [];
      }
      continue;
    }
    if (fence != null) {
      fenceLines.push(line);
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.+)$/);
    const ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ul || ol) {
      const ordered = Boolean(ol);
      if (list.length && list[0].ordered !== ordered) flushList(list, out);
      list.push({ ordered, text: (ul || ol)[1] });
      continue;
    }
    flushList(list, out);

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inlineToHtml(heading[2])}</h${level}>`);
      continue;
    }
    if (!line.trim()) {
      out.push("");
      continue;
    }
    out.push(`<p>${inlineToHtml(line)}</p>`);
  }
  closeFence();
  flushList(list, out);
  return out.join("\n");
}
