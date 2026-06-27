"use client";
import { useState, useEffect } from "react";
import { CreditCard, Key, Plus, Copy, CheckCircle2, Ban, PauseCircle, PlayCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

type Code = {
  id: string;
  code: string;
  plan: string;
  duration_months: number;
  max_activations: number;
  remaining_activations: number;
  status: "active" | "exhausted" | "suspended" | "revoked";
  created_at: string;
};

export default function AdminSubscriptionsPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newCodeData, setNewCodeData] = useState({
    plan: "pro",
    duration_months: 1,
    max_activations: 1
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  async function fetchCodes() {
    try {
      const res = await fetch("/api/admin/licenses");
      const data = await res.json();
      if (data.success) {
        setCodes(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function generateCode(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCodeData)
      });
      const data = await res.json();
      if (data.success) {
        setCodes([data.data, ...codes]);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/admin/licenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setCodes(codes.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
      }
    } catch (error) {
      console.error(error);
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="page-enter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "4px" }}>
            Abonnements & Licences
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Gérez les forfaits des boutiques et générez des codes d'activation.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        
        {/* Generate Form */}
        <div className="card" style={{ padding: "24px", height: "fit-content" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Key size={18} /> Nouvelle Licence
          </h2>
          <form onSubmit={generateCode} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            <div className="form-group">
              <label>Forfait (Plan)</label>
              <select 
                className="input" 
                value={newCodeData.plan}
                onChange={e => setNewCodeData({...newCodeData, plan: e.target.value})}
              >
                <option value="starter">Starter</option>
                <option value="business">Business</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="form-group">
              <label>Durée (Mois)</label>
              <input 
                type="number" 
                className="input" 
                min={1} max={60}
                value={newCodeData.duration_months}
                onChange={e => setNewCodeData({...newCodeData, duration_months: parseInt(e.target.value)})}
              />
            </div>

            <div className="form-group">
              <label>Nombre d'activations</label>
              <input 
                type="number" 
                className="input" 
                min={1} max={1000}
                value={newCodeData.max_activations}
                onChange={e => setNewCodeData({...newCodeData, max_activations: parseInt(e.target.value)})}
              />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                Permet de créer un code promo multi-usage.
              </span>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isGenerating} style={{ marginTop: "8px" }}>
              {isGenerating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              Générer le code
            </button>
          </form>
        </div>

        {/* List */}
        <div className="card" style={{ padding: "0" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700" }}>Codes Générés</h2>
          </div>
          
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}><Loader2 className="spin" /></div>
          ) : codes.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Aucun code n'a été généré pour le moment.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-muted)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "12px 24px" }}>Code</th>
                    <th style={{ padding: "12px 24px" }}>Plan</th>
                    <th style={{ padding: "12px 24px" }}>Activations</th>
                    <th style={{ padding: "12px 24px" }}>Statut</th>
                    <th style={{ padding: "12px 24px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "14px" }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontFamily: "monospace", letterSpacing: "1px" }}>
                          {c.code}
                          <button 
                            onClick={() => copyToClipboard(c.code, c.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: copiedId === c.id ? "#10b981" : "var(--text-muted)" }}
                          >
                            {copiedId === c.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", textTransform: "capitalize", fontWeight: "600" }}>
                        {c.plan} ({c.duration_months} M)
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        {c.max_activations - c.remaining_activations} / {c.max_activations}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ 
                          padding: "4px 8px", 
                          borderRadius: "12px", 
                          fontSize: "12px", 
                          fontWeight: "600",
                          background: c.status === "active" ? "rgba(16,185,129,0.1)" : c.status === "exhausted" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                          color: c.status === "active" ? "#10b981" : c.status === "exhausted" ? "#f59e0b" : "#ef4444"
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        {c.status === "active" && (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button onClick={() => updateStatus(c.id, "suspended")} className="btn btn-outline" style={{ padding: "6px" }} title="Suspendre">
                              <PauseCircle size={16} />
                            </button>
                            <button onClick={() => updateStatus(c.id, "revoked")} className="btn btn-outline" style={{ padding: "6px", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }} title="Révoquer">
                              <Ban size={16} />
                            </button>
                          </div>
                        )}
                        {c.status === "suspended" && (
                          <button onClick={() => updateStatus(c.id, "active")} className="btn btn-outline" style={{ padding: "6px", color: "#10b981" }} title="Réactiver">
                            <PlayCircle size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
