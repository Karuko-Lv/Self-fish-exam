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

const PDF_PAGE = {
  widthPt: 595.28,
  heightPt: 841.89,
  widthPx: 1240,
  heightPx: 1754,
};

const PDF_LANDSCAPE_PAGE = {
  widthPt: PDF_PAGE.heightPt,
  heightPt: PDF_PAGE.widthPt,
  widthPx: PDF_PAGE.heightPx,
  heightPx: PDF_PAGE.widthPx,
};

const FALLBACK_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==";
const PDF_BODY_FONT = '29px "PingFang SC", "Microsoft YaHei", sans-serif';

function normalizeRows(rows) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return list.map((row) =>
    Object.fromEntries(
      Object.entries(row || {}).map(([key, value]) => [String(key), stringifyCell(value)]),
    ),
  );
}

function stringifyCell(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringifyCell).filter(Boolean).join("、");
  if (typeof value === "object") {
    if ("zh" in value || "en" in value) return value.zh || value.en || "";
    return JSON.stringify(value);
  }
  return String(value);
}

function cleanReportText(value) {
  let text = String(value ?? "");
  text = text.replace(/<img[^>]*>/gi, "");
  text = text.replace(/!\[.*?\]\([^)]+\)/g, "");
  return text.trim();
}

function formatExportTime(now) {
  return new Date(now || Date.now()).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function findValue(row, names) {
  const key = names.find((name) => row[name] != null && row[name] !== "");
  return key ? row[key] : "";
}

function numberValue(row, names) {
  const value = findValue(row, names);
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

// ---- Rich text: bold support ----

function parseRichText(value) {
  const text = String(value ?? "");
  const parts = text.split(/(\*\*)/g);
  const segments = [];
  let bold = false;
  for (const part of parts) {
    if (part === "**") {
      bold = !bold;
      continue;
    }
    if (part) {
      segments.push({ text: part, bold });
    }
  }
  return segments.length ? segments : [{ text, bold: false }];
}

function makeBoldFont(font) {
  if (/^(bold|700)\b/.test(font)) return font;
  return "bold " + font;
}

function measureRichWidth(ctx, segments, baseFont, boldFontStr) {
  let total = 0;
  for (const seg of segments) {
    ctx.font = seg.bold ? boldFontStr : baseFont;
    total += ctx.measureText(seg.text).width;
  }
  return total;
}

function drawRichText(ctx, segments, x, y, baseFont, options = {}) {
  const boldFontStr = makeBoldFont(baseFont);
  let cursorX = x;
  ctx.save();
  ctx.fillStyle = options.color || "#30242b";
  ctx.textBaseline = "top";
  for (const seg of segments) {
    ctx.font = seg.bold ? boldFontStr : baseFont;
    ctx.fillText(seg.text, cursorX, y);
    cursorX += ctx.measureText(seg.text).width;
  }
  ctx.restore();
}

function wrapRichText(ctx, value, maxWidth, baseFont, maxLines) {
  const segments = parseRichText(value);
  const boldFontStr = makeBoldFont(baseFont);
  const lines = [];
  const max = Number.isFinite(maxLines) ? maxLines : Infinity;

  const chars = [];
  for (const seg of segments) {
    for (const ch of Array.from(seg.text)) {
      chars.push({ text: ch, bold: seg.bold });
    }
  }

  let currentLine = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (ch.text === "\n") {
      lines.push(currentLine.length ? currentLine : [{ text: " ", bold: false }]);
      currentLine = [];
      if (lines.length >= max) return lines;
      continue;
    }

    const testLine = [...currentLine, ch];
    if (currentLine.length && measureRichWidth(ctx, testLine, baseFont, boldFontStr) > maxWidth) {
      lines.push(currentLine);
      currentLine = [ch];
      if (lines.length >= max) return lines;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.length) lines.push(currentLine);
  return lines.length ? lines : [[{ text: " ", bold: false }]];
}

function compactSegments(line) {
  if (!line.length) return line;
  const result = [{ text: line[0].text, bold: line[0].bold }];
  for (let i = 1; i < line.length; i++) {
    const prev = result[result.length - 1];
    if (prev.bold === line[i].bold) {
      prev.text += line[i].text;
    } else {
      result.push({ text: line[i].text, bold: line[i].bold });
    }
  }
  return result;
}

function drawRichLines(ctx, lines, x, y, lineHeight, baseFont, options = {}) {
  const color = options.color || "#30242b";
  lines.forEach((line, index) => {
    drawRichText(ctx, compactSegments(line), x, y + index * lineHeight, baseFont, { color });
  });
}

// ---- Image support ----

function isImageUrl(value) {
  if (typeof value !== "string") return false;
  return /^data:image\//.test(value) || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);
}

function extractImageUrls(value) {
  const text = String(value ?? "");
  const urls = [];
  const imgRegex = /<img[^>]+src=["']([^"'>]+)["'][^>]*>/gi;
  const mdImgRegex = /!\[.*?\]\(([^)]+)\)/g;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  while ((match = mdImgRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function collectRowImages(row) {
  if (!row || typeof row !== "object") return [];
  const images = [];
  for (const value of Object.values(row)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isImageUrl(item)) images.push(String(item));
      }
    } else if (isImageUrl(value)) {
      images.push(String(value));
    } else if (typeof value === "string") {
      images.push(...extractImageUrls(value));
    }
  }
  return images;
}

function isImageListValue(value) {
  if (typeof value !== "string" || !value) return false;
  if (isImageUrl(value)) return true;
  const parts = value.split("、");
  return parts.length > 1 && parts.every((p) => isImageUrl(p.trim()));
}

function loadImage(url, doc) {
  return new Promise((resolve, reject) => {
    const img = doc ? doc.createElement("img") : new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

async function preloadImages(urls, doc) {
  const unique = [...new Set(urls)];
  if (!unique.length) return new Map();
  const imageMap = new Map();
  const results = await Promise.allSettled(
    unique.map(async (url) => {
      const img = await loadImage(url, doc);
      imageMap.set(url, img);
    }),
  );
  return imageMap;
}

// ---- Drawing utilities ----

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.fillStyle = options.color || "#30242b";
  ctx.font = options.font || '30px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function reportStats(rows) {
  const totalProblems = rows.reduce((sum, row) => sum + numberValue(row, ["总题数", "Total"]), 0);
  const correctProblems = rows.reduce((sum, row) => sum + numberValue(row, ["正确数", "Correct"]), 0);
  const minutes = rows.reduce((sum, row) => sum + numberValue(row, ["分钟", "minutes", "Minutes"]), 0);
  const accuracy = totalProblems ? `${Math.round((correctProblems / totalProblems) * 100)}%` : "--";

  if (totalProblems || minutes) {
    return [
      ["记录", `${rows.length}`],
      ["题目", `${totalProblems}`],
      ["正确率", accuracy],
      ["分钟", `${minutes}`],
    ];
  }

  return [
    ["记录", `${rows.length}`],
    ["字段", `${new Set(rows.flatMap((row) => Object.keys(row))).size}`],
    ["格式", "PDF"],
  ];
}

function drawBackground(ctx, pageIndex) {
  const { widthPx: width, heightPx: height } = PDF_PAGE;
  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#fff7f1");
  base.addColorStop(0.5, "#f7fbff");
  base.addColorStop(1, "#fffaf0");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = pageIndex % 2 ? "rgba(49, 125, 137, 0.16)" : "rgba(207, 85, 122, 0.17)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(260, 100, 560, 20, 790, 132);
  ctx.bezierCurveTo(980, 228, 1110, 175, 1240, 235);
  ctx.lineTo(1240, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(53, 151, 132, 0.12)";
  ctx.beginPath();
  ctx.moveTo(0, height - 210);
  ctx.bezierCurveTo(310, height - 310, 560, height - 80, 825, height - 170);
  ctx.bezierCurveTo(1020, height - 235, 1130, height - 120, 1240, height - 175);
  ctx.lineTo(1240, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(219, 155, 64, 0.18)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    const y = 260 + i * 260;
    ctx.moveTo(-40, y);
    ctx.bezierCurveTo(280, y - 55, 430, y + 60, 720, y);
    ctx.bezierCurveTo(940, y - 45, 1050, y + 38, 1280, y - 22);
    ctx.stroke();
  }
}

function drawHeader(ctx, title, exportedAt, pageNumber, pageCountHint) {
  drawText(ctx, "Self-Fish Study Report", 96, 78, {
    color: "#8f5364",
    font: '24px "PingFang SC", "Microsoft YaHei", sans-serif',
  });
  drawText(ctx, cleanReportText(title), 96, 118, {
    color: "#2b2730",
    font: '700 60px "PingFang SC", "Microsoft YaHei", sans-serif',
  });
  drawText(ctx, `导出时间 ${exportedAt}`, 98, 196, {
    color: "#806f76",
    font: '24px "PingFang SC", "Microsoft YaHei", sans-serif',
  });
  drawText(ctx, `第 ${pageNumber}${pageCountHint ? ` / ${pageCountHint}` : ""} 页`, 1026, 96, {
    color: "#806f76",
    font: '24px "PingFang SC", "Microsoft YaHei", sans-serif',
  });
}

function drawSummary(ctx, rows, y) {
  const stats = reportStats(rows);
  const cardWidth = 238;
  stats.forEach(([label, value], index) => {
    const x = 96 + index * (cardWidth + 24);
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    roundedRect(ctx, x, y, cardWidth, 132, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(217, 139, 112, 0.24)";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(ctx, label, x + 26, y + 24, {
      color: "#806f76",
      font: '23px "PingFang SC", "Microsoft YaHei", sans-serif',
    });
    drawText(ctx, value, x + 26, y + 60, {
      color: "#2c575a",
      font: '700 38px "PingFang SC", "Microsoft YaHei", sans-serif',
    });
  });
}

function rowTitle(row, index) {
  return cleanReportText(
    findValue(row, ["题源", "来源", "Source", "灵感", "Idea", "指标", "Metric"]) ||
      findValue(row, ["日期", "Date"]) ||
      `记录 ${index + 1}`,
  );
}

function rowMeta(row) {
  return [
    findValue(row, ["日期", "Date"]),
    findValue(row, ["科目", "Subject"]),
  ].filter(Boolean);
}

function rowMetrics(row) {
  return Object.entries(row).filter(([key, value]) =>
    value !== "" && ["总题数", "正确数", "分钟", "Total", "Correct", "minutes", "值", "Value", "状态", "Status"].includes(key),
  );
}

function rowBodyEntries(row) {
  const preferred = ["刷题记录", "备注", "拆解", "原句", "内容", "原因", "Note", "Breakdown", "Original Sentence", "Content", "Reason"];
  const used = new Set(["题源", "来源", "Source", "日期", "Date", "科目", "Subject"]);
  rowMetrics(row).forEach(([key]) => used.add(key));
  const entries = [];

  preferred.forEach((name) => {
    if (row[name] != null && row[name] !== "" && !used.has(name)) {
      entries.push([name, row[name]]);
      used.add(name);
    }
  });

  Object.entries(row).forEach(([key, value]) => {
    if (!used.has(key) && value !== "" && !isImageListValue(value)) entries.push([key, value]);
  });

  return entries;
}

const IMG_DISPLAY_MAX_HEIGHT = 300;
const IMG_DISPLAY_GAP = 16;

function imageDisplayHeight(img, maxWidth) {
  if (!img || !img.naturalWidth) return IMG_DISPLAY_MAX_HEIGHT;
  const aspect = img.naturalWidth / img.naturalHeight;
  const displayWidth = Math.min(maxWidth, img.naturalWidth);
  const displayHeight = displayWidth / aspect;
  return Math.min(IMG_DISPLAY_MAX_HEIGHT, displayHeight);
}

function drawImages(ctx, imageUrls, imageMap, x, y, maxWidth) {
  if (!imageUrls.length) return 0;
  let cursorY = y;
  for (const url of imageUrls) {
    const img = imageMap.get(url);
    if (!img) continue;
    const h = imageDisplayHeight(img, maxWidth);
    const w = h * (img.naturalWidth / img.naturalHeight);
    const drawX = x + Math.max(0, (maxWidth - w) / 2);
    try {
      ctx.drawImage(img, drawX, cursorY, w, h);
    } catch (_) {
      // skip images that fail to draw (e.g. tainted canvases)
    }
    cursorY += h + IMG_DISPLAY_GAP;
  }
  return cursorY - y;
}

function splitRowIntoCards(ctx, row, index, contentWidth, rowImages, imageMap) {
  const bodyWidth = contentWidth - 64;
  ctx.font = PDF_BODY_FONT;
  const imgUrls = rowImages || [];
  const sourceEntries = rowBodyEntries(row).map(([label, value]) => ({
    label,
    lines: wrapRichText(ctx, value, bodyWidth, PDF_BODY_FONT),
  }));
  if (!sourceEntries.length && !imgUrls.length) {
    return [{ row, index, chunkIndex: 0, metrics: rowMetrics(row), bodyEntries: [], images: imgUrls }];
  }

  const cards = [];
  let bodyEntries = [];
  let lineCount = 0;
  let chunkIndex = 0;
  let pendingImages = [...imgUrls];

  function maxLinesForChunk() {
    return chunkIndex === 0 ? 18 : 27;
  }

  function pushCard() {
    cards.push({
      row,
      index,
      chunkIndex,
      metrics: chunkIndex === 0 ? rowMetrics(row) : [],
      bodyEntries,
      images: chunkIndex === 0 ? pendingImages : [],
    });
    bodyEntries = [];
    lineCount = 0;
    if (chunkIndex === 0) pendingImages = [];
    chunkIndex += 1;
  }

  sourceEntries.forEach((entry) => {
    let offset = 0;
    while (offset < entry.lines.length) {
      const labelLine = bodyEntries.length && offset === 0 ? 1 : 1;
      const remaining = maxLinesForChunk() - lineCount - labelLine;
      if (remaining <= 0) pushCard();
      const take = Math.min(entry.lines.length - offset, Math.max(1, maxLinesForChunk() - lineCount - 1));
      bodyEntries.push({
        label: offset ? `${entry.label}（续）` : entry.label,
        lines: entry.lines.slice(offset, offset + take),
      });
      lineCount += take + 1;
      offset += take;
      if (offset < entry.lines.length) pushCard();
    }
  });

  if (bodyEntries.length || pendingImages.length) pushCard();
  return cards;
}

function measureReportCard(card, imageMap, contentWidth) {
  let height = 118;
  const metrics = card.metrics;
  if (metrics.length) height += 50;
  card.bodyEntries.forEach((entry) => {
    height += 36 + entry.lines.length * 36 + 12;
  });
  if (card.images && card.images.length && imageMap) {
    const maxWidth = contentWidth - 64;
    for (const url of card.images) {
      const img = imageMap.get(url);
      height += (img ? imageDisplayHeight(img, maxWidth) : IMG_DISPLAY_MAX_HEIGHT) + IMG_DISPLAY_GAP;
    }
  }
  return Math.max(172, height);
}

function drawMetricPill(ctx, label, value, x, y) {
  const text = `${label} ${value}`;
  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  const width = Math.min(250, Math.max(96, ctx.measureText(text).width + 34));
  ctx.fillStyle = "rgba(232, 246, 241, 0.92)";
  roundedRect(ctx, x, y, width, 38, 19);
  ctx.fill();
  drawText(ctx, text, x + 17, y + 7, {
    color: "#28625f",
    font: '22px "PingFang SC", "Microsoft YaHei", sans-serif',
  });
  return width;
}

function drawReportCard(ctx, card, x, y, width, imageMap) {
  const height = measureReportCard(card, imageMap, width);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  roundedRect(ctx, x, y, width, height, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(205, 98, 113, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const title = card.chunkIndex ? `${rowTitle(card.row, card.index)}（续）` : rowTitle(card.row, card.index);
  drawText(ctx, title, x + 32, y + 26, {
    color: "#332932",
    font: '700 32px "PingFang SC", "Microsoft YaHei", sans-serif',
  });
  const meta = rowMeta(card.row);
  if (meta.length) {
    drawText(ctx, meta.join(" / "), x + 34, y + 70, {
      color: "#8a747c",
      font: '23px "PingFang SC", "Microsoft YaHei", sans-serif',
    });
  }

  let cursorY = y + 110;
  let cursorX = x + 32;
  card.metrics.forEach(([label, value]) => {
    const pillWidth = drawMetricPill(ctx, label, value, cursorX, cursorY);
    cursorX += pillWidth + 12;
  });
  if (card.metrics.length) cursorY += 56;

  card.bodyEntries.forEach((entry) => {
    drawText(ctx, entry.label, x + 32, cursorY, {
      color: "#b45e78",
      font: '700 22px "PingFang SC", "Microsoft YaHei", sans-serif',
    });
    cursorY += 32;
    drawRichLines(ctx, entry.lines, x + 32, cursorY, 36, PDF_BODY_FONT, {
      color: "#3a3037",
    });
    cursorY += entry.lines.length * 36 + 14;
  });

  if (card.images && card.images.length && imageMap) {
    const imgMaxWidth = width - 64;
    const imgHeight = drawImages(ctx, card.images, imageMap, x + 32, cursorY, imgMaxWidth);
    cursorY += imgHeight;
  }

  return height;
}

function createReportCanvas(doc) {
  const canvas = doc.createElement("canvas");
  canvas.width = PDF_PAGE.widthPx;
  canvas.height = PDF_PAGE.heightPx;
  return canvas;
}

function canRenderCanvas(canvas) {
  return canvas && typeof canvas.getContext === "function" && typeof canvas.toDataURL === "function";
}

export async function renderPdfReportPages(title, rows, options = {}) {
  const doc = options.document || globalThis.document;
  if (!doc?.createElement) {
    return [{ dataUrl: FALLBACK_JPEG, width: PDF_PAGE.widthPx, height: PDF_PAGE.heightPx }];
  }

  const firstCanvas = createReportCanvas(doc);
  if (!canRenderCanvas(firstCanvas)) {
    return [{ dataUrl: FALLBACK_JPEG, width: PDF_PAGE.widthPx, height: PDF_PAGE.heightPx }];
  }

  const rawRows = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const rowImageUrls = rawRows.map((row) => collectRowImages(row));
  const allUrls = rowImageUrls.flat();
  const imageMap = allUrls.length ? await preloadImages(allUrls, doc) : new Map();

  const normalizedRows = normalizeRows(rawRows);
  const exportedAt = formatExportTime(options.now);
  const pages = [];
  const marginX = 96;
  const contentWidth = PDF_PAGE.widthPx - marginX * 2;
  const bottomY = PDF_PAGE.heightPx - 116;
  let canvas = firstCanvas;
  let ctx = canvas.getContext("2d");
  let pageIndex = 0;
  let y = 0;

  function finishPage() {
    pages.push({
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      width: canvas.width,
      height: canvas.height,
    });
  }

  function startPage(reuseCanvas) {
    canvas = reuseCanvas || createReportCanvas(doc);
    ctx = canvas.getContext("2d");
    pageIndex += 1;
    drawBackground(ctx, pageIndex);
    drawHeader(ctx, title, exportedAt, pageIndex);
    y = pageIndex === 1 ? 370 : 285;
    if (pageIndex === 1) {
      drawSummary(ctx, normalizedRows, 250);
    }
  }

  startPage(firstCanvas);

  if (!normalizedRows.length) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    roundedRect(ctx, marginX, y, contentWidth, 180, 22);
    ctx.fill();
    drawText(ctx, "暂无数据", marginX + 38, y + 58, {
      color: "#806f76",
      font: '700 34px "PingFang SC", "Microsoft YaHei", sans-serif',
    });
  }

  const cards = normalizedRows.flatMap((row, index) =>
    splitRowIntoCards(ctx, row, index, contentWidth, rowImageUrls[index], imageMap),
  );
  cards.forEach((card) => {
    const height = measureReportCard(card, imageMap, contentWidth);
    if (y + height > bottomY && y > 330) {
      finishPage();
      startPage();
    }
    const drawnHeight = drawReportCard(ctx, card, marginX, y, contentWidth, imageMap);
    y += drawnHeight + 24;
  });

  finishPage();
  return pages;
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:image\/jpeg;base64,(.+)$/);
  if (!match) throw new Error("PDF pages must be JPEG data URLs.");
  const base64 = match[1];
  if (typeof atob === "function") {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(base64, "base64"));
  }
  throw new Error("No base64 decoder is available.");
}

function asciiBytes(value) {
  return new TextEncoder().encode(value);
}

export function createPdfBytesFromJpegPages(pages, pageSize = PDF_PAGE) {
  const pageImages = pages.map((page) => ({
    ...page,
    bytes: decodeDataUrl(page.dataUrl),
  }));
  const objectCount = 2 + pageImages.length * 3;
  const chunks = [];
  const offsets = new Array(objectCount + 1).fill(0);
  let length = 0;

  function write(value) {
    const bytes = typeof value === "string" ? asciiBytes(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  }

  function startObject(id) {
    offsets[id] = length;
    write(`${id} 0 obj\n`);
  }

  function endObject() {
    write("\nendobj\n");
  }

  const pageIds = pageImages.map((_, index) => 5 + index * 3);
  write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  startObject(1);
  write("<< /Type /Catalog /Pages 2 0 R >>");
  endObject();

  startObject(2);
  write(`<< /Type /Pages /Count ${pageImages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);
  endObject();

  pageImages.forEach((page, index) => {
    const imageId = 3 + index * 3;
    const contentId = 4 + index * 3;
    const pageId = 5 + index * 3;
    const imageName = `Im${index + 1}`;
    const content = `q\n${pageSize.widthPt} 0 0 ${pageSize.heightPt} 0 0 cm\n/${imageName} Do\nQ`;

    startObject(imageId);
    write(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,
    );
    write(page.bytes);
    write("\nendstream");
    endObject();

    startObject(contentId);
    write(`<< /Length ${asciiBytes(content).length} >>\nstream\n${content}\nendstream`);
    endObject();

    startObject(pageId);
    write(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageSize.widthPt} ${pageSize.heightPt}] ` +
        `/Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    endObject();
  });

  const xrefOffset = length;
  write(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= objectCount; id += 1) {
    write(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const output = new Uint8Array(length);
  let cursor = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });
  return output;
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

export async function exportPdf(title, rows, options = {}) {
  const pages = await renderPdfReportPages(title, rows, options);
  const bytes = createPdfBytesFromJpegPages(pages);
  downloadBlob(bytes, `${safeFilename(title)}.pdf`, "application/pdf");
  return bytes;
}

export async function exportImagePdf(title, imageDataUrl, options = {}) {
  const doc = options.document || globalThis.document;
  if (!doc?.createElement) return null;

  const image = await loadImage(imageDataUrl, doc);
  const imageWidth = image.naturalWidth || image.width || 1;
  const imageHeight = image.naturalHeight || image.height || 1;
  const orientation = options.orientation || (imageWidth >= imageHeight ? "landscape" : "portrait");
  const pageSize = orientation === "portrait" ? PDF_PAGE : PDF_LANDSCAPE_PAGE;
  const canvas = doc.createElement("canvas");
  canvas.width = pageSize.widthPx;
  canvas.height = pageSize.heightPx;

  if (!canRenderCanvas(canvas)) return null;

  const ctx = canvas.getContext("2d");
  const margin = Number.isFinite(options.margin) ? options.margin : 36;
  const maxWidth = canvas.width - margin * 2;
  const maxHeight = canvas.height - margin * 2;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const drawWidth = Math.max(1, imageWidth * scale);
  const drawHeight = Math.max(1, imageHeight * scale);
  const x = (canvas.width - drawWidth) / 2;
  const y = (canvas.height - drawHeight) / 2;

  ctx.fillStyle = options.background || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);

  const pages = [{ dataUrl: canvas.toDataURL("image/jpeg", 0.94), width: canvas.width, height: canvas.height }];
  const bytes = createPdfBytesFromJpegPages(pages, pageSize);
  downloadBlob(bytes, `${safeFilename(title)}.pdf`, "application/pdf");
  return bytes;
}
