"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Wifi, Zap, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const PLANS = [
  { id: "free", name: "Free", price: "0 FCFA" },
  { id: "starter", name: "Starter", price: "3 000 FCFA" },
  { id: "business", name: "Business", price: "7 000 FCFA" },
  { id: "pro", name: "Pro", price: "15 000 FCFA" },
  { id: "entreprise", name: "Enterprise", price: "Sur mesure" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    shopName: "",
    phone: "",
    region: "",
    city: "",
    sector: "",
  });
  const [selectedPlan, setSelectedPlan] = useState("free"); // Default plan to Free
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Vérification du mode hors-ligne
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("L'inscription d'une nouvelle boutique nécessite une connexion Internet.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setLoading(true);
    
    try {
      const supabase = createClient();
      
      // 1. Inscription Utilisateur (Supabase Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (authError) throw authError;

      // Si Supabase demande une confirmation d'email (pas de session immédiate)
      if (authData.user && !authData.session) {
        setSuccess(true);
        setLoading(false);
        return; 
      }

      // Si la session est active (confirmation email désactivée)
      if (authData.user && authData.session) {
        // 2. Création de la boutique dans la table `shops`
        const slug = (formData.shopName || "Ma Boutique")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const { data: shopData, error: shopError } = await (supabase
          .from("shops") as any)
          .insert({
            name: formData.shopName,
            slug: slug,
            owner_id: authData.user.id,
            plan: selectedPlan as any,
            country: "Cameroun",
            city: formData.city,
            phone: formData.phone,
            currency: "XAF",
            language: "fr",
            timezone: "Africa/Douala",
            is_active: true
          })
          .select()
          .single();

        if (shopError) {
          // Si le slug existe déjà (unique constraint), on prévient
          if (shopError.code === '23505') {
            throw new Error("Ce nom de boutique est déjà utilisé, veuillez en choisir un autre.");
          }
          throw shopError;
        }

        // 3. Mise à jour du store Zustand
        useAuthStore.getState().setUser(authData.user);
        if (shopData) {
          useAuthStore.getState().setShops([shopData as any]);
          useAuthStore.getState().setCurrentShop(shopData as any, "owner");
        }

        // On purge l'ancien cookie de session locale (POS)
        document.cookie = "novakam-local-session=; path=/; max-age=0";

        // On arrête le loader AVANT de changer de page pour éviter que le bouton tourne pendant la compilation Next.js
        setLoading(false);
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      
      // Gestion des erreurs spécifiques Supabase
      if (err.message && err.message.includes("Failed to fetch")) {
        setError("Erreur réseau : Impossible de joindre les serveurs sécurisés. Vérifiez votre connexion.");
      } else if (err.message && err.message.includes("User already registered")) {
        setError("Cette adresse email est déjà utilisée. Veuillez vous connecter.");
      } else {
        setError(err.message || "Une erreur est survenue lors de la création du compte.");
      }
      setLoading(false);
    }
  }

  const inputStyle = "w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors shadow-sm";
  const labelStyle = "block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-[#0B1120] transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-3xl mb-5 shadow-lg">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Compte créé !
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            Vérifiez votre email pour confirmer votre compte, puis connectez-vous.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0B1120] font-sans">
      
      {/* ── LEFT PANEL (IMAGE) ───────────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden flex-col justify-between items-start p-12">
        <Image
          src="/images/auth-hero.png"
          alt="NOVAKAM SaaS"
          fill
          className="object-cover opacity-60 mix-blend-screen scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-slate-900/50 to-slate-900"></div>
        
        <Link href="/" className="relative z-10 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <span className="font-black text-3xl tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>NOVAKAM</span>
        </Link>

        <div className="relative z-10 w-full max-w-lg mb-12">
          <blockquote className="text-2xl font-bold text-white mb-6 leading-relaxed">
            "Depuis que nous utilisons NOVAKAM, la gestion de nos 3 boutiques est devenue un jeu d'enfant. Plus aucune perte, même lors des coupures Internet."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white/20">
              MG
            </div>
            <div>
              <div className="text-white font-bold text-sm">Mama Georgette</div>
              <div className="text-blue-300 text-xs">Gérante de boutiques · Yaoundé</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (FORM) ───────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 h-screen overflow-y-auto">
        <div className="w-full max-w-[480px] animate-[page-in_0.4s_ease-out]">
          
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <span className="font-black text-2xl tracking-tight text-gray-900 dark:text-white">NOVAKAM</span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
            Créer votre compte
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Rejoignez des milliers de commerçants. Sans carte bancaire.
          </p>

          <div className="flex items-center gap-2 p-3 mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl text-xs font-medium text-blue-700 dark:text-blue-400">
            <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
            Connexion directe à la base de données Sécurisée (Production)
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Plan Selector */}
            <div className="mb-6">
              <label className={labelStyle}>1. Choisissez votre abonnement</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedPlan === plan.id
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-600"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300"
                    }`}
                  >
                    <div className={`font-bold text-sm ${selectedPlan === plan.id ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                      {plan.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{plan.price}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className={labelStyle}>2. Vos informations</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input type="text" required placeholder="Nom complet" value={formData.fullName} onChange={update("fullName")} className={inputStyle} />
                </div>
                <div>
                  <input type="email" required placeholder="Adresse email" value={formData.email} onChange={update("email")} className={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input type="text" required placeholder="Nom de la boutique" value={formData.shopName} onChange={update("shopName")} className={inputStyle} />
                </div>
                <div>
                  <input type="tel" required placeholder="Téléphone (+237...)" value={formData.phone} onChange={update("phone")} className={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <select required value={formData.region} onChange={update("region")} className={`${inputStyle} appearance-none bg-white`}>
                    <option value="" disabled>Région...</option>
                    <option value="Adamaoua">Adamaoua</option>
                    <option value="Centre">Centre</option>
                    <option value="Est">Est</option>
                    <option value="Extrême-Nord">Extrême-Nord</option>
                    <option value="Littoral">Littoral</option>
                    <option value="Nord">Nord</option>
                    <option value="Nord-Ouest">Nord-Ouest</option>
                    <option value="Ouest">Ouest</option>
                    <option value="Sud">Sud</option>
                    <option value="Sud-Ouest">Sud-Ouest</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <input type="text" required placeholder="Ville" value={formData.city} onChange={update("city")} className={inputStyle} />
                </div>
                <div className="col-span-1">
                  <select required value={formData.sector} onChange={update("sector")} className={`${inputStyle} appearance-none bg-white`}>
                    <option value="" disabled>Secteur...</option>
                    <option value="Alimentaire">Alimentaire</option>
                    <option value="Boutique générale">Boutique générale</option>
                    <option value="Pharmacie">Pharmacie</option>
                    <option value="Cosmétique">Cosmétique</option>
                    <option value="Électronique">Électronique</option>
                    <option value="Quincaillerie">Quincaillerie</option>
                    <option value="Mode">Mode</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder="Mot de passe" value={formData.password} onChange={update("password")} className={`${inputStyle} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div>
                  <input type={showPassword ? "text" : "password"} required placeholder="Confirmer mot de passe" value={formData.confirmPassword} onChange={update("confirmPassword")} className={inputStyle} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all mt-4 ${
                loading 
                  ? "bg-blue-400 cursor-not-allowed" 
                  : "bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 shadow-xl shadow-blue-900/20 hover:-translate-y-1"
              }`}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  Créer ma boutique <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="text-gray-900 dark:text-white font-bold hover:underline">
              Connectez-vous ici
            </Link>
          </p>

        </div>
      </div>
      <style>{`@keyframes page-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
