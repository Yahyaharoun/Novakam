"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera } from "lucide-react";

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScanTime = useRef<number>(0);

  useEffect(() => {
    // Créer une instance du scanner avec une configuration optimisée pour la vitesse
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 20,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        showTorchButtonIfSupported: true,
      },
      false
    );

    scannerRef.current = scanner;

    const onScanSuccess = (decodedText: string) => {
      // Éviter les scans multiples du même code en moins d'une seconde
      const now = Date.now();
      if (now - lastScanTime.current < 1500) return;
      
      lastScanTime.current = now;
      
      // Bip de succès (optionnel)
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
        audio.play().catch(() => {});
      } catch (e) {}

      onScan(decodedText);
      
      // On peut choisir de fermer automatiquement ou de laisser ouvert pour des scans multiples.
      // Pour une expérience POS fluide, on laisse généralement ouvert jusqu'à ce que l'utilisateur ferme.
    };

    const onScanFailure = (errorMsg: string) => {
      // Les erreurs de scan sont très fréquentes car la caméra tente de lire en continu.
      // On ignore ces erreurs en silence.
    };

    try {
      scanner.render(onScanSuccess, onScanFailure);
    } catch (err: any) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      console.error(err);
    }

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "page-in 0.2s"
    }}>
      <div style={{ 
        width: "100%", maxWidth: "500px", background: "var(--bg-surface)", 
        borderRadius: "16px", overflow: "hidden", position: "relative",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
            <Camera size={20} />
            Scanner un produit
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: "8px" }}>
            <X size={20} />
          </button>
        </div>

        {/* Scanner Body */}
        <div style={{ padding: "0", background: "#000" }}>
          {error ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#ef4444" }}>
              <p>{error}</p>
              <button onClick={onClose} className="btn btn-secondary mt-4">Fermer</button>
            </div>
          ) : (
            <div id="reader" style={{ width: "100%", border: "none" }}></div>
          )}
        </div>

        {/* Footer info */}
        <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)", background: "var(--bg-muted)" }}>
          Placez le code-barres ou le QR Code au centre. Le scan est automatique.
        </div>
      </div>
      
      {/* Overrides pour cacher les liens inutiles générés par html5-qrcode */}
      <style>{`
        #reader a { display: none !important; }
        #reader__dashboard_section_csr span { color: var(--text-primary) !important; font-family: 'Inter', sans-serif !important; }
        #reader__dashboard_section_swaplink { text-decoration: none !important; color: var(--color-primary-500) !important; }
        #reader button { background: var(--color-primary-600); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}
