"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { getDB } from "@/lib/db/schema";
import { Store, LogOut, Delete, ShieldAlert } from "lucide-react";
import { useI18nStore } from "@/lib/store/i18n.store";
import { useOffline } from "@/lib/hooks/use-offline";

export function LockScreen() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const { currentShop, unlockApp } = useAuthStore();
  const { t } = useI18nStore();
  const { isOnline } = useOffline();

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (error) return;
      if (e.key >= "0" && e.key <= "9") {
        handlePress(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, error]);

  // Effect to verify PIN when 4 digits are reached
  useEffect(() => {
    if (pin.length === 4) {
      verifyPin(pin);
    }
  }, [pin]);

  const handlePress = (num: string) => {
    if (pin.length < 4 && !error) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (error) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const verifyPin = async (enteredPin: string) => {
    if (!currentShop) return;

    try {
      const db = getDB();
      // Chercher un employé actif avec ce PIN dans cette boutique
      const employees = await db.employees
        .where("shop_id")
        .equals(currentShop.id)
        .toArray();

      const matchedEmployee = employees.find(
        (e) => e.pin === enteredPin && e.status === "active"
      );

      if (matchedEmployee) {
        // Success!
        unlockApp(matchedEmployee);
      } else {
        // Fail
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 800); // Wait for shake animation to finish
      }
    } catch (err) {
      console.error("Error verifying PIN:", err);
      setError(true);
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 800);
    }
  };

  const handleFullLogout = () => {
    if (!isOnline) {
      alert("Une connexion internet est requise pour vous déconnecter complètement du serveur.");
      return;
    }
    // True Supabase logout
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url && url.startsWith("http")) {
        import("@/lib/supabase/client").then(({ createClient }) => {
          createClient().auth.signOut().catch(() => {});
        });
      }
    } catch (_) {}
    
    useAuthStore.getState().reset();
    document.cookie = "novakam-local-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
        .pin-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--border-color);
          background: transparent;
          transition: all 0.2s;
        }
        .pin-dot.filled {
          background: var(--color-primary-500);
          border-color: var(--color-primary-500);
        }
        .pin-dot.error {
          background: #ef4444;
          border-color: #ef4444;
        }
        .numpad-btn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          alignItems: center;
          justifyContent: center;
          cursor: pointer;
          transition: all 0.1s;
        }
        .numpad-btn:active {
          transform: scale(0.95);
          background: var(--bg-muted);
        }
      `}</style>

      {/* Header Info */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Store size={32} color="white" />
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
          {currentShop?.name || "Boutique"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Entrez votre code PIN pour déverrouiller la caisse
        </p>
      </div>

      {/* PIN Dots Indicator */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "40px",
          animation: error ? "shake 0.4s ease-in-out" : "none",
        }}
      >
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`pin-dot ${pin.length > index ? "filled" : ""} ${error ? "error" : ""}`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginBottom: "40px",
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button key={num} className="numpad-btn" onClick={() => handlePress(num.toString())}>
            {num}
          </button>
        ))}
        <div /> {/* Empty space */}
        <button className="numpad-btn" onClick={() => handlePress("0")}>
          0
        </button>
        <button
          className="numpad-btn"
          onClick={handleDelete}
          style={{ background: "transparent", border: "none" }}
        >
          <Delete size={28} />
        </button>
      </div>

      {/* Admin Logout */}
      <button
        onClick={handleFullLogout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 24px",
          borderRadius: "8px",
          background: "transparent",
          border: "1px solid var(--border-color)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "500",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "#ef4444")}
        onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
      >
        {!isOnline ? <ShieldAlert size={16} color="#f59e0b" /> : <LogOut size={16} />}
        Déconnexion complète (Admin)
      </button>
    </div>
  );
}
