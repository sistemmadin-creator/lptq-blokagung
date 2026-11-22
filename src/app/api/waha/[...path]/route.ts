import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabase,
  getUserRole,
  verifyCsrfOrigin,
} from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export const dynamic = "force-dynamic";

const ALLOWED_WAHA_ROLES: AppRole[] = ["admin", "pengurus", "pembimbing"];
const ALLOWED_PATH_PREFIXES = new Set(["sessions", "sendImage", "sendText"]);

function getAllowedWahaBaseUrl(requestedUrl?: string | null): string | null {
  const defaultBase = (process.env.WAHA_BASE_URL || "http://localhost:3008").replace(/\/+$/, "");
  const allowedBases = new Set([
    defaultBase,
    "http://localhost:3008",
    "http://127.0.0.1:3008",
    "https://waha.blokagung.net",
  ]);

  if (!requestedUrl || !requestedUrl.trim()) {
    return defaultBase;
  }

  const normalized = requestedUrl.trim().replace(/\/+$/, "");
  if (allowedBases.has(normalized)) {
    return normalized;
  }

  return null;
}

function validateWahaPath(pathSegments: string[]): string | null {
  if (!Array.isArray(pathSegments) || pathSegments.length === 0 || pathSegments.length > 5) {
    return null;
  }
  if (!ALLOWED_PATH_PREFIXES.has(pathSegments[0])) {
    return null;
  }
  for (const seg of pathSegments) {
    if (!seg || seg === "." || seg === ".." || !/^[a-zA-Z0-9._-]+$/.test(seg)) {
      return null;
    }
  }
  return pathSegments.join("/");
}

/**
 * Next.js API Proxy untuk WhatsApp Gateway (WAHA)
 * Membantu menjembatani request dari Vercel HTTPS ke endpoint WAHA
 * tanpa terhalang CORS atau Mixed Content di sisi browser.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams.path, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.valid) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }
  const resolvedParams = await params;
  return handleProxy(req, resolvedParams.path, "POST");
}

async function handleProxy(req: NextRequest, pathSegments: string[], method: "GET" | "POST") {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sesi tidak valid. Silakan masuk kembali." },
      { status: 401 }
    );
  }

  const role = await getUserRole(supabase, user.id);
  if (!ALLOWED_WAHA_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Peran Anda tidak diizinkan mengakses WhatsApp Gateway." },
      { status: 403 }
    );
  }

  const subPath = validateWahaPath(pathSegments);
  if (!subPath) {
    return NextResponse.json(
      { error: "Endpoint WhatsApp Gateway tidak valid." },
      { status: 400 }
    );
  }

  const requestedBase =
    req.headers.get("x-waha-target") || req.nextUrl.searchParams.get("targetUrl");
  const cleanBase = getAllowedWahaBaseUrl(requestedBase);

  if (!cleanBase) {
    return NextResponse.json(
      { error: "Target URL WhatsApp Gateway tidak diizinkan." },
      { status: 403 }
    );
  }

  const targetUrl = `${cleanBase}/api/${subPath}`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    const apiKey = req.headers.get("x-api-key") || process.env.WAHA_API_KEY;
    if (apiKey) headers["X-Api-Key"] = apiKey;

    let bodyData: string | undefined = undefined;
    if (method === "POST") {
      try {
        bodyData = await req.text();
        headers["Content-Type"] = "application/json";
      } catch {}
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const upstreamRes = await fetch(targetUrl, {
      method,
      headers,
      body: bodyData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await upstreamRes.text();
    return new NextResponse(data, {
      status: upstreamRes.status,
      headers: {
        "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        online: false,
        status: "OFFLINE",
        error: `Gagal menghubungi server gateway di ${cleanBase}: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
