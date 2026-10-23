import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const nama = searchParams.get("nama") || "Nama Santri";
    const asrama = searchParams.get("asrama") || "Pusat";
    const kamar = searchParams.get("kamar") || "-";
    const program = searchParams.get("program") || "Khotmil 30 Juz";
    const tahap = searchParams.get("tahap") || "Tahap 1";
    const rataRata = searchParams.get("rataRata") || "0";
    const kkm = searchParams.get("kkm") || "TUNTAS";
    const tanggal = searchParams.get("tanggal") || new Date().toLocaleDateString("id-ID");
    const catatan = searchParams.get("catatan") || "Alhamdulillah evaluasi telah dilaksanakan dengan baik.";
    const penguji = searchParams.get("penguji") || "Pengurus Pusat LPTQ";
    const rawScores = searchParams.get("scores") || ""; // format: "Juz 1:85,Juz 2:90"

    // Parse scores
    const scoreItems = rawScores
      ? rawScores.split(",").map((item) => {
          const [juzLabel, val] = item.split(":");
          return { label: juzLabel?.trim() || "Juz", val: val?.trim() || "0" };
        })
      : [
          { label: "Juz 1", val: "85" },
          { label: "Juz 2", val: "90" },
          { label: "Juz 3", val: "88" },
        ];

    const isTuntas = kkm.toUpperCase() === "TUNTAS";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f4f6f8",
            fontFamily: "sans-serif",
            padding: "36px",
            boxSizing: "border-box",
          }}
        >
          {/* Card Wrapper */}
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#ffffff",
              borderRadius: "28px",
              border: "3px solid #059669",
              boxShadow: "0 20px 30px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {/* Header Pesantren */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#064e3b",
                color: "#ffffff",
                padding: "24px 36px",
                borderBottom: "4px solid #10b981",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    backgroundColor: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "900",
                    fontSize: "20px",
                    color: "#064e3b",
                    border: "2px solid #10b981",
                  }}
                >
                  LPTQ
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                    LPTQ PONDOK PESANTREN DARUSSALAM
                  </span>
                  <span style={{ fontSize: "14px", color: "#a7f3d0", fontWeight: "600", marginTop: "2px" }}>
                    Blokagung, Banyuwangi • Kartu Laporan Hasil Evaluasi Santri
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#047857",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  border: "1.5px solid #34d399",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff" }}>
                  {program}
                </span>
              </div>
            </div>

            {/* Content Body: 2 Kolom */}
            <div
              style={{
                display: "flex",
                flex: 1,
                padding: "30px 36px",
                gap: "30px",
              }}
            >
              {/* Kolom Kiri: Biodata Santri & Catatan */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1.2",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
                    Hasil Ujian Santri
                  </span>
                  <span
                    style={{
                      fontSize: "34px",
                      fontWeight: "900",
                      color: "#0f172a",
                      marginTop: "4px",
                      lineHeight: "1.2",
                    }}
                  >
                    {nama}
                  </span>

                  {/* Info Asrama & Kamar */}
                  <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        padding: "6px 14px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#065f46",
                      }}
                    >
                      Asrama: {asrama}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        padding: "6px 14px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#065f46",
                      }}
                    >
                      Kamar: {kamar}
                    </div>
                  </div>

                  {/* Tahap Ujian */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: "16px",
                      fontSize: "16px",
                      color: "#334155",
                      fontWeight: "600",
                    }}
                  >
                    Tahap: <span style={{ fontWeight: "800", color: "#065f46", marginLeft: "6px" }}>{tahap}</span>
                  </div>
                </div>

                {/* Kotak Catatan Penguji */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#f8fafc",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "16px 20px",
                    marginTop: "16px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Catatan Penguji / Ustadz:
                  </span>
                  <span style={{ fontSize: "14px", color: "#1e293b", fontStyle: "italic", marginTop: "6px", lineHeight: "1.4" }}>
                    &ldquo;{catatan}&rdquo;
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#059669", marginTop: "8px" }}>
                    Diuji oleh: {penguji}
                  </span>
                </div>
              </div>

              {/* Kolom Kanan: Rincian Nilai & Status KKM */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1",
                  backgroundColor: "#f8fafc",
                  borderRadius: "20px",
                  border: "2px solid #e2e8f0",
                  padding: "24px",
                  justifyContent: "space-between",
                }}
              >
                {/* Rincian per Juz */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "12px" }}>
                    Rincian Nilai per Juz:
                  </span>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {scoreItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor: "#ffffff",
                          padding: "8px 16px",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <span style={{ fontSize: "15px", fontWeight: "700", color: "#334155" }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: "17px", fontWeight: "900", color: "#065f46" }}>
                          {item.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kotak Ringkasan Nilai & KKM */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: isTuntas ? "#ecfdf5" : "#fef2f2",
                    border: isTuntas ? "2px solid #10b981" : "2px solid #ef4444",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    marginTop: "16px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                      Rata-Rata Nilai
                    </span>
                    <span
                      style={{
                        fontSize: "36px",
                        fontWeight: "900",
                        color: isTuntas ? "#065f46" : "#b91c1c",
                        lineHeight: "1.1",
                      }}
                    >
                      {rataRata}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                      Status KKM
                    </span>
                    <div
                      style={{
                        backgroundColor: isTuntas ? "#059669" : "#dc2626",
                        color: "#ffffff",
                        padding: "8px 18px",
                        borderRadius: "12px",
                        fontSize: "16px",
                        fontWeight: "900",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {isTuntas ? "✓ TUNTAS" : "✕ REMIDI"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f1f5f9",
                padding: "14px 36px",
                borderTop: "1.5px solid #e2e8f0",
                fontSize: "13px",
                color: "#64748b",
                fontWeight: "600",
              }}
            >
              <span>Tanggal Ujian: {tanggal}</span>
              <span style={{ color: "#059669", fontWeight: "700" }}>
                LPTQ Darussalam Blokagung • Sistem Otomasi Notifikasi
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 675,
      }
    );
  } catch (e: any) {
    console.error("Gagal membuat gambar rapor evaluasi", e);
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
