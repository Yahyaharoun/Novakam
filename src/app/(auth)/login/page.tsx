"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Wifi, Zap, Store, MonitorSmartphone, KeySquare, ChevronRight, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-container" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // POS Login State
  const [loginMode, setLoginMode] = useState<"admin" | "pos">("admin");
  const [registerCode, setRegisterCode] = useState("");
  const [registerPin, setRegisterPin] = useState("");
  const [pairedRegister, setPairedRegister] = useState<any>(null);
  const [selectedCashier, setSelectedCashier] = useState("");
  const [pin, setPin] = useState("");
  const [cashiersList, setCashiersList] = useState<any[]>([]);

  // On mount, check if there's a paired register in local storage
  // and load cashiers
  useEffect(() => {
    async function loadCashiers(reg: any) {
      let emps: any[] = [];
      try {
        if (reg?.shop_id && !reg.id?.startsWith('mock-')) {
            const supabase = createClient() as any;
            const { data } = await supabase.from('employees').select('*').eq('shop_id', reg.shop_id).eq('status', 'active');
            if (data) emps = data;
        }
      } catch (e) {
          // ignore
      }

      if (emps.length === 0 && typeof window !== "undefined") {
          const savedEmp = localStorage.getItem("novakam-mock-employees");
          if (savedEmp) {
            emps = JSON.parse(savedEmp).filter((e: any) => e.status === 'active');
          } else {
            emps = [
              { id: "c1", name: "Aïssatou Bah", role: "cashier" },
              { id: "c2", name: "Jean Dupont", role: "cashier" }
            ];
          }
      }

      setCashiersList(emps.filter((e: any) => e.role === "cashier" || e.role === "manager" || e.role === "admin"));
    }

    if (typeof window !== "undefined") {
      const savedReg = localStorage.getItem("novakam-paired-register");
      if (savedReg) {
        const parsedReg = JSON.parse(savedReg);
        setPairedRegister(parsedReg);
        setLoginMode("pos");
        loadCashiers(parsedReg);
      } else {
        loadCashiers(null);
      }
    }
  }, []);

  /** LOCAL BYPASS — injects mock user into Zustand store without Supabase */
  async function handleLocalBypass() {
    setLoading(true);
    setError(null);

    // Small delay to simulate network
    await new Promise((r) => setTimeout(r, 500));

    const userEmail = email.toLowerCase() || "pro@novakam.app";
    
    let simulatedPlan = "pro";
    if (userEmail.includes("free")) simulatedPlan = "free";
    else if (userEmail.includes("starter")) simulatedPlan = "starter";
    else if (userEmail.includes("business")) simulatedPlan = "business";

    const mockUser = {
      id: `mock-user-${simulatedPlan}`,
      email: userEmail,
      app_metadata: {},
      user_metadata: { full_name: `Demo ${simulatedPlan.toUpperCase()}` },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as unknown as User;

    const authStore = useAuthStore.getState();
    const existingShops = authStore.shops;
    let targetShop;

    let savedShopName = `Boutique ${simulatedPlan.toUpperCase()}`;
    if (typeof window !== "undefined") {
      savedShopName = localStorage.getItem("novakam-mock-shopName") || savedShopName;
    }
    
    targetShop = {
      id: `mock-shop-${simulatedPlan}`,
      name: savedShopName,
      slug: `boutique-${simulatedPlan}`,
      currency: "XAF",
      language: "fr",
      logo_url: null as null,
      plan: simulatedPlan as import("@/lib/supabase/database.types").Plan,
    };
    
    authStore.setShops([targetShop]);

    authStore.setUser(mockUser);
    authStore.setCurrentShop(targetShop as any, "owner");

    // Set cookie for proxy.ts
    document.cookie = "novakam-local-session=true; path=/; max-age=86400";

    router.push("/dashboard");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginMode === "admin") {
      await handleLocalBypass();
    }
  }

  async function handlePosPairing(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 500));

    let foundReg = null;

    try {
        const supabase = createClient() as any;
        const { data, error } = await supabase.from('registers').select('*').eq('code', registerCode).single();
        if (data) {
            foundReg = data;
        }
    } catch (e) {
        // Fallback to local storage if supabase fails or network is down
    }

    if (!foundReg && typeof window !== "undefined") {
      let registers = [];
      const saved = localStorage.getItem("novakam-mock-registers");
      if (saved) registers = JSON.parse(saved);
      else {
        registers = [
          { id: "1", name: "Caisse Principale (PC)", type: "desktop", status: "active", code: "REG-001", pin: "8888", assignedTo: "c1" },
          { id: "2", name: "Tablette Vendeur 1", type: "mobile", status: "offline", code: "REG-002", pin: "8888", assignedTo: null }
        ];
      }
      foundReg = registers.find((r: any) => r.code === registerCode);
    }

    if (foundReg) {
      if (foundReg.pin && foundReg.pin !== registerPin) {
        setError("Code PIN de la caisse incorrect.");
      } else {
        setPairedRegister(foundReg);
        if (typeof window !== "undefined") {
          localStorage.setItem("novakam-paired-register", JSON.stringify(foundReg));
        }
        
        // Load cashiers for the newly paired register
        let emps: any[] = [];
        try {
          if (foundReg.shop_id && !foundReg.id?.startsWith('mock-')) {
              const supabase = createClient() as any;
              const { data } = await supabase.from('employees').select('*').eq('shop_id', foundReg.shop_id).eq('status', 'active');
              if (data) emps = data;
          }
        } catch (e) {
            // ignore
        }
        if (emps.length === 0 && typeof window !== "undefined") {
            const savedEmp = localStorage.getItem("novakam-mock-employees");
            if (savedEmp) {
              emps = JSON.parse(savedEmp).filter((e: any) => e.status === 'active');
            } else {
              emps = [
                { id: "c1", name: "Aïssatou Bah", role: "cashier" },
                { id: "c2", name: "Jean Dupont", role: "cashier" }
              ];
            }
        }
        setCashiersList(emps.filter((e: any) => e.role === "cashier" || e.role === "manager" || e.role === "admin"));
        
        toast.success("Appareil associé avec succès !");
      }
    } else {
      setError("Code caisse introuvable. Format attendu: REG-XXX");
    }
    setLoading(false);
  }

  async function handlePosLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCashier || !pin) {
      setError("Veuillez sélectionner un compte et entrer votre code PIN.");
      return;
    }

    const cashier = cashiersList.find(c => c.id === selectedCashier);
    if (!cashier) {
      setError("Caissier introuvable.");
      return;
    }

    // Optional PIN check (fallback if not set yet on mock employee)
    if (cashier.pin && cashier.pin !== pin) {
      setError("Code PIN incorrect.");
      return;
    }

    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 500));

    // Create a mock session for the cashier
    const cashierName = cashiersList.find(c => c.id === selectedCashier)?.name || "Caissier Inconnu";
    const mockUser = {
      id: `mock-cashier-${selectedCashier}`,
      email: "cashier@novakam.app",
      app_metadata: {},
      user_metadata: { full_name: cashierName },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as unknown as User;

    const authStore = useAuthStore.getState();
    const existingShops = authStore.shops;
    let targetShop;

    if (existingShops.length > 0) {
      // Find the shop this register is associated with. 
      // For the mock, if registers don't have shopIds, we just use the first shop.
      targetShop = existingShops[0];
    } else {
      targetShop = {
        id: "mock-shop-pro",
        name: "Boutique Principale",
        slug: "boutique-principale",
        currency: "XAF",
        language: "fr",
        logo_url: null,
        plan: "pro",
      };
    }

    authStore.setUser(mockUser);
    authStore.setCurrentShop(targetShop as any, "cashier"); // Role cashier
    authStore.setCurrentRegister(pairedRegister, cashierName);

    document.cookie = "novakam-local-session=true; path=/; max-age=86400";
    toast.success(`Bienvenue ${cashierName} !`);
    router.push("/pos"); // Go directly to POS
  }

  const inputStyle = "w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors";
  const labelStyle = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-slate-900 transition-colors duration-300 relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Retour à l'accueil
      </Link>
      
      <div className="w-full max-w-[420px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl relative z-10 animate-[page-in_0.3s_ease]">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group mb-6">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <span className="font-black text-2xl tracking-tight text-blue-700 dark:text-blue-500" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>NOVAKAM</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
            Bienvenue
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connexion à votre espace
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: "flex", background: "var(--bg-muted)", borderRadius: "12px", padding: "4px", marginBottom: "24px" }}>
          <button 
            type="button"
            onClick={() => { setLoginMode("admin"); setError(null); }}
            style={{ 
              flex: 1, padding: "8px", fontSize: "13px", fontWeight: "600", borderRadius: "8px",
              background: loginMode === "admin" ? "var(--bg-surface)" : "transparent",
              color: loginMode === "admin" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: loginMode === "admin" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
              transition: "all 0.2s"
            }}
          >
            Administrateur
          </button>
          <button 
            type="button"
            onClick={() => { setLoginMode("pos"); setError(null); }}
            style={{ 
              flex: 1, padding: "8px", fontSize: "13px", fontWeight: "600", borderRadius: "8px",
              background: loginMode === "pos" ? "var(--bg-surface)" : "transparent",
              color: loginMode === "pos" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: loginMode === "pos" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
              transition: "all 0.2s"
            }}
          >
            Caissier (POS)
          </button>
        </div>

        {loginMode === "admin" && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl text-xs text-blue-600 dark:text-blue-400">
            <Zap size={14} className="flex-shrink-0" />
            <span>Mode Local actif — connexion instantanée sans serveur</span>
          </div>
        )}

        {/* Form */}
        {loginMode === "admin" ? (
          <form onSubmit={handleLogin}>
            {error && (
              <div className="p-3 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className={labelStyle}>
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@novakam.app"
                className={inputStyle}
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label htmlFor="password" className={labelStyle}>
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputStyle} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              id="login-btn"
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                loading 
                  ? "bg-blue-400 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>
        ) : (
          /* POS LOGIN MODE */
          <div>
            {!pairedRegister ? (
              <form onSubmit={handlePosPairing}>
                {error && (
                  <div className="p-3 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ width: "48px", height: "48px", background: "var(--color-primary-100)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "var(--color-primary-600)" }}>
                    <MonitorSmartphone size={24} />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>Associer l'appareil</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Entrez le code de la caisse pour lier cette tablette/ordinateur à la boutique.</p>
                </div>

                <div className="mb-6">
                  <label className={labelStyle}>Code de la caisse (ex: REG-001)</label>
                  <input
                    type="text"
                    value={registerCode}
                    onChange={(e) => setRegisterCode(e.target.value.toUpperCase())}
                    placeholder="REG-XXX"
                    className={inputStyle}
                    style={{ textAlign: "center", fontSize: "18px", letterSpacing: "2px", fontWeight: "700" }}
                  />
                </div>
                
                <div className="mb-6">
                  <label className={labelStyle}>Code PIN de la caisse</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={registerPin}
                    onChange={(e) => setRegisterPin(e.target.value)}
                    placeholder="••••"
                    className={inputStyle}
                    style={{ textAlign: "center", fontSize: "24px", letterSpacing: "8px", fontFamily: "monospace" }}
                  />
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px", textAlign: "center" }}>Pour la démo: 8888</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !registerCode || !registerPin}
                  className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm bg-gray-900 hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Associer"}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePosLogin}>
                {error && (
                  <div className="p-3 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-muted)", padding: "12px", borderRadius: "12px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <MonitorSmartphone size={16} color="var(--color-primary-600)" />
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>Appareil Associé</p>
                      <p style={{ fontSize: "14px", fontWeight: "600" }}>{pairedRegister.name}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setPairedRegister(null); if (typeof window !== "undefined") localStorage.removeItem("novakam-paired-register"); }} style={{ fontSize: "12px", color: "var(--text-secondary)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>Dissocier</button>
                </div>

                <div className="mb-4">
                  <label className={labelStyle}>Qui êtes-vous ?</label>
                  <select 
                    className={inputStyle}
                    value={selectedCashier}
                    onChange={(e) => setSelectedCashier(e.target.value)}
                  >
                    <option value="">Sélectionnez votre nom...</option>
                    {cashiersList.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className={labelStyle}>Code PIN</label>
                  <div className="relative">
                    <KeySquare size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      className={inputStyle}
                      style={{ paddingLeft: "36px", fontSize: "24px", letterSpacing: "8px", fontFamily: "monospace" }}
                    />
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px", textAlign: "center" }}>Tapez le PIN secret de cet employé (défini dans l'onglet Employés)</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedCashier || !pin}
                  className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    loading || !selectedCashier || !pin
                      ? "bg-blue-400 cursor-not-allowed" 
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
                  }`}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Ouvrir la Caisse"} <ChevronRight size={16} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 my-6 text-sm text-gray-400 dark:text-gray-500">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          ou
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            Créer un compte
          </Link>
        </p>

        {/* PWA note */}
        <div className="mt-6 p-3 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl text-xs text-blue-600 dark:text-blue-400">
          <Wifi size={14} className="flex-shrink-0" />
          <span>Fonctionne hors ligne — Vos données sont toujours disponibles</span>
        </div>

        {/* Discover landing link */}
        <div className="mt-5 text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <span>↗</span>
            <span className="border-b border-dashed border-gray-400">Retour au site</span>
          </Link>
        </div>
      </div>
      <style>{`@keyframes page-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
