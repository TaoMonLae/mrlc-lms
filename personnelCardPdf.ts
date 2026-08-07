import PDFDocument from "pdfkit";

const MM = 72 / 25.4;
export const PERSONNEL_CARD_WIDTH_PT = 53.98 * MM;
export const PERSONNEL_CARD_HEIGHT_PT = 85.6 * MM;
export const PERSONNEL_CARD_PRINT_DPI = 300;
export const PERSONNEL_CARD_RASTER_WIDTH_PX = Math.ceil((53.98 / 25.4) * PERSONNEL_CARD_PRINT_DPI);
export const PERSONNEL_CARD_RASTER_HEIGHT_PX = Math.ceil((85.6 / 25.4) * PERSONNEL_CARD_PRINT_DPI);

export type PersonnelCardPdfData = {
  kind: "TEACHER" | "STAFF";
  cardNumber: string;
  holderName: string;
  roleTitle: string;
  organizationUnit: string;
  employmentType: string;
  status: string;
  issueDate: Date | string;
  expiryDate: Date | string;
  schoolName: string;
  schoolPhone: string | null;
  verifyUrl: string;
  logo: Buffer | null;
  photo: Buffer | null;
  qr: Buffer | null;
};

function formatDate(value: Date | string | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function collectPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function cardPage(doc: PDFKit.PDFDocument): void {
  doc.rect(0, 0, PERSONNEL_CARD_WIDTH_PT, PERSONNEL_CARD_HEIGHT_PT).fill("#ffffff");
}

function drawFittedSingleLine(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options: { font: string; maxFontSize: number; minFontSize: number; align?: "left" | "center" | "right" },
): void {
  const value = String(text || "-").replace(/\s+/g, " ").trim();
  let fontSize = options.maxFontSize;
  doc.font(options.font).fontSize(fontSize);
  while (fontSize > options.minFontSize && doc.widthOfString(value) > width) {
    fontSize = Math.max(options.minFontSize, fontSize - 0.2);
    doc.fontSize(fontSize);
  }
  let fitted = value;
  if (doc.widthOfString(fitted) > width) {
    const suffix = "...";
    let low = 0;
    let high = fitted.length;
    while (low < high) {
      const midpoint = Math.ceil((low + high) / 2);
      const candidate = `${fitted.slice(0, midpoint).trimEnd()}${suffix}`;
      if (doc.widthOfString(candidate) <= width) low = midpoint;
      else high = midpoint - 1;
    }
    fitted = `${fitted.slice(0, low).trimEnd()}${suffix}`;
  }
  const fittedWidth = Math.min(doc.widthOfString(fitted), width);
  const textX = options.align === "center"
    ? x + (width - fittedWidth) / 2
    : options.align === "right"
      ? x + width - fittedWidth
      : x;
  doc.text(fitted, textX, y, { lineBreak: false });
}

function drawLogo(doc: PDFKit.PDFDocument, data: PersonnelCardPdfData, x: number, y: number, size: number): void {
  doc.circle(x + size / 2, y + size / 2, size / 2).fill("#ffffff");
  if (data.logo) {
    doc.save();
    doc.circle(x + size / 2, y + size / 2, size / 2 - 1).clip();
    doc.image(data.logo, x + 1, y + 1, { fit: [size - 2, size - 2], align: "center", valign: "center" });
    doc.restore();
  } else {
    doc.font("Helvetica-Bold").fontSize(size * 0.48).fillColor("#1e1b4b")
      .text((data.schoolName || "S").charAt(0).toUpperCase(), x, y + size * 0.23, { width: size, align: "center" });
  }
}

function drawDetail(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number): void {
  doc.roundedRect(x, y, width, 18, 3).fill("#f8fafc");
  doc.font("Helvetica-Bold").fontSize(4.8).fillColor("#94a3b8")
    .text(label.toUpperCase(), x + 5, y + 3, { width: width - 10, characterSpacing: 0.4, lineBreak: false });
  doc.fillColor("#1e293b");
  drawFittedSingleLine(doc, value || "-", x + 5, y + 9.5, width - 10, {
    font: "Helvetica-Bold",
    maxFontSize: 6.7,
    minFontSize: 5.2,
  });
}

function themeFor(kind: PersonnelCardPdfData["kind"]) {
  return kind === "TEACHER"
    ? { middle: "#312e81", accent: "#d97706", soft: "#fef3c7", text: "#92400e" }
    : { middle: "#064e3b", accent: "#0e7490", soft: "#d1fae5", text: "#047857" };
}

function drawFront(doc: PDFKit.PDFDocument, data: PersonnelCardPdfData): void {
  cardPage(doc);
  const theme = themeFor(data.kind);
  const header = doc.linearGradient(0, 0, PERSONNEL_CARD_WIDTH_PT, 82);
  header.stop(0, "#0f172a").stop(0.55, theme.middle).stop(1, theme.accent);
  doc.rect(0, 0, PERSONNEL_CARD_WIDTH_PT, 82).fill(header);
  doc.circle(PERSONNEL_CARD_WIDTH_PT + 12, -8, 48).lineWidth(9).strokeOpacity(0.08).stroke("#ffffff").strokeOpacity(1);

  drawLogo(doc, data, 11, 10, 23);
  doc.fillColor("#ffffff");
  drawFittedSingleLine(doc, data.schoolName.toUpperCase(), 40, 11, PERSONNEL_CARD_WIDTH_PT - 50, {
    font: "Helvetica-Bold",
    maxFontSize: 7.2,
    minFontSize: 5,
  });
  doc.font("Helvetica-Bold").fontSize(4.8).fillColor(data.kind === "TEACHER" ? "#fde68a" : "#a7f3d0")
    .text(`${data.kind} IDENTITY`, 40, 29, { characterSpacing: 0.95, lineBreak: false });

  const photoW = 62;
  const photoH = 76;
  const photoX = (PERSONNEL_CARD_WIDTH_PT - photoW) / 2;
  const photoY = 52;
  doc.roundedRect(photoX - 3, photoY - 3, photoW + 6, photoH + 6, 9).fill("#ffffff");
  doc.save();
  doc.roundedRect(photoX, photoY, photoW, photoH, 7).clip();
  if (data.photo) {
    doc.image(data.photo, photoX, photoY, { fit: [photoW, photoH], align: "center", valign: "center" });
  } else {
    doc.rect(photoX, photoY, photoW, photoH).fill("#f1f5f9");
    const initials = data.holderName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    doc.font("Helvetica-Bold").fontSize(22).fillColor("#94a3b8")
      .text(initials || "?", photoX, photoY + 26, { width: photoW, align: "center" });
  }
  doc.restore();

  doc.fillColor("#0f172a");
  drawFittedSingleLine(doc, data.holderName, 10, 137, PERSONNEL_CARD_WIDTH_PT - 20, {
    font: "Helvetica-Bold",
    maxFontSize: 11,
    minFontSize: 8,
    align: "center",
  });
  const codeWidth = 82;
  doc.roundedRect((PERSONNEL_CARD_WIDTH_PT - codeWidth) / 2, 153, codeWidth, 15, 7.5).fill(theme.soft);
  doc.font("Courier-Bold").fontSize(7.5).fillColor(theme.text)
    .text(data.cardNumber, (PERSONNEL_CARD_WIDTH_PT - codeWidth) / 2, 157, { width: codeWidth, align: "center", lineBreak: false });

  const gap = 5;
  const boxW = (PERSONNEL_CARD_WIDTH_PT - 24 - gap) / 2;
  drawDetail(doc, "Role", data.roleTitle, 12, 175, boxW);
  drawDetail(doc, data.kind === "TEACHER" ? "Faculty" : "Department", data.organizationUnit, 12 + boxW + gap, 175, boxW);
  drawDetail(doc, "Issued", formatDate(data.issueDate), 12, 198, boxW);
  drawDetail(doc, "Valid through", formatDate(data.expiryDate), 12 + boxW + gap, 198, boxW);

  const active = data.status === "ACTIVE" && new Date(data.expiryDate).getTime() >= Date.now();
  doc.circle(PERSONNEL_CARD_WIDTH_PT / 2 - 26, 225, 2.3).fill(active ? "#10b981" : "#f59e0b");
  doc.font("Helvetica-Bold").fontSize(5.2).fillColor(active ? "#047857" : "#b45309")
    .text(active ? `ACTIVE ${data.kind}` : data.status, PERSONNEL_CARD_WIDTH_PT / 2 - 20, 222, { characterSpacing: 0.7, lineBreak: false });

  doc.moveTo(11, 234).lineTo(PERSONNEL_CARD_WIDTH_PT - 11, 234).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
  doc.font("Helvetica-Bold").fontSize(4.2).fillColor("#94a3b8")
    .text("AUTHORIZED PERSONNEL", 11, 236, { width: PERSONNEL_CARD_WIDTH_PT - 22, align: "center", characterSpacing: 0.7, lineBreak: false });
}

function drawBack(doc: PDFKit.PDFDocument, data: PersonnelCardPdfData): void {
  cardPage(doc);
  const theme = themeFor(data.kind);
  const header = doc.linearGradient(0, 0, PERSONNEL_CARD_WIDTH_PT, 54);
  header.stop(0, theme.accent).stop(0.5, theme.middle).stop(1, "#0f172a");
  doc.rect(0, 0, PERSONNEL_CARD_WIDTH_PT, 54).fill(header);
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#ffffff")
    .text("AUTHENTIC AND VERIFIABLE", 10, 15, { width: PERSONNEL_CARD_WIDTH_PT - 20, align: "center", characterSpacing: 0.8 });
  doc.font("Helvetica").fontSize(5.2).fillColor("#cbd5e1")
    .text("Scan the secure code to confirm this card's current status.", 15, 30, { width: PERSONNEL_CARD_WIDTH_PT - 30, align: "center" });

  const qrSize = 82;
  const qrX = (PERSONNEL_CARD_WIDTH_PT - qrSize) / 2;
  doc.roundedRect(qrX - 5, 66, qrSize + 10, qrSize + 10, 7).fill("#f8fafc");
  if (data.qr) doc.image(data.qr, qrX, 71, { fit: [qrSize, qrSize] });
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a")
    .text("SCAN TO VERIFY", 10, 164, { width: PERSONNEL_CARD_WIDTH_PT - 20, align: "center", characterSpacing: 0.8 });
  doc.font("Courier").fontSize(4).fillColor("#94a3b8")
    .text(data.verifyUrl, 16, 177, { width: PERSONNEL_CARD_WIDTH_PT - 32, align: "center", height: 19, ellipsis: true });

  doc.roundedRect(12, 197, PERSONNEL_CARD_WIDTH_PT - 24, 28, 6).fill("#f8fafc");
  doc.font("Helvetica-Bold").fontSize(5.1).fillColor("#64748b")
    .text("IF THIS CARD IS FOUND", 19, 202, { characterSpacing: 0.55 });
  doc.fillColor("#334155");
  drawFittedSingleLine(doc, `Please return it to ${data.schoolName}.`, 19, 210, PERSONNEL_CARD_WIDTH_PT - 38, {
    font: "Helvetica",
    maxFontSize: 5.2,
    minFontSize: 4,
  });
  doc.fillColor("#64748b");
  drawFittedSingleLine(doc, `School contact: ${data.schoolPhone || "Not provided"}`, 19, 218, PERSONNEL_CARD_WIDTH_PT - 38, {
    font: "Helvetica-Bold",
    maxFontSize: 4.6,
    minFontSize: 3.9,
  });

  doc.fillColor("#94a3b8");
  drawFittedSingleLine(doc, `Property of ${data.schoolName} - Non-transferable`, 8, 233, PERSONNEL_CARD_WIDTH_PT - 16, {
    font: "Helvetica",
    maxFontSize: 4.2,
    minFontSize: 3.5,
    align: "center",
  });
}

export async function renderPersonnelCardPdf(data: PersonnelCardPdfData): Promise<Buffer> {
  const doc = new PDFDocument({
    autoFirstPage: false,
    size: [PERSONNEL_CARD_WIDTH_PT, PERSONNEL_CARD_HEIGHT_PT],
    margin: 0,
    info: {
      Title: `${data.kind === "TEACHER" ? "Teacher" : "Staff"} ID Card - ${data.holderName}`,
      Author: data.schoolName,
      Subject: `${data.cardNumber} - vector CR80 artwork with 300 DPI image assets`,
    },
  });
  const output = collectPdf(doc);
  doc.addPage({ size: [PERSONNEL_CARD_WIDTH_PT, PERSONNEL_CARD_HEIGHT_PT], margin: 0 });
  drawFront(doc, data);
  doc.addPage({ size: [PERSONNEL_CARD_WIDTH_PT, PERSONNEL_CARD_HEIGHT_PT], margin: 0 });
  drawBack(doc, data);
  doc.end();
  return output;
}
