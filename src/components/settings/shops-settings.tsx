"use client";

import { useState } from "react";
import { Store, Plus, Search, MapPin, CheckCircle2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function ShopsSettings() {
  const router = useRouter();
  const currentShop = useAuthStore(s => s.currentShop);
  const currentRole = useAuthStore(s => s.currentRole);
  const authShops = useAuthStore(s => s.shops);
  const setShops = useAuthStore(s => s.setShops);
  const setCurrentShop = useAuthStore(s => s.setCurrentShop);
  const user = useAuthStore(s => s.user);

  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopCity, setNewShopCity] = useState("");

  const localShops = authShops.length > 0 ? authShops : (currentShop ? [currentShop] : []);

  // In a real app, we would add the shop to Supabase here
  const handleAddShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName) return;

    if (currentShop?.plan === "free" || currentShop?.plan === "starter") {
      toast.error("Votre plan actuel ne permet pas de créer de boutiques supplémentaires. Veuillez passer au plan Business.");
      return;
    }

    const newShopList = [...localShops, {
      id: Date.now().toString(),
      name: newShopName,
      slug: newShopName.toLowerCase().replace(/\s+/g, '-'),
      currency: currentShop?.currency || "XAF",
      language: "fr",
      logo_url: null,
      plan: (currentShop?.plan || "free") as any
    }];
    
    // Save to global persisted store
    setShops(newShopList);

    toast.success(`La boutique "${newShopName}" a été créée avec succès !`);
    setShowAddForm(false);
    setNewShopName("");
    setNewShopCity("");
  };

  const handleSwitchShop = (shopToSwitch: any) => {
    setCurrentShop(shopToSwitch, currentRole!);
    toast.success(`Connexion à ${shopToSwitch.name} réussie !`);
    router.push("/dashboard");
  };

  const filteredShops = localShops;

  return (
    <section className="card" style={{ padding: "24px", animation: "page-in 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          <Store size={20} color="var(--color-primary-500)" /> Mes Boutiques (Magasins)
        </h2>
        {currentRole === 'owner' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary" 
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Plus size={16} /> Ajouter une boutique
          </button>
        )}
      </div>

      {(currentShop?.plan === "free" || currentShop?.plan === "starter") && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#fef3c7", color: "#b45309", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px" }}>
          <ShieldAlert size={16} />
          <span>Votre abonnement ({currentShop?.plan.toUpperCase()}) est limité à 1 seule boutique. <a href="#" style={{textDecoration: "underline", fontWeight: "600"}}>Passez au plan Business</a> pour gérer plusieurs magasins.</span>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddShop} style={{ background: "var(--bg-muted)", padding: "16px", borderRadius: "12px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Nouvelle succursale</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>Nom de la boutique *</label>
              <input required type="text" className="input" placeholder="Ex: Novakam Akwa" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>Ville / Quartier</label>
              <input type="text" className="input" placeholder="Ex: Douala" value={newShopCity} onChange={e => setNewShopCity(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary">Créer</button>
          </div>
        </form>
      )}

      <div style={{ position: "relative", marginBottom: "20px" }}>
        <Search size={16} style={{ position: "absolute", left: "12px", top: "11px", color: "var(--text-muted)" }} />
        <input 
          type="text" 
          placeholder="Rechercher une boutique..." 
          className="input" 
          style={{ paddingLeft: "36px" }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredShops.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "40px", height: "40px", background: "var(--color-primary-100)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary-600)" }}>
                <Store size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: "600", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                  {s.name}
                  {s.id === currentShop?.id && (
                    <span style={{ fontSize: "10px", background: "var(--color-primary-100)", color: "var(--color-primary-700)", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>Active</span>
                  )}
                </h4>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                  <MapPin size={12} /> Principal • {s.currency}
                </p>
              </div>
            </div>
            
            <div>
              {s.id !== currentShop?.id ? (
                <button className="btn btn-secondary btn-sm" onClick={() => handleSwitchShop(s)}>Se connecter</button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-primary-600)", fontSize: "13px", fontWeight: "600" }}>
                  <CheckCircle2 size={16} /> Connecté
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
