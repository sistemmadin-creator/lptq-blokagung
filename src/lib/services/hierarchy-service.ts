import { createClient } from "@/lib/supabase/client";

export interface HierarchyRule {
  id: string;
  tree: "tree1";
  parentPath: string; // Format: "Blok > Asrama > Kode" (contoh: "Blok 1 > Al Hikmah > E")
  type: "numeric" | "alpha" | "manual";
  numStart?: number | string;
  numEnd?: number | string;
  alphaStart?: string;
  alphaEnd?: string;
  manualList?: string;
}

export type HierarchyTree = {
  [blok: string]: {
    [asrama: string]: {
      [kode: string]: string[];
    };
  };
};

export const DEFAULT_HIERARCHY_RULES: HierarchyRule[] = [
  { id: "rule_1", tree: "tree1", parentPath: "Blok 12 > Maqomin Amin > AB", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_2", tree: "tree1", parentPath: "Blok 12 > Munzalan Mubaroka > W", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_3", tree: "tree1", parentPath: "Blok 11 > Bir Aly > X", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_4", tree: "tree1", parentPath: "Blok 11 > Al Multazam > HB", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_5", tree: "tree1", parentPath: "Blok 11 > Al Multazam > HA", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_6", tree: "tree1", parentPath: "Blok 10 > Al Munawwir > Z", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_7", tree: "tree1", parentPath: "Blok 9 > Syafaatul Quran > Y", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_8", tree: "tree1", parentPath: "Blok 8 > Al Mamuroh D > MD", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_9", tree: "tree1", parentPath: "Blok 8 > Al Mamuroh C > MC", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_10", tree: "tree1", parentPath: "Blok 8 > Al Mamuroh B > MB", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_11", tree: "tree1", parentPath: "Blok 8 > Al Mamuroh A > MA", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_12", tree: "tree1", parentPath: "Blok 7 > Al Baqoroh > -", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_13", tree: "tree1", parentPath: "Blok 7 > Al Fatihah > -", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_14", tree: "tree1", parentPath: "Blok 6 > Nafahatul Uluwiyah > Z", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_15", tree: "tree1", parentPath: "Blok 5 > As Salam > X", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_16", tree: "tree1", parentPath: "Blok 4 > An Nahdloh > AB", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_17", tree: "tree1", parentPath: "Blok 4 > Al Hambran > AA", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_18", tree: "tree1", parentPath: "Blok 4 > Al Anwar > U", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_19", tree: "tree1", parentPath: "Blok 4 > Al Ahghaf > T", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_20", tree: "tree1", parentPath: "Blok 4 > Al Firdaus > S", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_21", tree: "tree1", parentPath: "Blok 3 > Al Malikiyyah > AC", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_22", tree: "tree1", parentPath: "Blok 3 > As Safiiyyah > V", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_23", tree: "tree1", parentPath: "Blok 2 > Darul Lughah Al Arobiyyah > W", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_24", tree: "tree1", parentPath: "Blok 2 > As Saidiyyah > Q", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_25", tree: "tree1", parentPath: "Blok 1 > Al Arofah > AA", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_26", tree: "tree1", parentPath: "Blok 1 > Al Aziziyah > O", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_27", tree: "tree1", parentPath: "Induk Putri Selatan > Nafahatul Musyarofah > Q", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_28", tree: "tree1", parentPath: "Induk Putri Selatan > Nafahatul Musyahadah > P", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_29", tree: "tree1", parentPath: "Induk Putri Selatan > Nafahatul Laduniyyah > I", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_30", tree: "tree1", parentPath: "Induk Putri Selatan > Nafahatul Ambariyah > H", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_31", tree: "tree1", parentPath: "Induk Putri Utara > Al Inaroh > T", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_32", tree: "tree1", parentPath: "Induk Putri Utara > Al Mubarokah > S", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_33", tree: "tree1", parentPath: "Induk Putri Utara > Al Multazam > R", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_34", tree: "tree1", parentPath: "Induk Putri Utara > Ar Roudloh > L", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_35", tree: "tree1", parentPath: "Induk Putri Utara > Tuhfatun Nidhomiyah > K", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_36", tree: "tree1", parentPath: "Induk Putri Utara > Tuhfatul Abadiyah > J", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_37", tree: "tree1", parentPath: "Induk Putri Utara > Nurud Darojah > G", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_38", tree: "tree1", parentPath: "Induk Putri Utara > Nurul Jadidah > F", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_39", tree: "tree1", parentPath: "Induk Putri Utara > Futuhatu Laduniyyah > E", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_40", tree: "tree1", parentPath: "Induk Putri Utara > Al Masyitoh > D", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_41", tree: "tree1", parentPath: "Induk Putri Utara > Al Fatimah > C", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_42", tree: "tree1", parentPath: "Induk Putri Utara > Al Aisyah > B", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_43", tree: "tree1", parentPath: "Induk Putri Utara > Al Khodijah > A", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_44", tree: "tree1", parentPath: "Blok Induk Putra > As Salafiyyah > Y", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_45", tree: "tree1", parentPath: "Blok Induk Putra > Al Qohiroh > V", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_46", tree: "tree1", parentPath: "Blok Induk Putra > Al Mujahidin > R", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_47", tree: "tree1", parentPath: "Blok Induk Putra > Al Khoiriyyah > Q", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_48", tree: "tree1", parentPath: "Blok Induk Putra > Al Barokah > P", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_49", tree: "tree1", parentPath: "Blok Induk Putra > Al Ukhuwwah > O", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_50", tree: "tree1", parentPath: "Blok Induk Putra > Al Uluwiyyah > N", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_51", tree: "tree1", parentPath: "Blok Induk Putra > Al Ikmal > M", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_52", tree: "tree1", parentPath: "Blok Induk Putra > Al Muawanah > L", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_53", tree: "tree1", parentPath: "Blok Induk Putra > Al Azhar > K", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_54", tree: "tree1", parentPath: "Blok Induk Putra > Al Munawwaroh > J", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_55", tree: "tree1", parentPath: "Blok Induk Putra > Al Hidayah > I", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_56", tree: "tree1", parentPath: "Blok Induk Putra > Al Ghozali > G", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_57", tree: "tree1", parentPath: "Blok Induk Putra > Khulusunnajah > F", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_58", tree: "tree1", parentPath: "Blok Induk Putra > Al Hikmah Bawah > E", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_59", tree: "tree1", parentPath: "Blok Induk Putra > Al Hikmah Atas > E", type: "numeric", numStart: 11, numEnd: 20 },
  { id: "rule_60", tree: "tree1", parentPath: "Blok Induk Putra > Al Qudsiyyah > D", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_61", tree: "tree1", parentPath: "Blok Induk Putra > Al Falah > C", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_62", tree: "tree1", parentPath: "Blok Induk Putra > Al Fajar > B", type: "numeric", numStart: 1, numEnd: 10 },
  { id: "rule_63", tree: "tree1", parentPath: "Blok Induk Putra > Al Musyarokah > A", type: "numeric", numStart: 1, numEnd: 10 },
];

const LOCAL_STORAGE_KEY = "lptq_hierarchy_rules";

/** Nilai bawaan "kosong" untuk Kode dan Kamar pada dropdown hierarki. */
export const EMPTY_HIERARCHY_VALUE = "-";

/**
 * Mengubah array aturan hierarki menjadi objek pohon nested:
 * tree[blok][asrama][kode] = array kamar
 *
 * Secara bawaan ("-") otomatis tersedia sebagai pilihan kosong:
 * - setiap asrama memiliki Kode "-" dengan Kamar ["-"]
 * - setiap daftar Kamar diawali pilihan "-"
 * Nomor kamar angka ditulis apa adanya (2, bukan 02).
 */
export function parseHierarchyTree(
  rules: HierarchyRule[],
  options: { includeEmptyDefault?: boolean } = {}
): HierarchyTree {
  const { includeEmptyDefault = true } = options;
  const tree: HierarchyTree = {};

  if (!Array.isArray(rules)) return tree;

  rules.forEach((rule) => {
    if (!rule.parentPath) return;

    const parts = rule.parentPath.split(">").map((s) => s.trim()).filter(Boolean);
    const blok = parts[0] || "Umum";
    const asrama = parts[1] || EMPTY_HIERARCHY_VALUE;
    const kode = parts[2] || EMPTY_HIERARCHY_VALUE;

    const kamarList: string[] = [];

    if (rule.type === "numeric") {
      let start = parseInt(String(rule.numStart || 1), 10);
      let end = parseInt(String(rule.numEnd || 10), 10);
      if (isNaN(start)) start = 1;
      if (isNaN(end)) end = 10;
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }
      for (let i = start; i <= end; i++) {
        kamarList.push(String(i));
      }
    } else if (rule.type === "alpha") {
      let start = String(rule.alphaStart || "A").toUpperCase().charCodeAt(0);
      let end = String(rule.alphaEnd || "E").toUpperCase().charCodeAt(0);
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }
      for (let i = start; i <= end; i++) {
        kamarList.push(String.fromCharCode(i));
      }
    } else {
      const items = String(rule.manualList || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      kamarList.push(...items);
    }

    if (!tree[blok]) tree[blok] = {};
    if (!tree[blok][asrama]) tree[blok][asrama] = {};
    if (!tree[blok][asrama][kode]) tree[blok][asrama][kode] = [];

    kamarList.forEach((k) => {
      if (!tree[blok][asrama][kode].includes(k)) {
        tree[blok][asrama][kode].push(k);
      }
    });
  });

  if (includeEmptyDefault) {
    Object.keys(tree).forEach((b) => {
      Object.keys(tree[b]).forEach((a) => {
        if (!tree[b][a][EMPTY_HIERARCHY_VALUE]) {
          tree[b][a][EMPTY_HIERARCHY_VALUE] = [];
        }
        Object.keys(tree[b][a]).forEach((k) => {
          const list = tree[b][a][k].filter((x) => x !== EMPTY_HIERARCHY_VALUE);
          tree[b][a][k] = [EMPTY_HIERARCHY_VALUE, ...list];
        });
      });
    });
  }

  return tree;
}

/**
 * Mengekstrak daftar enum unik untuk Blok, Asrama, Kode, dan Kamar
 * dari aturan hierarki aktif, beserta daftar kombinasi valid.
 * Pilihan kosong "-" selalu tersedia di urutan pertama untuk Kode dan Kamar.
 */
export function extractHierarchyEnums(rules: HierarchyRule[]) {
  const bloks = new Set<string>();
  const asramas = new Set<string>();
  const kodes = new Set<string>();
  const kamars = new Set<string>();
  const combinations: {
    blok: string;
    asrama: string;
    kode: string;
    kamarList: string[];
  }[] = [];

  const tree = parseHierarchyTree(rules, { includeEmptyDefault: false });
  Object.keys(tree).forEach((b) => {
    bloks.add(b);
    Object.keys(tree[b]).forEach((a) => {
      asramas.add(a);
      Object.keys(tree[b][a]).forEach((k) => {
        kodes.add(k);
        const kmList = tree[b][a][k];
        kmList.forEach((km) => kamars.add(km));
        combinations.push({
          blok: b,
          asrama: a,
          kode: k,
          kamarList: kmList,
        });
      });
    });
  });

  kodes.delete(EMPTY_HIERARCHY_VALUE);
  kamars.delete(EMPTY_HIERARCHY_VALUE);

  const routes = combinations.map((c) => `${c.blok} > ${c.asrama} > ${c.kode}`);

  return {
    bloks: Array.from(bloks).sort(),
    asramas: Array.from(asramas).sort(),
    kodes: [EMPTY_HIERARCHY_VALUE, ...Array.from(kodes).sort()],
    kamars: [
      EMPTY_HIERARCHY_VALUE,
      ...Array.from(kamars).sort((x, y) => x.localeCompare(y, undefined, { numeric: true })),
    ],
    combinations,
    routes,
  };
}

/**
 * Membaca aturan hierarki dari Supabase atau LocalStorage
 */
export async function loadHierarchyRules(): Promise<HierarchyRule[]> {
  // 1. Coba baca dari Supabase
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "APP_SETTINGS")
      .maybeSingle();

    if (!error && data?.value) {
      const rawTree1 = data.value.tree1 || data.value.hierarchy_rules;
      if (rawTree1) {
        const parsed = typeof rawTree1 === "string" ? JSON.parse(rawTree1) : rawTree1;
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    }
  } catch {
    // Abaikan jika Supabase belum ada tabel app_settings
  }

  // 2. Coba baca dari LocalStorage
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // LocalStorage error
    }
  }

  // 3. Fallback default
  return DEFAULT_HIERARCHY_RULES;
}

/**
 * Menyimpan aturan hierarki ke Supabase dan LocalStorage
 */
export async function saveHierarchyRules(rules: HierarchyRule[]): Promise<void> {
  // Simpan ke LocalStorage segera
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rules));
  }

  // Simpan ke Supabase jika memungkinkan
  try {
    const supabase = createClient();
    await supabase.from("app_settings").upsert(
      [
        {
          key: "APP_SETTINGS",
          value: {
            tree1: JSON.stringify(rules),
            updated_at: new Date().toISOString(),
          },
        },
      ],
      { onConflict: "key" }
    );
  } catch {
    // Tidak melempar error agar tetap berjalan mulus lewat LocalStorage jika koneksi bermasalah
  }
}

/**
 * Format penggabungan Kode dan Kamar untuk tampilan ringkas pada kartu halaqoh.
 * Contoh: Kode "E", Kamar "1" atau "01" -> "E1"
 *         Kode "E", Kamar "03" -> "E3"
 *         Kode "-", Kamar "03" -> "3"
 *         Kode "-", Kamar "-"  -> "-"
 */
export function formatKamarDisplay(
  kodeKamar?: string | null,
  kamar?: string | null
): string {
  const cleanKode = (kodeKamar || "").trim();
  const cleanKamarRaw = (kamar || "").trim();
  const hasKode = cleanKode !== "" && cleanKode !== "-";
  const hasKamar = cleanKamarRaw !== "" && cleanKamarRaw !== "-";

  if (!hasKode && !hasKamar) return "-";
  if (hasKode && !hasKamar) return cleanKode;

  // Hapus angka 0 di depan jika digit angka murni, misal "01" -> "1", "03" -> "3"
  const normalizedKamar = cleanKamarRaw.replace(/^0+(?=\d)/, "");

  if (hasKode) {
    return `${cleanKode}${normalizedKamar}`;
  }
  return normalizedKamar;
}

