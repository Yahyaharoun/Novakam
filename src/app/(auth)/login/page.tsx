"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, MonitorSmartphone, KeySquare, ChevronRight, Search, ShieldCheck, Users, Store, ArrowLeft, UserCircle2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <LoginForm />
    </Suspense>
  );
}

// ── TYPES ────────────────────────────────────────────────────────
type LoginStep = 
  | "role_selection" 
  | "admin_login" 
  | "search_shop" 
  | "select_register" 
  | "select_employee" 
  | "enter_pin";

function LoginForm() {
  const router = useRouter();
  
  // WIZARD STATE
  const [step, setStep] = useState<LoginStep>("role_selection");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ADMIN STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // POS / EMPLOYEE STATE
  const [searchQuery, setSearchQuery] = useState("");
  const [foundShop, setFoundShop] = useState<any>(null);
  const [registers, setRegisters] = useState<any[]>([]);
  const [selectedRegister, setSelectedRegister] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [pin, setPin] = useState("");

  // WIZARD NAVIGATION
  const goBack = () => {
    setError(null);
    if (step === "admin_login") setStep("role_selection");
    if (step === "search_shop") setStep("role_selection");
    if (step === "select_register") setStep("search_shop");
    if (step === "select_employee") setStep("select_register");
    if (step === "enter_pin") {
      setPin("");
      setStep("select_employee");
    }
  };

  /** =========================================================================
   *  ADMIN LOGIN LOGIC (Supabase)
   *  ========================================================================= */
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // 1. Authentification
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) throw new Error("Email ou mot de passe incorrect.");

      // 2. Récupérer la boutique de l'utilisateur
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', authData.user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (shopsError) throw shopsError;

      if (!shops || shops.length === 0) {
        throw new Error("Aucune boutique trouvée pour ce compte.");
      }

      const userShop = shops[0]; // On prend la première boutique pour l'instant

      // 3. Mettre à jour le Store Local
      const authStore = useAuthStore.getState();
      authStore.setUser(authData.user);
      authStore.setShops([userShop as any]);
      authStore.setCurrentShop(userShop as any, "owner");
      
      toast.success(`Bienvenue dans ${userShop.name} !`);
      router.push("/dashboard");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  }

  /** =========================================================================
   *  POS LOGIN LOGIC (Smart Flow)
   *  ========================================================================= */
  
  // 1. Search Shop
  async function handleSearchShop(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 800));

    // Mock DB Search
    const searchStr = searchQuery.toLowerCase();
    
    let shop = null;
    let foundRegisters: any[] = [];
    let foundEmployees: any[] = [];

    // Simulate found shop
    if (searchStr.includes("nova") || searchStr.includes("test")) {
      shop = { id: "mock-shop-pos", name: "NOVAKAM Store", plan: "pro" };
      foundRegisters = [
        { id: "reg-1", name: "Caisse Principale", status: "active" },
        { id: "reg-2", name: "Tablette Vendeur 1", status: "active" }
      ];
      foundEmployees = [
        { id: "emp-1", name: "Jean Caissier", role: "cashier", pin: "1234" },
        { id: "emp-2", name: "Marie Manager", role: "manager", pin: "5678" }
      ];
    }

    if (shop) {
      setFoundShop(shop);
      setRegisters(foundRegisters);
      setEmployees(foundEmployees);
      setStep("select_register");
    } else {
      setError("Boutique introuvable. Vérifiez l'orthographe du nom ou du lien exact.");
    }
    setLoading(false);
  }

  // 2. Select Register
  const handleSelectRegister = (reg: any) => {
    setSelectedRegister(reg);
    setStep("select_employee");
  };

  // 3. Select Employee
  const handleSelectEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    setStep("enter_pin");
  };

  // 4. Submit PIN
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 600));

    if (selectedEmployee.pin !== pin && pin !== "8888") {
      setError("Code PIN incorrect.");
      setPin("");
      setLoading(false);
      return;
    }

    // Success -> Login as Cashier
    const mockUser = {
      id: `mock-${selectedEmployee.id}`,
      email: `${selectedEmployee.id}@novakam.app`,
      app_metadata: {},
      user_metadata: { full_name: selectedEmployee.name },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as unknown as User;

    const authStore = useAuthStore.getState();
    const targetShop = { ...foundShop, currency: "XAF", language: "fr", slug: "novakam-store" };

    authStore.setShops([targetShop]);
    authStore.setUser(mockUser);
    authStore.setCurrentShop(targetShop as any, selectedEmployee.role);
    authStore.setCurrentRegister(selectedRegister, selectedEmployee.name);
    
    document.cookie = "novakam-local-session=true; path=/; max-age=86400";
    toast.success(`Bienvenue ${selectedEmployee.name} !`);
    router.push("/pos");
  };

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && step === "enter_pin" && !loading) {
      handlePinSubmit();
    }
  }, [pin]);

  // Numpad input handler
  const handleNumpad = (num: number | 'del') => {
    if (num === 'del') {
      setPin(prev => prev.slice(0, -1));
    } else {
      if (pin.length < 4) setPin(prev => prev + num);
    }
  };

  /** =========================================================================
   *  RENDER HELPERS
   *  ========================================================================= */
  const inputStyle = "w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors shadow-sm";
  const labelStyle = "block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0B1120] font-sans">
      
      {/* ── LEFT PANEL (IMAGE) ───────────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden flex-col justify-between items-start p-12">
        <Image src="/images/auth-hero.png" alt="NOVAKAM SaaS" fill className="object-cover opacity-60 mix-blend-screen scale-105" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-slate-900/50 to-slate-900"></div>
        
        <Link href="/" className="relative z-10 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <span className="font-black text-3xl tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>NOVAKAM</span>
        </Link>

        <div className="relative z-10 w-full max-w-lg mb-12">
          <blockquote className="text-2xl font-bold text-white mb-6 leading-relaxed">
            "Le mode Caisse est d'une fluidité incroyable. Nos vendeurs sélectionnent leur profil, tapent leur code à 4 chiffres et encaissent immédiatement."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white/20">
              AD
            </div>
            <div>
              <div className="text-white font-bold text-sm">Abdoulaye Diallo</div>
              <div className="text-blue-300 text-xs">Propriétaire de quincailleries · Douala</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (WIZARD) ───────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 h-screen overflow-y-auto">
        <div className="w-full max-w-[440px] animate-[page-in_0.3s_ease-out]">
          
          {/* Header Mobile / Back Button */}
          <div className="flex items-center justify-between mb-8">
            {step === "role_selection" ? (
              <div className="lg:hidden flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <span className="font-black text-2xl tracking-tight text-gray-900 dark:text-white">NOVAKAM</span>
              </div>
            ) : (
              <button onClick={goBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
                <ArrowLeft size={16} /> Retour
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-3 animate-pulse">
              <ShieldCheck size={20} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* =========================================================
              STEP 1: ROLE SELECTION
              ========================================================= */}
          {step === "role_selection" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Espace de connexion</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Sélectionnez votre environnement de travail pour continuer.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-8">
                {/* Admin Role */}
                <button 
                  onClick={() => setStep("admin_login")}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 border-transparent bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1"><ChevronRight size={20} className="text-blue-500" /></div>
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Administrateur / Gérant</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Accès complet à la gestion, tableaux de bord et paramètres de la boutique.</p>
                  </div>
                </button>

                {/* POS / Cashier Role */}
                <button 
                  onClick={() => setStep("search_shop")}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 border-transparent bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1"><ChevronRight size={20} className="text-emerald-500" /></div>
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MonitorSmartphone size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Caisse / Poste de Vente</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Connexion rapide par code PIN pour les caissiers et vendeurs sur le terrain.</p>
                  </div>
                </button>
              </div>

              <div className="pt-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pas encore de compte ? <Link href="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Créer une boutique</Link>
                </p>
              </div>
            </div>
          )}


          {/* =========================================================
              STEP 2A: ADMIN LOGIN
              ========================================================= */}
          {step === "admin_login" && (
            <div className="animate-[page-in_0.3s_ease-out]">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold mb-4">
                  <ShieldCheck size={14} /> Accès Propriétaire
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Bon retour !</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Identifiez-vous pour gérer votre entreprise.</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className={labelStyle}>Adresse email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pro@novakam.app"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="password" className={labelStyle}>Mot de passe</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputStyle} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="text-right mt-2">
                    <Link href="#" className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Mot de passe oublié ?</Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all mt-6 ${
                    loading ? "bg-blue-400 cursor-not-allowed" : "bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 shadow-xl shadow-blue-900/20 hover:-translate-y-1"
                  }`}
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Accéder au Dashboard"}
                </button>
              </form>
            </div>
          )}


          {/* =========================================================
              STEP 2B: SEARCH SHOP
              ========================================================= */}
          {step === "search_shop" && (
            <div className="animate-[page-in_0.3s_ease-out]">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold mb-4">
                  <Store size={14} /> Mode Caisse (POS)
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Rechercher votre boutique</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Entrez le nom de votre boutique pour trouver vos caisses.</p>
              </div>

              <form onSubmit={handleSearchShop} className="space-y-6">
                <div>
                  <label className={labelStyle}>Nom exact ou identifiant</label>
                  <div className="relative">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ex: NOVAKAM Store"
                      className={`${inputStyle} pl-12 text-lg font-medium`}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Astuce : Tapez "nova" ou "test" pour la démo.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !searchQuery}
                  className="w-full py-4 px-6 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <>Rechercher <ChevronRight size={18} /></>}
                </button>
              </form>
            </div>
          )}


          {/* =========================================================
              STEP 3B: SELECT REGISTER
              ========================================================= */}
          {step === "select_register" && (
            <div className="animate-[page-in_0.3s_ease-out]">
              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                  <Store size={32} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{foundShop?.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sélectionnez votre caisse ou point de vente.</p>
              </div>

              <div className="space-y-3">
                {registers.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => handleSelectRegister(reg)}
                    className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                        <MonitorSmartphone size={24} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-900 dark:text-white text-base">{reg.name}</div>
                        <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* =========================================================
              STEP 4B: SELECT EMPLOYEE
              ========================================================= */}
          {step === "select_employee" && (
            <div className="animate-[page-in_0.3s_ease-out]">
              <div className="mb-6 flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                <MonitorSmartphone size={24} className="text-emerald-500" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Caisse sélectionnée</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedRegister?.name}</p>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Qui êtes-vous ?</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sélectionnez votre profil utilisateur.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all gap-3 group"
                  >
                    <div className="w-14 h-14 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-all">
                      <UserCircle2 size={32} />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">{emp.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{emp.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* =========================================================
              STEP 5B: ENTER PIN (NUMPAD)
              ========================================================= */}
          {step === "enter_pin" && (
            <div className="animate-[page-in_0.3s_ease-out]">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4 shadow-inner">
                  <UserCircle2 size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEmployee?.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm capitalize">{selectedEmployee?.role} · {selectedRegister?.name}</p>
              </div>

              <div className="mb-8 flex justify-center gap-4">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-14 h-16 rounded-xl flex items-center justify-center text-3xl font-bold transition-all border-2
                      ${i < pin.length 
                        ? "bg-white dark:bg-slate-800 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/20 scale-105" 
                        : "bg-gray-100 dark:bg-slate-800/50 border-transparent text-transparent"
                      }`}
                  >
                    {i < pin.length ? "•" : ""}
                  </div>
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button 
                    key={num} 
                    onClick={() => handleNumpad(num)}
                    className="h-16 text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                  >
                    {num}
                  </button>
                ))}
                <div className="h-16"></div> {/* Empty slot */}
                <button 
                  onClick={() => handleNumpad(0)}
                  className="h-16 text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                >
                  0
                </button>
                <button 
                  onClick={() => handleNumpad('del')}
                  className="h-16 flex items-center justify-center text-gray-500 hover:text-red-500 bg-gray-100 dark:bg-slate-800/50 border border-transparent rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 4-18 16"/><path d="m3 4 18 16"/></svg>
                </button>
              </div>

              <div className="mt-8 text-center text-xs text-gray-500 font-medium">
                Saisissez votre code PIN à 4 chiffres (Test: 8888)
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes page-in { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
