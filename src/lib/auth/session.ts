import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, UserRole, Plan } from "@/lib/supabase/database.types";
import { useAuthStore } from "@/lib/store/auth.store";

type Shop = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  language: string;
  logo_url: string | null;
  plan: Plan;
};

type ShopRecord = Partial<Shop> & { id?: string; name?: string };
type RoleRecord = { name?: string };
type MembershipRow = {
  shops?: ShopRecord | ShopRecord[] | null;
  roles?: RoleRecord | RoleRecord[] | null;
};
type QueryResult = { data: MembershipRow[] | null; error: { message: string } | null };

function normalizeShop(raw: ShopRecord): Shop {
  const name = raw.name ?? "Boutique";

  return {
    id: raw.id ?? "",
    name,
    slug: raw.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    currency: raw.currency ?? "XAF",
    language: raw.language ?? "fr",
    logo_url: raw.logo_url ?? null,
    plan: (raw.plan ?? "free") as Plan,
  };
}

function normalizeRole(raw: MembershipRow): UserRole {
  const roleRecord = Array.isArray(raw.roles) ? raw.roles[0] : raw.roles;
  const role = roleRecord?.name ?? "owner";
  const allowed: UserRole[] = ["owner", "manager", "cashier", "warehouse", "accountant", "support"];
  return allowed.includes(role as UserRole) ? (role as UserRole) : "cashier";
}

export async function loadUserContext(supabase: SupabaseClient<Database>, user: User) {
  useAuthStore.getState().setLoading(true);

  // Fetch user from public schema to get is_superadmin
  const { data: userData } = await supabase
    .from("users")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = !!(userData as any)?.is_superadmin;

  const query = supabase
    .from("user_shops")
    .select("shop_id, roles(name), shops(*)")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1) as unknown as Promise<QueryResult>;
  const { data, error } = await query;

  if (error && !isSuperAdmin) {
    useAuthStore.getState().setAuthContext(user, null, null, [], null, false);
    useAuthStore.getState().setLoading(false);
    return;
  }

  const first = data?.[0];
  const rawShop = Array.isArray(first?.shops) ? first.shops[0] : first?.shops;
  const shop = rawShop?.id ? normalizeShop(rawShop) : null;
  const role = first ? normalizeRole(first) : null;

  useAuthStore.getState().setAuthContext(user, shop, role, shop ? [shop] : [], null, isSuperAdmin);
  useAuthStore.getState().setLoading(false);
}

export function safeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value === "/dashboard" ? "/" : value;
}
