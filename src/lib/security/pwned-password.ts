import crypto from "crypto";

const COMMON_LEAKED_PASSWORDS = new Set([
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password123",
  "qwerty",
  "qwerty123",
  "admin",
  "admin123",
  "admin1234",
  "letmein",
  "welcome",
  "bismillah",
  "blokagung",
  "lptq123",
  "lptqblokagung",
  "111111",
  "000000",
]);

const LEAKED_PASSWORD_MESSAGE =
  "Kata sandi ini tercatat pernah bocor di database publik (sandi pasaran/tidak aman). Silakan gunakan kombinasi kata sandi lain yang lebih unik.";

export interface LeakedPasswordCheckResult {
  leaked: boolean;
  count: number;
  message?: string;
}

/**
 * Memeriksa apakah kata sandi termasuk dalam daftar sandi bocor menggunakan
 * HaveIBeenPwned Pwned Passwords k-Anonymity API (hanya mengirim 5 karakter prefix SHA-1)
 * dengan fallback daftar lokal jika offline/timeout.
 */
export async function checkLeakedPassword(
  password: string
): Promise<LeakedPasswordCheckResult> {
  const normalized = password.trim().toLowerCase();
  if (COMMON_LEAKED_PASSWORDS.has(normalized)) {
    return {
      leaked: true,
      count: 1,
      message: LEAKED_PASSWORD_MESSAGE,
    };
  }

  const sha1 = crypto.createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: {
        "Add-Padding": "true",
        "User-Agent": "LPTQ-Blokagung-SecurityCheck",
      },
      signal: AbortSignal.timeout(3500),
      cache: "no-store",
    });

    if (!res.ok) {
      return { leaked: false, count: 0 };
    }

    const body = await res.text();
    for (const line of body.split(/\r?\n/)) {
      const [hashSuffix, countStr] = line.trim().split(":");
      if (hashSuffix === suffix) {
        const count = Number(countStr);
        if (count > 0) {
          return {
            leaked: true,
            count,
            message: LEAKED_PASSWORD_MESSAGE,
          };
        }
      }
    }
  } catch {
    // Jika layanan eksternal timeout atau offline, tetap andalkan pengecekan daftar lokal di atas
  }

  return { leaked: false, count: 0 };
}
