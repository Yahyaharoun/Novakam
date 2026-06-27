// src/app/not-found.tsx
import Link from "next/link";
import { ShoppingBag, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          background: "linear-gradient(135deg, #2563eb, #3b82f6)",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        <ShoppingBag size={32} color="white" />
      </div>
      <h1 style={{ fontSize: "48px", fontWeight: "800", color: "var(--color-primary-600)", margin: "0 0 8px" }}>
        404
      </h1>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
        Page introuvable
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "28px", maxWidth: "400px" }}>
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 24px",
          background: "linear-gradient(135deg, #2563eb, #3b82f6)",
          color: "white",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "14px",
        }}
      >
        <Home size={16} />
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
