"use client";

import { useState } from "react";
import { MonitorSmartphone, Plus, Search, CheckCircle2, QrCode, Monitor, X, User, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";
import { useRegisters } from "@/lib/hooks/use-registers";
import { useEmployees } from "@/lib/hooks/use-employees";

export function RegistersSettings() {
  const currentShop = useAuthStore(s => s.currentShop);
  const currentRole = useAuthStore(s => s.currentRole);

  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRegisterName, setNewRegisterName] = useState("");
  const [newRegisterPin, setNewRegisterPin] = useState("");
  const [selectedRegisterCode, setSelectedRegisterCode] = useState<string | null>(null);

  const { registers, isLoading, createRegister, updateRegister } = useRegisters(search);
  const { employees } = useEmployees();

  const cashiers = employees.filter(e => e.status === 'active' && (e.role === "cashier" || e.role === "warehouse"));

  const handleAddRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegisterName || !newRegisterPin) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (currentShop?.plan === "free" || currentShop?.plan === "starter") {
      toast.error("Pour avoir plusieurs caisses en simultané, veuillez passer au plan Business ou Pro.");
      return;
    }

    const newCode = `REG-00${registers.length + 1}`;
    try {
      await createRegister({ name: newRegisterName, code: newCode });
      toast.success(`La caisse "${newRegisterName}" a été ajoutée. Le code de connexion est ${newCode}.`);
      setShowAddForm(false);
      setNewRegisterName("");
      setNewRegisterPin("");
    } catch {
      toast.error("Erreur lors de la création de la caisse.");
    }
  };

  const handleAssignCashier = async (registerId: string, cashierId: string) => {
    try {
      await updateRegister(registerId, { assigned_employee_id: cashierId || undefined });
      toast.success("Assignation mise à jour !");
    } catch {
      toast.error("Erreur lors de l'assignation.");
    }
  };

  // Generate pairing data for the QR code
  const getPairingData = () => {
    if (!selectedRegisterCode || !currentShop) return "";
    return JSON.stringify({
      action: "pair_register",
      shop_id: currentShop.id,
      register_code: selectedRegisterCode
    });
  };

  return (
    <>
      <section className="card" style={{ padding: "24px", animation: "page-in 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            <MonitorSmartphone size={20} color="var(--color-primary-500)" /> Mes Caisses (Terminaux)
          </h2>
          {(currentRole === 'owner' || currentRole === 'manager') && (
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary" 
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Plus size={16} /> Nouvelle Caisse
            </button>
          )}
        </div>

        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
          Une caisse représente un appareil physique (ordinateur, tablette, téléphone) utilisé pour encaisser les clients dans la boutique actuelle.
        </p>

        {showAddForm && (
          <form onSubmit={handleAddRegister} style={{ background: "var(--bg-muted)", padding: "16px", borderRadius: "12px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Nouveau Terminal</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>Nom du terminal *</label>
                <input required type="text" className="input" placeholder="Ex: Caisse Comptoir 2" value={newRegisterName} onChange={e => setNewRegisterName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>Code PIN de la caisse (ex: 8888) *</label>
                <input required type="password" inputMode="numeric" maxLength={4} className="input" placeholder="••••" value={newRegisterPin} onChange={e => setNewRegisterPin(e.target.value)} style={{ fontFamily: "monospace", letterSpacing: "2px" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Créer le code d'accès</button>
            </div>
          </form>
        )}

        <div style={{ position: "relative", marginBottom: "20px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "11px", color: "var(--text-muted)" }} />
          <input 
            type="text" 
            placeholder="Rechercher une caisse..." 
            className="input" 
            style={{ paddingLeft: "36px" }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-primary-500)" }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {registers.map((r: any) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "40px", height: "40px", background: "var(--bg-muted)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                    <Monitor size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: "600", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                      {r.name}
                    </h4>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "4px" }}>{r.code}</span>
                      • {r.status === "active"
                        ? <span style={{ color: "#10b981", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}><CheckCircle2 size={12}/> Actif</span>
                        : <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Inactif</span>
                      }
                      
                      {/* ASSIGN CASHIER DROPDOWN */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "12px", borderLeft: "1px solid var(--border-color)", paddingLeft: "12px" }}>
                        <User size={14} color="var(--text-secondary)" />
                        <select 
                          className="input"
                          style={{ padding: "4px 8px", fontSize: "12px", height: "auto", minHeight: "0" }}
                          value={r.assigned_employee_id || ""}
                          onChange={(e) => handleAssignCashier(r.id, e.target.value)}
                          disabled={currentRole !== 'owner' && currentRole !== 'manager'}
                        >
                          <option value="">Non assigné</option>
                          {cashiers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={() => setSelectedRegisterCode(r.code)}
                  >
                    <QrCode size={14} /> Voir Code QR
                  </button>
                </div>
              </div>
            ))}
            {registers.length === 0 && !isLoading && (
              <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                <MonitorSmartphone size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                <p style={{ fontWeight: "600" }}>Aucune caisse configurée</p>
                <p style={{ fontSize: "13px", marginTop: "4px" }}>Ajoutez votre première caisse pour commencer.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* QR Code Modal */}
      {selectedRegisterCode && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          animation: "fade-in 0.2s ease"
        }}>
          <div style={{
            background: "var(--bg-surface)",
            borderRadius: "16px",
            padding: "32px",
            width: "100%",
            maxWidth: "400px",
            position: "relative",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            animation: "slide-up 0.3s ease"
          }}>
            <button 
              onClick={() => setSelectedRegisterCode(null)}
              style={{
                position: "absolute",
                top: "16px", right: "16px",
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-secondary)"
              }}
            >
              <X size={24} />
            </button>

            <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>Associer l'appareil</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
              Scannez ce QR Code avec l'appareil que vous souhaitez utiliser comme caisse pour vous connecter instantanément.
            </p>

            <div style={{
              width: "200px", height: "200px", margin: "0 auto",
              background: "white", padding: "12px", borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid #e2e8f0"
            }}>
              <QRCode value={getPairingData()} size={176} />
            </div>

            <div style={{ marginTop: "24px", background: "var(--bg-muted)", padding: "12px", borderRadius: "8px" }}>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase", fontWeight: "700" }}>Code Manuel</p>
              <p style={{ fontSize: "24px", fontFamily: "monospace", fontWeight: "800", letterSpacing: "2px", color: "var(--color-primary-600)" }}>{selectedRegisterCode}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
