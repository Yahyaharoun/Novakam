"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Wifi, Zap, Store } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import type { User } from "@supabase/supabase-js";

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  /** LOCAL BYPASS — injects mock user into Zustand store without Supabase */
  async function handleLocalBypass() {
    setLoading(true);
    setError(null);

    // Small delay to simulate account creation
    await new Promise((r) => setTimeout(r, 700));

    const mockUser = {
      id: "mock-user-001",
      email: formData.email || "demo@novakam.app",
      app_metadata: {},
      user_metadata: {
        full_name: formData.fullName || "Demo User",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as unknown as User;

    useAuthStore.getState().setUser(mockUser);
    
    // Create Shop
    const mockShop = {
      id: "mock-shop-" + Date.now(),
      name: formData.shopName || "Ma Boutique",
      slug: (formData.shopName || "Ma Boutique")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      currency: "XAF",
      language: "fr",
      logo_url: null,
      plan: "free",
      country: "Cameroun",
      region: formData.region,
    };
    useAuthStore.getState().setCurrentShop(mockShop as any, "owner");

    // Set cookie for proxy.ts
    document.cookie = "novakam-local-session=true; path=/; max-age=86400";
    if (typeof window !== "undefined") {
      localStorage.setItem("novakam-mock-shopName", mockShop.name);
    }

    router.push("/dashboard");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    // In local/offline mode, always use the bypass
    await handleLocalBypass();
  }

  const inputStyle = "w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors";
  const labelStyle = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 shadow-xl text-center">
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="w-full max-w-[460px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl relative z-10 animate-[page-in_0.3s_ease]">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group mb-6">
            <span className="font-black text-2xl tracking-tight text-blue-700 dark:text-blue-500" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>NOVAKAM</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
            Créer votre compte
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Commencez à gérer votre boutique gratuitement
          </p>
        </div>

        {/* Local Bypass Banner */}
        <div className="flex items-center gap-2 p-3 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl text-xs text-blue-600 dark:text-blue-400">
          <Zap size={14} className="flex-shrink-0" />
          <span>Mode Local actif — inscription instantanée sans serveur</span>
        </div>

          {/* Form */}
        <form onSubmit={handleRegister}>
          {error && (
            <div className="p-3 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Full name */}
            <div>
              <label htmlFor="fullName" className={labelStyle}>Nom complet *</label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="Ex: Jean Dupont"
                value={formData.fullName}
                onChange={update("fullName")}
                className={inputStyle}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className={labelStyle}>Adresse email *</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                placeholder="vous@example.com"
                value={formData.email}
                onChange={update("email")}
                className={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Shop Name */}
            <div>
              <label htmlFor="shopName" className={labelStyle}>Nom de la boutique *</label>
              <input
                id="shopName"
                type="text"
                required
                placeholder="Ex: Superette du Carrefour"
                value={formData.shopName || ""}
                onChange={update("shopName")}
                className={inputStyle}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelStyle}>Téléphone principal *</label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="+237 6XX XX XX XX"
                value={formData.phone || ""}
                onChange={update("phone")}
                className={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Region */}
            <div>
              <label htmlFor="region" className={labelStyle}>Région *</label>
              <select
                id="region"
                required
                value={formData.region || ""}
                onChange={update("region")}
                className={`${inputStyle} appearance-none`}
              >
                <option value="" disabled>Choisir une région...</option>
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

            {/* City */}
            <div>
              <label htmlFor="city" className={labelStyle}>Ville *</label>
              <input
                id="city"
                type="text"
                required
                placeholder="Ex: Douala"
                value={formData.city || ""}
                onChange={update("city")}
                className={inputStyle}
              />
            </div>
          </div>

          <div className="mb-4">
            {/* Sector */}
            <div>
              <label htmlFor="sector" className={labelStyle}>Secteur d'activité *</label>
              <select
                id="sector"
                required
                value={formData.sector || ""}
                onChange={update("sector")}
                className={`${inputStyle} appearance-none`}
              >
                <option value="" disabled>Choisir un secteur...</option>
                <option value="Alimentaire">Alimentaire</option>
                <option value="Boutique générale">Boutique générale</option>
                <option value="Pharmacie">Pharmacie</option>
                <option value="Cosmétique">Cosmétique</option>
                <option value="Électronique">Électronique</option>
                <option value="Téléphones & Accessoires">Téléphones & Accessoires</option>
                <option value="Quincaillerie">Quincaillerie</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Mode & Vêtements">Mode & Vêtements</option>
                <option value="Services">Services</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="reg-password" className={labelStyle}>Mot de passe *</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={update("password")}
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
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelStyle}>Confirmer *</label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={update("confirmPassword")}
                className={inputStyle}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            id="register-btn"
            className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              loading 
                ? "bg-blue-400 cursor-not-allowed" 
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Création...
              </>
            ) : (
              "Créer mon compte et ma boutique"
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6 text-sm text-gray-400 dark:text-gray-500">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          ou
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            Se connecter
          </Link>
        </p>

        <div className="mt-6 p-3 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl text-xs text-blue-600 dark:text-blue-400">
          <Wifi size={14} className="flex-shrink-0" />
          <span>Fonctionne hors ligne — Synchronisation automatique</span>
        </div>
      </div>
      <style>{`@keyframes page-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
