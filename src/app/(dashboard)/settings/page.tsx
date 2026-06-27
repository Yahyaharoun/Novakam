"use client";

import { useState } from "react";
import { Store, User, CreditCard, Save, Palette, Globe } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useI18nStore, type Language } from "@/lib/store/i18n.store";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useSettingsStore } from "@/lib/store/settings.store";
import { ScanBarcode } from "lucide-react";

import { ShopsSettings } from "@/components/settings/shops-settings";
import { RegistersSettings } from "@/components/settings/registers-settings";

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const shop = useAuthStore(s => s.currentShop);
  const currentRole = useAuthStore(s => s.currentRole);
  const setCurrentShop = useAuthStore(s => s.setCurrentShop);

  const { t, language, setLanguage } = useI18nStore();
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  const [activeTab, setActiveTab] = useState<"general" | "shops" | "registers" | "billing">("general");

  const [shopName, setShopName] = useState(shop?.name || "");
  const [currency, setCurrency] = useState(shop?.currency || "XAF");
  const [isSaving, setIsSaving] = useState(false);

  const { posSettings, updatePosSettings } = useSettingsStore();

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id) return;
    
    setIsSaving(true);
    try {
      const supabase = createClient() as any;
      const { error } = await supabase
        .from("shops")
        .update({ name: shopName, currency: currency })
        .eq("id", shop.id);

      if (error) throw error;

      setCurrentShop({ ...shop, name: shopName, currency }, currentRole!);
      toast.success(t("settings.toast_success"));
    } catch (e) {
      toast.error(t("settings.toast_error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("novakam-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("novakam-theme", "light");
    }
  };

  const getPlanName = (plan: string | undefined) => {
    if (plan === "pro") return "Plan Pro";
    if (plan === "business") return "Plan Business";
    if (plan === "starter") return "Plan Starter";
    return "Plan Gratuit";
  };

  return (
    <div className="page-enter" style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            {t("settings.title")}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Gérez vos préférences, vos boutiques et vos caisses.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ 
        display: "flex", 
        gap: "10px", 
        marginBottom: "24px", 
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "1px"
      }}>
        <TabButton active={activeTab === "general"} onClick={() => setActiveTab("general")}>
          Général
        </TabButton>
        <TabButton active={activeTab === "shops"} onClick={() => setActiveTab("shops")}>
          Boutiques
        </TabButton>
        <TabButton active={activeTab === "registers"} onClick={() => setActiveTab("registers")}>
          Caisses (Terminaux)
        </TabButton>
        <TabButton active={activeTab === "billing"} onClick={() => setActiveTab("billing")}>
          Abonnement
        </TabButton>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {activeTab === "general" && (
          <>
            {/* APPEARANCE & LANGUAGE */}
            <section className="card" style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Palette size={20} color="var(--color-primary-500)" /> {t("settings.theme")} & {t("settings.language")}
              </h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={labelStyle}>{t("settings.language")}</label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button 
                      onClick={() => setLanguage("fr")}
                      className={`btn ${language === "fr" ? "btn-primary" : "btn-secondary"}`}
                      style={{ flex: 1 }}
                    >
                      🇫🇷 Français
                    </button>
                    <button 
                      onClick={() => setLanguage("en")}
                      className={`btn ${language === "en" ? "btn-primary" : "btn-secondary"}`}
                      style={{ flex: 1 }}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t("settings.theme")}</label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button 
                      onClick={() => handleThemeChange("light")}
                      className={`btn ${theme === "light" ? "btn-primary" : "btn-secondary"}`}
                      style={{ flex: 1 }}
                    >
                      ☀️ {t("settings.light")}
                    </button>
                    <button 
                      onClick={() => handleThemeChange("dark")}
                      className={`btn ${theme === "dark" ? "btn-primary" : "btn-secondary"}`}
                      style={{ flex: 1 }}
                    >
                      🌙 {t("settings.dark")}
                    </button>
                  </div>
                </div>
              </div>
            </section>
            
            {/* SHOP SETTINGS */}
            <section className="card" style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Store size={20} color="var(--color-primary-500)" /> {t("settings.shop_info")}
              </h2>
              
              <form onSubmit={handleSaveShop}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label style={labelStyle}>{t("settings.shop_name")}</label>
                    <input 
                      required type="text" className="input" 
                      value={shopName} onChange={e => setShopName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label style={labelStyle}>{t("settings.currency")}</label>
                    <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="XAF">Franc CFA (CEMAC) - FCFA</option>
                      <option value="XOF">Franc CFA (UEMOA) - FCFA</option>
                      <option value="EUR">Euro - €</option>
                      <option value="USD">Dollar US - $</option>
                    </select>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {t("settings.currency_desc")}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={isSaving || (shopName === shop?.name && currency === shop?.currency)} className="btn btn-primary">
                    {isSaving ? t("settings.saving") : <><Save size={16} /> {t("settings.save_changes")}</>}
                  </button>
                </div>
              </form>
            </section>

            {/* POS SETTINGS */}
            <section className="card" style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ScanBarcode size={20} color="var(--color-primary-500)" /> Paramètres de Vente (POS)
              </h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-muted)", padding: "16px", borderRadius: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "var(--text-primary)" }}>
                  <input 
                    type="checkbox" 
                    checked={posSettings?.enable_search ?? true}
                    onChange={(e) => updatePosSettings({ enable_search: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "var(--color-primary-600)" }}
                  />
                  Activer la recherche par nom
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "var(--text-primary)" }}>
                  <input 
                    type="checkbox" 
                    checked={posSettings?.enable_barcode ?? true}
                    onChange={(e) => updatePosSettings({ enable_barcode: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "var(--color-primary-600)" }}
                  />
                  Autoriser le scan de Code-barres
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "var(--text-primary)" }}>
                  <input 
                    type="checkbox" 
                    checked={posSettings?.enable_qrcode ?? true}
                    onChange={(e) => updatePosSettings({ enable_qrcode: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "var(--color-primary-600)" }}
                  />
                  Autoriser le scan de QR Code interne
                </label>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "12px" }}>
                Désactivez les méthodes non utilisées pour simplifier l'interface de caisse.
              </p>
            </section>

            {/* USER PROFILE */}
            <section className="card" style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={20} color="var(--color-primary-500)" /> {t("settings.profile")}
              </h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="text" className="input" value={user?.email || ""} disabled style={{ background: "var(--bg-muted)" }} />
                </div>
                <div>
                  <label style={labelStyle}>{t("settings.role")}</label>
                  <input type="text" className="input" value={t("settings.role_admin")} disabled style={{ background: "var(--bg-muted)" }} />
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "12px" }}>
                {t("settings.profile_desc")}
              </p>
            </section>
          </>
        )}

        {activeTab === "shops" && <ShopsSettings />}
        {activeTab === "registers" && <RegistersSettings />}

        {activeTab === "billing" && (
          <section className="card" style={{ padding: "24px", border: "1px solid var(--border-color)" }}>
            {/* SUBSCRIPTION / BILLING */}
            <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CreditCard size={20} color="var(--text-secondary)" /> {t("settings.subscription")}
            </h2>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-muted)", padding: "16px", borderRadius: "8px" }}>
              <div>
                <p style={{ fontWeight: "700", fontSize: "16px", color: "var(--text-primary)" }}>{getPlanName(shop?.plan)}</p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {shop?.plan === "free" ? "Fonctionnalités de base" : "Toutes les fonctionnalités Premium activées"}
                </p>
              </div>
              <button className="btn btn-secondary" disabled={shop?.plan === "pro"}>
                {shop?.plan === "pro" ? "Plan Maximum" : t("settings.upgrade")}
              </button>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        fontSize: "14px",
        fontWeight: active ? "600" : "500",
        color: active ? "var(--color-primary-600)" : "var(--text-secondary)",
        borderBottom: active ? "2px solid var(--color-primary-600)" : "2px solid transparent",
        background: "transparent",
        cursor: "pointer",
        marginBottom: "-1px",
        transition: "all 0.2s"
      }}
    >
      {children}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "var(--text-secondary)",
  marginBottom: "5px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
