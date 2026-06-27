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

  // Vérification RBAC pour les routes protégées par rôle
  const protectedRoles = ROLE_PROTECTED_ROUTES[pathname];
  if (protectedRoles) {
    // Récupérer le rôle de l'utilisateur pour la boutique (simplifié)
    const { data: userShop } = await supabase
      .from("user_shops")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!userShop || !protectedRoles.includes((userShop as any).role)) {
      // Rediriger vers une page non autorisée
      return NextResponse.redirect(new URL("/unauthorized", request.url));
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
