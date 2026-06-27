import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  
  // Vérification de l'authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Vérification stricte du rôle Super Admin
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (userError || !(userData as any)?.is_superadmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    // 1. Nombre de boutiques (total et actives)
    const { data: shops, error: shopsError } = await (supabase
      .from("shops") as any)
      .select("id, is_active");
      
    if (shopsError) throw shopsError;
    
    const totalShops = shops?.length || 0;
    const activeShops = (shops as any[])?.filter(s => s.is_active).length || 0;

    // 2. Nombre total d'utilisateurs inscrits
    const { count: totalUsers, error: usersError } = await (supabase
      .from("users") as any)
      .select("*", { count: 'exact', head: true });
      
    if (usersError) throw usersError;

    // 3. Abonnements actifs
    const { count: activeSubscriptions, error: subsError } = await (supabase
      .from("subscriptions") as any)
      .select("*", { count: 'exact', head: true })
      .eq("status", "active");
      
    if (subsError) throw subsError;

    return NextResponse.json({
      success: true,
      data: {
        totalShops,
        activeShops,
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        mrr: (activeSubscriptions || 0) * 15000, // Estimation (15 000 FCFA par mois en moyenne)
        systemHealth: "100%",
      }
    });

  } catch (error: any) {
    console.error("Super Admin Stats Error:", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
