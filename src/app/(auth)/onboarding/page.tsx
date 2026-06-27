"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Store, MapPin, Phone, Building, Upload, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    shopName: "",
    phone: "",
    region: "",
    city: "",
    sector: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { user, currentShop } = useAuthStore.getState();
    if (user && currentShop) {
      router.push("/dashboard");
    }
  }, [router]);

  const update = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError("Format non supporté. Veuillez utiliser PNG, JPG ou WEBP.");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function handleCreateShop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.shopName || formData.shopName.length < 3) {
      setError("Le nom de la boutique doit contenir au moins 3 caractères.");
      return;
    }
    const phoneRegex = /^\+?[0-9\s-]{8,20}$/;
    if (!formData.phone || !phoneRegex.test(formData.phone)) {
      setError("Veuillez entrer un numéro de téléphone valide.");
      return;
    }
    if (!formData.region) {
      setError("Veuillez sélectionner une région.");
      return;
    }
    if (!formData.city) {
      setError("Veuillez entrer une ville.");
      return;
    }
    if (!formData.sector) {
      setError("Veuillez sélectionner un secteur d'activité.");
      return;
    }

    setLoading(true);

    try {
      // Simulate network
      await new Promise((r) => setTimeout(r, 600));

      const mockShop = {
        id: "mock-shop-" + Date.now(),
        name: formData.shopName,
        slug: formData.shopName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        currency: "XAF",
        language: "fr",
        logo_url: logoPreview, // Enregistrement local via base64
        plan: "free",
        country: "Cameroun",
        region: formData.region,
        // Infos supplémentaires (Normalement en BDD)
        // phone: formData.phone,
        // city: formData.city,
        // sector: formData.sector,
      };

      // Set the shop in the local store and assign 'owner' role
      useAuthStore.getState().setCurrentShop(mockShop as any, "owner");

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Une erreur est survenue lors de la création de la boutique.");
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#94a3b8",
    marginBottom: "6px",
  };

  return (
    <div className="auth-container">
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      <div className="auth-card" style={{ animation: "page-in 0.3s ease", maxWidth: "500px", position: "relative", zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Link href="/" className="inline-flex items-center gap-2 group mb-2">
              <span className="font-black text-3xl tracking-tight text-blue-700 dark:text-blue-500" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>NOVAKAM</span>
            </Link>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px", letterSpacing: "-0.02em" }}>
            Créer votre boutique
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Configurez les détails de votre commerce pour commencer.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateShop}>
          {error && (
            <div
              style={{
                background: "rgb(239 68 68 / 0.15)",
                border: "1px solid rgb(239 68 68 / 0.3)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "20px",
                color: "#fca5a5",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Logo Upload */}
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={labelStyle}>Logo de la boutique (Optionnel)</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                }}
              >
                {logoPreview ? (
                  <div style={{ position: "relative", width: "64px", height: "64px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Image src={logoPreview} alt="Logo preview" fill style={{ objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={removeLogo}
                      style={{
                        position: "absolute", top: "2px", right: "2px", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", padding: "2px", cursor: "pointer", color: "white"
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div style={{ width: "64px", height: "64px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Store size={24} color="#64748b" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="logo-upload"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "rgba(255,255,255,0.1)", borderRadius: "6px", fontSize: "13px", color: "white", cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)", transition: "background 0.2s"
                    }}
                  >
                    <Upload size={14} />
                    Choisir une image
                  </label>
                  <p style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>PNG, JPG, WEBP acceptés.</p>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            </div>

            {/* Shop Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="shopName" style={labelStyle}>Nom de la boutique *</label>
              <div style={{ position: "relative" }}>
                <Store size={16} color="#64748b" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  id="shopName"
                  type="text"
                  required
                  placeholder="Ex: Superette du Carrefour"
                  value={formData.shopName}
                  onChange={update("shopName")}
                  style={{ ...inputStyle, paddingLeft: "40px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
              </div>
            </div>

            {/* Sector */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="sector" style={labelStyle}>Secteur d'activité *</label>
              <div style={{ position: "relative" }}>
                <Building size={16} color="#64748b" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <select
                  id="sector"
                  required
                  value={formData.sector}
                  onChange={update("sector")}
                  style={{ ...inputStyle, paddingLeft: "40px", appearance: "none" }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                >
                  <option value="" disabled style={{ color: "#000" }}>Choisir un secteur...</option>
                  <option value="Alimentaire" style={{ color: "#000" }}>Alimentaire</option>
                  <option value="Boutique générale" style={{ color: "#000" }}>Boutique générale</option>
                  <option value="Pharmacie" style={{ color: "#000" }}>Pharmacie</option>
                  <option value="Cosmétique" style={{ color: "#000" }}>Cosmétique</option>
                  <option value="Électronique" style={{ color: "#000" }}>Électronique</option>
                  <option value="Téléphones & Accessoires" style={{ color: "#000" }}>Téléphones & Accessoires</option>
                  <option value="Quincaillerie" style={{ color: "#000" }}>Quincaillerie</option>
                  <option value="Restaurant" style={{ color: "#000" }}>Restaurant</option>
                  <option value="Mode & Vêtements" style={{ color: "#000" }}>Mode & Vêtements</option>
                  <option value="Services" style={{ color: "#000" }}>Services</option>
                  <option value="Autre" style={{ color: "#000" }}>Autre</option>
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" style={labelStyle}>Téléphone principal *</label>
              <div style={{ position: "relative" }}>
                <Phone size={16} color="#64748b" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  id="phone"
                  type="tel"
                  required
                  placeholder="+237 6XX XX XX XX"
                  value={formData.phone}
                  onChange={update("phone")}
                  style={{ ...inputStyle, paddingLeft: "40px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
              </div>
            </div>

            {/* Region */}
            <div>
              <label htmlFor="region" style={labelStyle}>Région *</label>
              <div style={{ position: "relative" }}>
                <MapPin size={16} color="#64748b" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <select
                  id="region"
                  required
                  style={{ ...inputStyle, paddingLeft: "40px", appearance: "none" }}
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                >
                  <option value="" disabled style={{ color: "#000" }}>Choisir une région...</option>
                  <option value="Adamaoua" style={{ color: "#000" }}>Adamaoua</option>
                  <option value="Centre" style={{ color: "#000" }}>Centre</option>
                  <option value="Est" style={{ color: "#000" }}>Est</option>
                  <option value="Extrême-Nord" style={{ color: "#000" }}>Extrême-Nord</option>
                  <option value="Littoral" style={{ color: "#000" }}>Littoral</option>
                  <option value="Nord" style={{ color: "#000" }}>Nord</option>
                  <option value="Nord-Ouest" style={{ color: "#000" }}>Nord-Ouest</option>
                  <option value="Ouest" style={{ color: "#000" }}>Ouest</option>
                  <option value="Sud" style={{ color: "#000" }}>Sud</option>
                  <option value="Sud-Ouest" style={{ color: "#000" }}>Sud-Ouest</option>
                </select>
              </div>
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" style={labelStyle}>Ville *</label>
              <div style={{ position: "relative" }}>
                <MapPin size={16} color="#64748b" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  id="city"
                  type="text"
                  required
                  placeholder="Ex: Douala"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={{ ...inputStyle, paddingLeft: "40px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !formData.shopName}
            style={{
              width: "100%",
              marginTop: "24px",
              padding: "12px",
              background: loading || !formData.shopName
                ? "rgba(37,99,235,0.5)"
                : "linear-gradient(135deg, #2563eb, #3b82f6)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading || !formData.shopName ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
              boxShadow: loading || !formData.shopName ? "none" : "0 4px 14px rgb(37 99 235 / 0.4)",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Création en cours...
              </>
            ) : (
              "Créer ma boutique"
            )}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
