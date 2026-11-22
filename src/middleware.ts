import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isMutatingMethod = ["POST", "PUT", "DELETE", "PATCH"].includes(
    request.method.toUpperCase()
  );

  // Proteksi CSRF: tolak permintaan mutasi lintas-origin pada rute API
  if (isApiRoute && isMutatingMethod) {
    const origin = request.headers.get("origin");
    if (origin) {
      const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const host = rawHost?.split(",")[0]?.trim();
      let originValid = false;
      try {
        originValid = Boolean(host && new URL(origin).host === host);
      } catch {
        originValid = false;
      }
      if (!originValid) {
        return NextResponse.json(
          {
            error: "Permintaan lintas-origin (CSRF) ditolak.",
            message: "Permintaan lintas-origin (CSRF) ditolak.",
          },
          { status: 403 }
        );
      }
    }
  }

  const isLoginApi = request.nextUrl.pathname === "/api/auth/login";
  if (isLoginApi) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isPublicBrandingGet =
    request.nextUrl.pathname === "/api/admin/branding" && request.method === "GET";

  // Cek status akun ditangguhkan (prioritaskan app_metadata)
  const isSuspended =
    user?.app_metadata?.status === "suspended" ||
    user?.user_metadata?.status === "suspended";

  if (user && isSuspended) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          error: "Akun Anda telah dinonaktifkan.",
          message: "Akun Anda telah dinonaktifkan.",
        },
        { status: 403 }
      );
    }
    if (!isLoginPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  if (!user && isApiRoute && !isPublicBrandingGet) {
    return NextResponse.json(
      {
        error: "Sesi tidak valid. Silakan masuk kembali.",
        message: "Sesi telah berakhir. Silakan masuk kembali.",
      },
      { status: 401 }
    );
  }

  if (!user && !isLoginPage && !isApiRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|templates/).*)"],
};
