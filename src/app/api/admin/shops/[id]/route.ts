import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shopId } = await params;
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
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "Le paramètre is_active est requis" }, { status: 400 });
    }

    // Mise à jour de la boutique
    const { data: updatedShop, error: updateError } = await (supabase
      .from("shops") as any)
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", shopId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: updatedShop,
      message: `Boutique ${is_active ? 'activée' : 'suspendue'} avec succès.`
    });

  } catch (error: any) {
    console.error("Super Admin Shop Update Error:", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
