// Proxy Next.js — Protection des routes + vérification session

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

// Routes publiques (pas besoin d'être authentifié)
const PUBLIC_ROUTES = ["/", "/contact", "/login", "/register", "/forgot-password", "/reset-password"];
const PUBLIC_PREFIXES = ["/api/public", "/_next", "/favicon", "/icons", "/sw.js", "/manifest"];

// Routes nécessitant un rôle spécifique
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  "/subscription": ["owner"],
  "/employees": ["owner", "admin"],
  "/registers": ["owner", "admin"],
  "/warehouses": ["owner", "admin"],
  "/settings": ["owner", "admin"],
  "/reports": ["owner", "admin", "manager", "accountant"],
  "/finance": ["owner", "admin", "accountant"],
  "/expenses": ["owner", "admin", "accountant"],
  "/treasury": ["owner", "admin", "accountant"],
};

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Routes nécessitant un plan spécifique
const PLAN_PROTECTED_ROUTES: Record<string, string[]> = {
  "/reports": ["starter", "business", "pro", "enterprise"],
  "/reports/advanced": ["business", "pro", "enterprise"],
  "/finance/credits": ["business", "pro", "enterprise"],
  "/finance/expenses": ["business", "pro", "enterprise"],
  "/finance/accounting": ["pro", "enterprise"],
  "/settings/api": ["pro", "enterprise"],
  "/settings/audit": ["pro", "enterprise"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les routes publiques
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Créer le client Supabase côté serveur
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Vérifier le bypass local
  if (request.cookies.has("novakam-local-session") && request.cookies.get("novakam-local-session")?.value === "true") {
    return response;
  }

  // Vérifier la session active
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si pas de session → redirection vers /login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Vérification RBAC et PLan pour les routes protégées
  const protectedRoles = ROLE_PROTECTED_ROUTES[pathname] || null;
  const protectedPlans = PLAN_PROTECTED_ROUTES[pathname] || null;

  if (protectedRoles || protectedPlans) {
    // Récupérer le rôle de l'utilisateur ET le plan de la boutique
    const { data: userShops } = await supabase
      .from("user_shops")
      .select("role, shops(plan)")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .limit(1);

    const userShop = userShops && userShops.length > 0 ? userShops[0] : null;

    if (!userShop) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    const role = (userShop as any).role;
    const plan = (userShop as any).shops?.plan || "free";

    // Vérification Rôle
    if (protectedRoles && !protectedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Vérification Plan
    if (protectedPlans && !protectedPlans.includes(plan)) {
      return NextResponse.redirect(new URL("/unauthorized?reason=plan", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match toutes les requêtes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
