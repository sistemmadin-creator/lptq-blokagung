import jsQR from "jsqr";
import {
  decodeKhotmilQrPayload,
  calculateKhotmilScore,
  KhotmilQrData,
  ScannedSheetResult,
  ScannedJuzRow,
} from "./khotmil-omr-types";

export interface ScanFrameResult {
  status: "searching_qr" | "qr_detected" | "processing_omr" | "success" | "error";
  qrData?: KhotmilQrData;
  sheetResult?: ScannedSheetResult;
  errorMessage?: string;
  qrCornerPoints?: { x: number; y: number }[];
}

/**
 * Memeriksa kerapatan piksel hitam pada area lingkaran tertentu di ImageData.
 * Mengembalikan rasio piksel gelap (0.0 sampai 1.0).
 */
export function sampleBubbleDarkness(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number
): number {
  const { data, width, height } = imageData;
  let darkPixelCount = 0;
  let totalSampled = 0;

  const startX = Math.max(0, Math.floor(centerX - radius));
  const endX = Math.min(width - 1, Math.ceil(centerX + radius));
  const startY = Math.max(0, Math.floor(centerY - radius));
  const endY = Math.min(height - 1, Math.ceil(centerY + radius));

  const rSquared = radius * radius;

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= rSquared) {
        totalSampled++;
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Luminance grayscale (ITU-R BT.601)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 115) {
          darkPixelCount++;
        }
      }
    }
  }

  return totalSampled > 0 ? darkPixelCount / totalSampled : 0;
}

/**
 * Mencari bulatan tergelap dalam satu grup angka OMR
 */
export function detectMarkedOption(
  imageData: ImageData,
  bubblePositions: { value: number; x: number; y: number }[],
  radius: number,
  minThreshold: number = 0.32
): number {
  let highestRatio = -1;
  let selectedValue = 0; // default 0 jika semua bersih / tidak terarsir

  for (const bubble of bubblePositions) {
    const ratio = sampleBubbleDarkness(imageData, bubble.x, bubble.y, radius);
    if (ratio > highestRatio) {
      highestRatio = ratio;
      selectedValue = bubble.value;
    }
  }

  // Jika arsiran tertinggi di atas batas ambang minimum kehitaman
  if (highestRatio >= minThreshold) {
    return selectedValue;
  }

  // Jika tidak ada arsiran kuat, default 0
  return 0;
}

/**
 * Memproses satu frame video Canvas dari kamera HP:
 * 1. Deteksi QR Code LPTQ
 * 2. Hitung posisi grid OMR
 * 3. Ekstraksi nilai Kesalahan & Halaman Kosong
 * 4. Hitung skor otomatis (35% salah, 65% hal)
 */
export function processVideoFrame(
  canvas: HTMLCanvasElement,
  guideRect?: { x: number; y: number; width: number; height: number }
): ScanFrameResult {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { status: "error", errorMessage: "Canvas 2D context tidak tersedia." };
  }

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);

  // 1. Deteksi QR Code via jsQR
  const qr = jsQR(imageData.data, width, height, {
    inversionAttempts: "dontInvert",
  });

  if (!qr || !qr.data) {
    return { status: "searching_qr" };
  }

  const qrData = decodeKhotmilQrPayload(qr.data);
  if (!qrData) {
    return {
      status: "searching_qr",
      errorMessage: "QR Code ditemukan tetapi bukan format LJK LPTQ.",
    };
  }

  // Titik sudut QR untuk visual highlight di UI kamera
  const qrCorners = [
    qr.location.topLeftCorner,
    qr.location.topRightCorner,
    qr.location.bottomRightCorner,
    qr.location.bottomLeftCorner,
  ];

  // 2. Tentukan area referensi tabel OMR
  // Jika guideRect disediakan dari viewfinder layar, kita gunakan bounding box tersebut
  const boxX = guideRect ? guideRect.x : width * 0.08;
  const boxY = guideRect ? guideRect.y + guideRect.height * 0.22 : height * 0.25;
  const boxW = guideRect ? guideRect.width : width * 0.84;
  const boxH = guideRect ? guideRect.height * 0.65 : height * 0.65;

  const juzCount = qrData.juzList.length;
  if (juzCount === 0) {
    return { status: "error", errorMessage: "Daftar Juz pada QR Code kosong." };
  }

  const rowHeight = boxH / (juzCount + 1); // +1 untuk header
  const sampleRadius = Math.max(3, Math.min(8, Math.floor(rowHeight * 0.16)));

  const scannedRows: ScannedJuzRow[] = [];

  for (let i = 0; i < juzCount; i++) {
    const juzNum = qrData.juzList[i];
    const rowCenterY = boxY + (i + 1.5) * rowHeight;

    // Kolom OMR Kesalahan (berada di sekitar 48% - 70% lebar tabel)
    const salahPuluhanX = boxX + boxW * 0.50;
    const salahSatuanX = boxX + boxW * 0.60;

    // Koordinat Puluhan Kesalahan (0, 1, 2, 3)
    const salahPPositions = [0, 1, 2, 3].map((val, idx) => ({
      value: val,
      x: salahPuluhanX + (idx - 1.5) * (sampleRadius * 2.5),
      y: rowCenterY - sampleRadius * 1.1,
    }));
    const detSalahP = detectMarkedOption(imageData, salahPPositions, sampleRadius);

    // Koordinat Satuan Kesalahan (0..9)
    const salahSPositions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val, idx) => ({
      value: val,
      x: salahSatuanX + (idx - 4.5) * (sampleRadius * 2.2),
      y: rowCenterY + sampleRadius * 1.1,
    }));
    const detSalahS = detectMarkedOption(imageData, salahSPositions, sampleRadius);

    const totalKesalahan = detSalahP * 10 + detSalahS;

    // Kolom OMR Halaman Kosong (berada di sekitar 75% - 96% lebar tabel)
    const halPuluhanX = boxX + boxW * 0.80;
    const halSatuanX = boxX + boxW * 0.90;

    // Koordinat Puluhan Halaman Kosong (0, 1, 2)
    const halPPositions = [0, 1, 2].map((val, idx) => ({
      value: val,
      x: halPuluhanX + (idx - 1) * (sampleRadius * 2.5),
      y: rowCenterY - sampleRadius * 1.1,
    }));
    const detHalP = detectMarkedOption(imageData, halPPositions, sampleRadius);

    // Koordinat Satuan Halaman Kosong (0..9)
    const halSPositions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val, idx) => ({
      value: val,
      x: halSatuanX + (idx - 4.5) * (sampleRadius * 2.2),
      y: rowCenterY + sampleRadius * 1.1,
    }));
    const detHalS = detectMarkedOption(imageData, halSPositions, sampleRadius);

    const totalHalKosong = Math.min(20, detHalP * 10 + detHalS);

    // Hitung Nilai Otomatis (35% Kesalahan, 65% Keterbacaan Halaman)
    const breakdown = calculateKhotmilScore(totalKesalahan, totalHalKosong);

    scannedRows.push({
      juz: juzNum,
      kesalahan: breakdown.kesalahan,
      halKosong: breakdown.halKosong,
      nilai: breakdown.nilai,
      skorHalaman: breakdown.skorHalaman,
      skorKesalahan: breakdown.skorKesalahan,
      lulusKkm: breakdown.lulusKkm,
    });
  }

  // Hitung rata-rata dan status kelulusan KKM
  const totalNilai = scannedRows.reduce((acc, r) => acc + r.nilai, 0);
  const rataRata =
    scannedRows.length > 0 ? Number((totalNilai / scannedRows.length).toFixed(2)) : 0;
  const lulusSemua = rataRata >= 85;

  const sheetResult: ScannedSheetResult = {
    santriId: qrData.santriId,
    santriKode: qrData.kode,
    santriNama: qrData.nama,
    jenis: qrData.jenis,
    tahap: qrData.tahap,
    rows: scannedRows,
    rataRata,
    lulusSemua,
    scannedAt: new Date().toISOString(),
  };

  return {
    status: "success",
    qrData,
    sheetResult,
    qrCornerPoints: qrCorners,
  };
}
