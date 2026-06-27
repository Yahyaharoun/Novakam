import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generateCode(plan: string, duration: number) {
  const prefix = `NK-${plan.toUpperCase().substring(0, 3)}-${duration}M`;
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${randomStr}`;
}

export async function GET(request: Request) {
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
    const { data: codes, error } = await (supabase
      .from("activation_codes") as any)
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    return NextResponse.json({ success: true, data: codes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const { plan, duration_months, max_activations, expires_at } = body;

    if (!plan || !duration_months || !max_activations) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const newCode = {
      code: generateCode(plan, duration_months),
      plan,
      duration_months,
      max_activations,
      remaining_activations: max_activations,
      expires_at: expires_at || null,
      created_by: user.id
    };

    const { data: code, error } = await (supabase
      .from("activation_codes") as any)
      .insert(newCode)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({ success: true, data: code });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
