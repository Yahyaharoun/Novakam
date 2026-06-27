// src/app/api/subscriptions/limits/route.ts
// API Route — Vérification des limites d'abonnement côté serveur

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, Plan } from "@/lib/supabase/database.types";
import { PLAN_LIMITS, getLimitBlockMessage } from "@/lib/rbac/subscription-limits";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shop_id");
  const resource = searchParams.get("resource");

  if (!shopId || !resource) {
    return NextResponse.json(
      { error: "shop_id and resource are required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Vérifier la session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier que l'utilisateur appartient à la boutique
  const { data: userShop } = await supabase
    .from("user_shops")
    .select("role")
    .eq("user_id", session.user.id)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .maybeSingle();

  if (!userShop) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Récupérer le plan de la boutique
  const { data: shop } = await supabase
    .from("shops")
    .select("plan")
    .eq("id", shopId)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  const plan = (shop as any).plan as Plan;
  const limits = PLAN_LIMITS[plan];

  // Compter la ressource actuelle
  let currentCount = 0;
  let maxAllowed = 0;

  switch (resource) {
    case "employees": {
      const { count } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("status", "active");
      currentCount = count ?? 0;
      maxAllowed = limits.max_employees;
      break;
    }
    case "registers": {
      const { count } = await supabase
        .from("registers")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("status", "active");
      currentCount = count ?? 0;
      maxAllowed = limits.max_registers_per_shop;
      break;
    }
    case "warehouses": {
      const { count } = await supabase
        .from("warehouses")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("status", "active");
      currentCount = count ?? 0;
      maxAllowed = limits.max_warehouses_per_shop;
      break;
    }
    case "products": {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("is_active", true);
      currentCount = count ?? 0;
      maxAllowed = limits.max_products;
      break;
    }
    case "shops": {
      const { count } = await supabase
        .from("user_shops")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("role", "owner");
      currentCount = count ?? 0;
      maxAllowed = limits.max_shops;
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
  }

  const allowed = maxAllowed === -1 || currentCount < maxAllowed;

  return NextResponse.json({
    allowed,
    current_count: currentCount,
    max_allowed: maxAllowed,
    plan,
    message: !allowed
      ? getLimitBlockMessage(resource, plan)
      : null,
  });
}
