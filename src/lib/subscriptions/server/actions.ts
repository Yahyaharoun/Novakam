"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export interface ActivateCodeResult {
  success: boolean;
  message: string;
  newPlan?: string;
}

/**
 * Server Action: Activate an activation code for a shop.
 */
export async function activateCode(
  code: string,
  shopId: string
): Promise<ActivateCodeResult> {
  if (!code || !shopId) {
    return { success: false, message: "Code et identifiant boutique requis." };
  }

  const supabase = await getSupabase();

  // 1. Fetch the activation code
  const { data, error: fetchError } = await supabase
    .from("activation_codes" as any)
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("status", "ACTIVE")
    .single();

  const activation = data as any;

  if (fetchError || !activation) {
    return { success: false, message: "Code invalide ou déjà utilisé." };
  }

  // 2. Check expiry
  if (activation.expires_at && new Date(activation.expires_at) < new Date()) {
    return { success: false, message: "Ce code d'activation a expiré." };
  }

  // 3. Check max uses
  if (activation.max_uses && activation.current_uses >= activation.max_uses) {
    return { success: false, message: "Ce code a déjà atteint son nombre maximum d'utilisations." };
  }

  // 4. Get current subscription
  const { data: currentSub } = await supabase
    .from("subscriptions")
    .select("plan, current_period_end")
    .eq("shop_id", shopId)
    .single();

  const now = new Date();
  const validFrom = now;
  const validTo = new Date(now);
  validTo.setMonth(validTo.getMonth() + (activation.duration_months ?? 1));

  // 5. Update subscription
  const { error: updateError } = await (supabase.from("subscriptions") as any)
    .upsert({
      shop_id: shopId,
      plan: activation.plan,
      status: "active",
      current_period_start: validFrom.toISOString(),
      current_period_end: validTo.toISOString(),
      monthly_price: 0, // Paid via code
    }, { onConflict: "shop_id" });

  if (updateError) {
    console.error("Subscription update error:", updateError);
    return { success: false, message: "Erreur lors de l'activation. Réessayez." };
  }

  // 6. Update shop.plan
  await (supabase.from("shops") as any)
    .update({ plan: activation.plan })
    .eq("id", shopId);

  // 7. Log history
  await (supabase.from("subscription_history") as any)
    .insert({
      shop_id: shopId,
      plan: activation.plan,
      activation_code_id: activation.id,
      action: "activated",
      valid_from: validFrom.toISOString(),
      valid_to: validTo.toISOString(),
    });

  // 8. Increment code usage
  await (supabase.from("activation_codes") as any)
    .update({ current_uses: (activation.current_uses ?? 0) + 1 })
    .eq("id", activation.id);

  // Mark as EXPIRED if max uses reached
  if (activation.max_uses && (activation.current_uses + 1) >= activation.max_uses) {
    await (supabase.from("activation_codes") as any)
      .update({ status: "EXPIRED" })
      .eq("id", activation.id);
  }

  return {
    success: true,
    message: `Plan ${activation.plan.toUpperCase()} activé avec succès jusqu'au ${validTo.toLocaleDateString("fr-FR")} !`,
    newPlan: activation.plan,
  };
}

/**
 * Server Action: Get current subscription for a shop.
 */
export async function getSubscription(shopId: string) {
  const supabase = await getSupabase();

  const { data } = await supabase
    .from("subscriptions")
    .select("*, shops(name, plan)")
    .eq("shop_id", shopId)
    .single();

  return data;
}

/**
 * Server Action: Get subscription history for a shop.
 */
export async function getSubscriptionHistory(shopId: string) {
  const supabase = await getSupabase();

  const { data } = await (supabase.from("subscription_history") as any)
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(10);

  return data ?? [];
}
