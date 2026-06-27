import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await request.json();
    const { code, shop_id } = body;

    if (!code || !shop_id) {
      return NextResponse.json({ error: "Code et Boutique requis" }, { status: 400 });
    }

    // 1. Verify user belongs to this shop
    const { data: userShop } = await supabase
      .from("user_shops")
      .select("role")
      .eq("user_id", user.id)
      .eq("shop_id", shop_id)
      .single();

    if (!userShop || !["owner", "manager"].includes((userShop as any).role)) {
      return NextResponse.json({ error: "Vous n'avez pas les droits d'administration sur cette boutique." }, { status: 403 });
    }

    // 2. Fetch and check the code
    const { data: activationCode, error: fetchError } = await (supabase
      .from("activation_codes") as any)
      .select("*")
      .eq("code", code)
      .single();

    if (fetchError || !activationCode) {
      return NextResponse.json({ error: "Code invalide." }, { status: 404 });
    }

    if (activationCode.status !== "active") {
      return NextResponse.json({ error: "Ce code n'est plus actif." }, { status: 400 });
    }

    if (activationCode.remaining_activations <= 0) {
      return NextResponse.json({ error: "Ce code a atteint sa limite d'utilisation." }, { status: 400 });
    }

    if (activationCode.expires_at && new Date(activationCode.expires_at) < new Date()) {
      return NextResponse.json({ error: "Ce code est expiré." }, { status: 400 });
    }

    if (activationCode.shop_id && activationCode.shop_id !== shop_id) {
      return NextResponse.json({ error: "Ce code n'est pas valide pour cette boutique." }, { status: 400 });
    }

    // 3. Atomically decrement remaining activations
    const remaining = activationCode.remaining_activations - 1;
    const newStatus = remaining === 0 ? "exhausted" : "active";

    const { data: updatedCode, error: updateCodeError } = await (supabase
      .from("activation_codes") as any)
      .update({ 
        remaining_activations: remaining,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", activationCode.id)
      .eq("remaining_activations", activationCode.remaining_activations) // Optimistic concurrency control
      .select()
      .single();

    if (updateCodeError || !updatedCode) {
      return NextResponse.json({ error: "Le code vient d'être utilisé par quelqu'un d'autre. Veuillez réessayer." }, { status: 409 });
    }

    // 4. Update Subscription
    // We implement immediate replacement for simplicity in V1
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + activationCode.duration_months);

    const { error: subError } = await (supabase
      .from("subscriptions") as any)
      .update({
        plan: activationCode.plan,
        current_period_end: validUntil.toISOString(),
        status: "active",
        updated_at: new Date().toISOString()
      })
      .eq("shop_id", shop_id);

    if (subError) throw subError;

    // 5. Update Shop Plan (since shop has a plan column too)
    await (supabase
      .from("shops") as any)
      .update({ plan: activationCode.plan, updated_at: new Date().toISOString() })
      .eq("id", shop_id);

    // 6. Record History
    await (supabase
      .from("license_history") as any)
      .insert({
        code_id: activationCode.id,
        shop_id: shop_id,
        activated_by: user.id,
        plan_granted: activationCode.plan,
        duration_granted_months: activationCode.duration_months,
        valid_until: validUntil.toISOString()
      });

    return NextResponse.json({
      success: true,
      message: `Félicitations ! Votre forfait ${activationCode.plan.toUpperCase()} a été activé avec succès.`,
      newPlan: activationCode.plan,
      validUntil
    });

  } catch (error: any) {
    console.error("Activation Error:", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
