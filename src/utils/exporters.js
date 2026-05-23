function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFilename(value) {
  return String(value || "self-fish")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function exportJson(title, payload) {
  downloadBlob(JSON.stringify(payload, null, 2), `${safeFilename(title)}.json`, "application/json;charset=utf-8");
}

export function exportCsv(title, rows) {
  if (!rows.length) {
    downloadBlob("", `${safeFilename(title)}.csv`, "text/csv;charset=utf-8");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsv).join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  });
  downloadBlob(lines.join("\n"), `${safeFilename(title)}.csv`, "text/csv;charset=utf-8");
}

export function exportPdf(title, rows) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=920,height=720");
  if (!printWindow) return;
  const exportedAt = new Date().toLocaleString("zh-CN");
  const tableRows = rows.length
    ? rows
        .map((row) => {
          const cells = Object.entries(row)
            .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
            .join("");
          return `<article class="row">${cells}</article>`;
        })
        .join("")
    : `<p class="empty">暂无数据</p>`;

  printWindow.document.write(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; margin: 32px; color: #3a2730; }
      h1 { color: #c63470; margin-bottom: 6px; }
      .meta { color: #8a6875; margin-bottom: 24px; }
      .row { page-break-inside: avoid; border: 1px solid #f5c7d8; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
      dl { margin: 0; display: grid; grid-template-columns: 120px 1fr; gap: 8px 12px; }
      dt { color: #8a6875; font-weight: 700; }
      dd { margin: 0; white-space: pre-wrap; }
      .empty { color: #8a6875; }
      @media print { body { margin: 18mm; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">导出时间：${escapeHtml(exportedAt)}</p>
    ${tableRows}
    <script>
      window.addEventListener("load", () => {
        window.focus();
        window.print();
      });
    <\/script>
  </body>
</html>`);
  printWindow.document.close();
}
