"use client";
import { useState } from "react";
import { ArrowLeft, Plus, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCategories } from "@/lib/hooks/use-categories";
import toast from "react-hot-toast";

export default function CategoriesPage() {
  const router = useRouter();
  const { categories, isLoading, createCategory, updateCategory } = useCategories();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");

  const handleOpenNew = () => {
    setEditingId(null);
    setName("");
    setColor("#3B82F6");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color || "#3B82F6");
    setIsModalOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archiver cette catégorie ? Les produits associés n'auront plus de catégorie visible.")) return;
    try {
      await updateCategory(id, { is_active: false });
      toast.success("Catégorie archivée");
    } catch {
      toast.error("Erreur d'archivage");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingId) {
        await updateCategory(editingId, { name, color });
        toast.success("Catégorie modifiée");
      } else {
        await createCategory({ name, color });
        toast.success("Catégorie créée");
      }
      setIsModalOpen(false);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: "760px", margin: "0 auto", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Gestion des Catégories
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Créez des catégories pour classer vos produits.
          </p>
        </div>
        <button onClick={handleOpenNew} className="btn btn-primary btn-sm">
          <Plus size={16} /> Nouvelle Catégorie
        </button>
      </div>

      <div className="card" style={{ padding: "16px" }}>
        {isLoading ? (
          <p style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>Chargement...</p>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            <p>Aucune catégorie pour le moment.</p>
            <button onClick={handleOpenNew} className="btn btn-primary" style={{ marginTop: "12px" }}>
              Créer votre première catégorie
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {categories.map((cat) => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-surface)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: cat.color }} />
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{cat.name}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleOpenEdit(cat)} className="btn btn-ghost btn-sm">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleArchive(cat.id)} className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "24px", animation: "page-in 0.2s" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>
              {editingId ? "Modifier la catégorie" : "Nouvelle Catégorie"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>Nom</label>
                <input 
                  type="text" 
                  className="input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ex: Électronique, Alimentation..." 
                  autoFocus 
                  required 
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>Couleur (Optionnel)</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)} 
                    style={{ width: "40px", height: "40px", padding: 0, border: "none", borderRadius: "8px", cursor: "pointer" }} 
                  />
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "monospace" }}>{color}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
