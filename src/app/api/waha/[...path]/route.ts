import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Next.js API Proxy untuk WhatsApp Gateway (WAHA)
 * Membantu menjembatani request dari Vercel HTTPS ke endpoint WAHA
 * tanpa terhalang CORS atau Mixed Content di sisi browser.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(req, params.path, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(req, params.path, "POST");
}

async function handleProxy(req: NextRequest, pathSegments: string[], method: "GET" | "POST") {
  const targetBaseUrl =
    req.headers.get("x-waha-target") ||
    req.nextUrl.searchParams.get("targetUrl") ||
    process.env.WAHA_BASE_URL ||
    "http://localhost:3008";

  const cleanBase = targetBaseUrl.replace(/\/+$/, "");
  const subPath = pathSegments.join("/");
  const targetUrl = `${cleanBase}/api/${subPath}`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    const apiKey = req.headers.get("x-api-key");
    if (apiKey) headers["X-Api-Key"] = apiKey;

    let bodyData: any = undefined;
    if (method === "POST") {
      try {
        bodyData = await req.text();
        headers["Content-Type"] = "application/json";
      } catch (e) {}
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
        error: `Gagal menghubungi server gateway di ${targetUrl}: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
