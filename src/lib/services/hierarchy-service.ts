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
  {
    id: "rule_1",
    tree: "tree1",
    parentPath: "Blok 1 > Al Hikmah > E",
    type: "numeric",
    numStart: 1,
    numEnd: 20,
  },
  {
    id: "rule_2",
    tree: "tree1",
    parentPath: "Blok 1 > Al Ghozali > G",
    type: "numeric",
    numStart: 1,
    numEnd: 10,
  },
  {
    id: "rule_3",
    tree: "tree1",
    parentPath: "Blok A > Al-Falah > A",
    type: "numeric",
    numStart: 1,
    numEnd: 10,
  },
  {
    id: "rule_4",
    tree: "tree1",
    parentPath: "Blok B > An-Nur > B",
    type: "numeric",
    numStart: 1,
    numEnd: 10,
  },
];

const LOCAL_STORAGE_KEY = "lptq_hierarchy_rules";

/**
 * Mengubah array aturan hierarki menjadi objek pohon nested:
 * tree[blok][asrama][kode] = array kamar
 */
export function parseHierarchyTree(rules: HierarchyRule[]): HierarchyTree {
  const tree: HierarchyTree = {};

  if (!Array.isArray(rules)) return tree;

  rules.forEach((rule) => {
    if (!rule.parentPath) return;

    const parts = rule.parentPath.split(">").map((s) => s.trim()).filter(Boolean);
    const blok = parts[0] || "Umum";
    const asrama = parts[1] || "-";
    const kode = parts[2] || "-";

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
        kamarList.push(i < 10 ? `0${i}` : String(i));
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

  return tree;
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
