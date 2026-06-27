import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: codeId } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (!(userData as any)?.is_superadmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!["active", "suspended", "revoked"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const { data: updatedCode, error } = await (supabase
      .from("activation_codes") as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", codeId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: updatedCode,
      message: `Code mis à jour au statut: ${status}`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
