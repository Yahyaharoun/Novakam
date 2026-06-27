import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Valider",
  cancelLabel = "Annuler",
  isDestructive = true,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      animation: "fade-in 0.2s ease"
    }}>
      <div style={{
        background: "var(--bg-surface)",
        borderRadius: "16px",
        padding: "24px",
        width: "100%",
        maxWidth: "400px",
        position: "relative",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        animation: "slide-up 0.3s ease"
      }}>
        <button 
          onClick={onCancel}
          style={{
            position: "absolute",
            top: "16px", right: "16px",
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--text-secondary)"
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          {isDestructive && (
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} />
            </div>
          )}
          <h3 style={{ fontSize: "18px", fontWeight: "700" }}>{title}</h3>
        </div>

        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button 
            onClick={onCancel} 
            className="btn btn-secondary"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm} 
            className="btn"
            style={{
              background: isDestructive ? "#ef4444" : "var(--color-primary-500)",
              color: "white",
              border: "none"
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
