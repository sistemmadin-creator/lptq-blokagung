import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toJpeg } from "html-to-image";
import { sanitizeSpreadsheetCell } from "@/lib/utils/excel";
import type { SesiAbsen } from "@/types/database";

export interface RekapSantriRow {
  santri_id: string;
  nama_lengkap: string;
  kamar: string;
  hadir: number;
  alfa: number;
  izin: number;
  sakit: number;
  statusLabel: string;
  statusLevel: "tertib" | "peringatan" | "kritis";
  juzBaru: number;
  halamanBaru: number;
  evaluasiJuz: number;
}

export interface RekapHalaqohGroup {
  id: string;
  kelas: number;
  bagian: string;
  kodeLabel: string;
  targetJuz: string;
  pembimbing: string;
  rows: RekapSantriRow[];
}

export interface RekapExportMeta {
  bulanNama: string;
  tahun: number;
  sesi: SesiAbsen | "semua";
  appName?: string;
}

function getSesiLabel(sesi: SesiAbsen | "semua"): string {
  if (sesi === "pagi") return "Pagi";
  if (sesi === "malam") return "Malam";
  return "Semua (Pagi & Malam)";
}

function sanitizeFileSlug(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

export function buildRekapFileBaseName(meta: RekapExportMeta, suffix?: string): string {
  const sesiPart = meta.sesi === "semua" ? "SemuaSesi" : meta.sesi.toUpperCase();
  const base = `Rekap_Keseluruhan_${sanitizeFileSlug(meta.bulanNama)}_${meta.tahun}_${sesiPart}`;
  return suffix ? `${base}_${sanitizeFileSlug(suffix)}` : base;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Mengekspor seluruh kelompok halaqoh pada Rekap Keseluruhan ke berkas Excel (.xlsx)
 * lengkap dengan header bertingkat (merge cell Absensi & Juz Baru) menggunakan ExcelJS.
 */
export async function exportRekapKeseluruhanExcel(
  groups: RekapHalaqohGroup[],
  meta: RekapExportMeta
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.appName || "LPTQ Pondok Pesantren Darussalam Blokagung";
  wb.created = new Date();

  const ws = wb.addWorksheet("Rekap Keseluruhan", {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { key: "no", width: 6 },
    { key: "nama", width: 34 },
    { key: "kamar", width: 11 },
    { key: "h", width: 7 },
    { key: "a", width: 7 },
    { key: "i", width: 7 },
    { key: "s", width: 7 },
    { key: "status", width: 13 },
    { key: "juz", width: 8 },
    { key: "halaman", width: 10 },
    { key: "evaluasi", width: 11 },
  ];

  // Kop Laporan
  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "LPTQ PONDOK PESANTREN DARUSSALAM BLOKAGUNG";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF064E3B" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:K2");
  const subtitleCell = ws.getCell("A2");
  subtitleCell.value = `REKAP KESELURUHAN SANTRI TAHFIDZ — ${meta.bulanNama.toUpperCase()} ${meta.tahun} (SESI: ${getSesiLabel(meta.sesi).toUpperCase()})`;
  subtitleCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;

  let currentRow = 4;

  const thinBorder = {
    top: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    left: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    right: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
  };

  for (const grp of groups) {
    // Banner Kelompok Halaqoh
    ws.mergeCells(currentRow, 1, currentRow, 11);
    const grpCell = ws.getCell(currentRow, 1);
    const pembimbingInfo = grp.pembimbing ? ` • Pembimbing: ${grp.pembimbing}` : "";
    grpCell.value = `Halaqoh ${grp.kodeLabel} (${grp.targetJuz})${pembimbingInfo} — ${grp.rows.length} Santri`;
    grpCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF065F46" } };
    grpCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    grpCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    grpCell.border = {
      top: { style: "medium", color: { argb: "FF047857" } },
      bottom: { style: "thin", color: { argb: "FFA7F3D0" } },
      left: { style: "thin", color: { argb: "FFA7F3D0" } },
      right: { style: "thin", color: { argb: "FFA7F3D0" } },
    };
    ws.getRow(currentRow).height = 22;
    currentRow += 1;

    // Header Tingkat 1 & 2
    const h1Row = currentRow;
    const h2Row = currentRow + 1;

    ws.getCell(h1Row, 1).value = "No";
    ws.getCell(h1Row, 2).value = "Nama";
    ws.getCell(h1Row, 3).value = "Kamar";
    ws.getCell(h1Row, 4).value = "Absensi";
    ws.getCell(h1Row, 9).value = "Juz Baru";
    ws.getCell(h1Row, 11).value = "Evaluasi";

    const subHeaders = ["H", "A", "I", "S", "Status", "Juz", "Halaman"];
    subHeaders.forEach((label, idx) => {
      ws.getCell(h2Row, 4 + idx).value = label;
    });

    ws.mergeCells(h1Row, 1, h2Row, 1); // No
    ws.mergeCells(h1Row, 2, h2Row, 2); // Nama
    ws.mergeCells(h1Row, 3, h2Row, 3); // Kamar
    ws.mergeCells(h1Row, 4, h1Row, 8); // Absensi
    ws.mergeCells(h1Row, 9, h1Row, 10); // Juz Baru
    ws.mergeCells(h1Row, 11, h2Row, 11); // Evaluasi

    [h1Row, h2Row].forEach((rIdx) => {
      const row = ws.getRow(rIdx);
      row.height = 20;
      for (let c = 1; c <= 11; c += 1) {
        const cell = row.getCell(c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rIdx === h1Row ? "FF065F46" : "FF047857" },
        };
        cell.font = {
          name: "Calibri",
          size: rIdx === h1Row ? 10.5 : 10,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FF064E3B" } },
          bottom: { style: "thin", color: { argb: "FF064E3B" } },
          left: { style: "thin", color: { argb: "FF064E3B" } },
          right: { style: "thin", color: { argb: "FF064E3B" } },
        };
      }
    });

    currentRow += 2;

    // Baris Data Santri
    grp.rows.forEach((s, idx) => {
      const row = ws.getRow(currentRow);
      row.values = [
        idx + 1,
        sanitizeSpreadsheetCell(s.nama_lengkap),
        sanitizeSpreadsheetCell(s.kamar),
        s.hadir,
        s.alfa,
        s.izin,
        s.sakit,
        s.statusLabel,
        s.juzBaru,
        s.halamanBaru,
        s.evaluasiJuz,
      ];
      row.height = 19;

      for (let c = 1; c <= 11; c += 1) {
        const cell = row.getCell(c);
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } };
        cell.border = thinBorder;
        cell.alignment = {
          horizontal: c === 2 ? "left" : "center",
          vertical: "middle",
          wrapText: c === 2,
        };
        if (idx % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      }

      // Pewarnaan khusus kolom H, A, I, S, dan Status
      row.getCell(4).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF047857" } };
      row.getCell(5).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFBE123C" } };
      row.getCell(6).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1D4ED8" } };
      row.getCell(7).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFB45309" } };

      const statusCell = row.getCell(8);
      if (s.statusLevel === "tertib") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
        statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF065F46" } };
      } else if (s.statusLevel === "peringatan") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF92400E" } };
      } else {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
        statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF9F1239" } };
      }

      row.getCell(11).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF065F46" } };
      currentRow += 1;
    });

    // Jarak antar halaqoh
    currentRow += 1;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(blob, `${buildRekapFileBaseName(meta)}.xlsx`);
}

/**
 * Mengekspor Rekap Keseluruhan ke dokumen PDF vektor menggunakan jsPDF + autoTable.
 */
export function exportRekapKeseluruhanPdf(
  groups: RekapHalaqohGroup[],
  meta: RekapExportMeta
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  // Kop Dokumen PDF
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(6, 78, 59); // #064e3b
  doc.text("LPTQ PONDOK PESANTREN DARUSSALAM BLOKAGUNG", pageWidth / 2, 14, {
    align: "center",
  });

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("REKAP KESELURUHAN SANTRI TAHFIDZ", pageWidth / 2, 20, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Periode Absensi: ${meta.bulanNama} ${meta.tahun} (Sesi: ${getSesiLabel(meta.sesi)})  |  Tahun Setoran & Evaluasi: ${meta.tahun}`,
    pageWidth / 2,
    25.5,
    { align: "center" }
  );

  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.5);
  doc.line(marginX, 28, pageWidth - marginX, 28);

  let cursorY = 33;

  groups.forEach((grp, grpIdx) => {
    if (grpIdx > 0) {
      cursorY += 6;
    }

    // Hindari banner grup menggantung sendirian di bawah halaman
    if (cursorY > pageHeight - 40) {
      doc.addPage();
      cursorY = 14;
    }

    // Banner Kelompok Halaqoh
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 7.5, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(6, 95, 70);
    const pembimbingText = grp.pembimbing ? `  |  Pembimbing: ${grp.pembimbing}` : "";
    doc.text(
      `Halaqoh ${grp.kodeLabel} (${grp.targetJuz})${pembimbingText}`,
      marginX + 3,
      cursorY + 5
    );

    doc.setFontSize(8.5);
    doc.text(`${grp.rows.length} Santri`, pageWidth - marginX - 3, cursorY + 5, {
      align: "right",
    });

    cursorY += 9;

    const bodyRows = grp.rows.map((s, idx) => [
      String(idx + 1),
      s.nama_lengkap,
      s.kamar,
      String(s.hadir),
      String(s.alfa),
      String(s.izin),
      String(s.sakit),
      s.statusLabel,
      String(s.juzBaru),
      String(s.halamanBaru),
      String(s.evaluasiJuz),
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, top: 14, bottom: 14 },
      theme: "grid",
      head: [
        [
          { content: "No", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Nama", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
          { content: "Kamar", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Absensi", colSpan: 5, styles: { halign: "center", valign: "middle" } },
          { content: "Juz Baru", colSpan: 2, styles: { halign: "center", valign: "middle" } },
          { content: "Evaluasi", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        ],
        [
          { content: "H", styles: { halign: "center", fillColor: [4, 120, 87] } },
          { content: "A", styles: { halign: "center", fillColor: [4, 120, 87] } },
          { content: "I", styles: { halign: "center", fillColor: [4, 120, 87] } },
          { content: "S", styles: { halign: "center", fillColor: [4, 120, 87] } },
          { content: "Status", styles: { halign: "center", fillColor: [4, 120, 87] } },
          { content: "Juz", styles: { halign: "center", fillColor: [4, 120, 87] } },
          { content: "Halaman", styles: { halign: "center", fillColor: [4, 120, 87] } },
        ],
      ],
      body: bodyRows,
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: { top: 1.8, right: 1.5, bottom: 1.8, left: 1.5 },
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [6, 95, 70],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 9, halign: "center" },
        1: { cellWidth: 52, halign: "left" },
        2: { cellWidth: 14, halign: "center", fontStyle: "bold" },
        3: { cellWidth: 10, halign: "center", textColor: [4, 120, 87], fontStyle: "bold" },
        4: { cellWidth: 10, halign: "center", textColor: [190, 18, 60], fontStyle: "bold" },
        5: { cellWidth: 10, halign: "center", textColor: [29, 78, 216], fontStyle: "bold" },
        6: { cellWidth: 10, halign: "center", textColor: [180, 83, 9], fontStyle: "bold" },
        7: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        8: { cellWidth: 12, halign: "center", fontStyle: "bold" },
        9: { cellWidth: 17, halign: "center" },
        10: { cellWidth: 20, halign: "center", textColor: [6, 95, 70], fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          const rowItem = grp.rows[data.row.index];
          if (!rowItem) return;
          if (rowItem.statusLevel === "tertib") {
            data.cell.styles.fillColor = [209, 250, 229];
            data.cell.styles.textColor = [6, 95, 70];
          } else if (rowItem.statusLevel === "peringatan") {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [146, 64, 14];
          } else {
            data.cell.styles.fillColor = [255, 228, 230];
            data.cell.styles.textColor = [159, 18, 57];
          }
        }
      },
    });

    const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    cursorY = lastTable?.finalY ?? cursorY + 20;
  });

  // Footer nomor halaman di setiap halaman PDF
  const totalPages = doc.getNumberOfPages();
  const printedDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dicetak: ${printedDate} — LPTQ Blokagung`, marginX, pageHeight - 7);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - marginX, pageHeight - 7, {
      align: "right",
    });
  }

  doc.save(`${buildRekapFileBaseName(meta)}.pdf`);
}

/**
 * Mengonversi elemen DOM tabel Rekap Keseluruhan menjadi berkas gambar .jpg tajam (pixelRatio: 2).
 * Secara sementara menonaktifkan mode gelap pada root HTML agar hasil .jpg selalu putih bersih siap cetak/WA.
 */
export async function exportElementToJpg(
  element: HTMLElement,
  fileNameBase: string
): Promise<void> {
  const htmlEl = document.documentElement;
  const hadDarkClass = htmlEl.classList.contains("dark");
  if (hadDarkClass) {
    htmlEl.classList.remove("dark");
  }

  try {
    // Beri jeda 1 frame agar repaint tema terang selesai sebelum capture
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains("no-export")) {
          return false;
        }
        return true;
      },
    });

    const link = document.createElement("a");
    link.download = `${fileNameBase}.jpg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    if (hadDarkClass) {
      htmlEl.classList.add("dark");
    }
  }
}
