"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minDelay?: number; // Délai maximum entre deux frappes (ms) pour être considéré comme un scanner (defaut 50)
  minLength?: number; // Longueur minimale du code (defaut 3)
}

/**
 * Hook global pour capter les douchette/scanners Bluetooth (HID)
 * qui se comportent comme un clavier.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minDelay = 50,
  minLength = 3
}: UseBarcodeScannerProps) {
  const buffer = useRef<string>("");
  const lastKeyTime = useRef<number>(Date.now());
  const callbackRef = useRef(onScan);

  // Mettre à jour la ref du callback pour éviter les re-renders
  useEffect(() => {
    callbackRef.current = onScan;
  }, [onScan]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Ignorer si l'utilisateur tape dans un champ de saisie
    const target = e.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    ) {
      return;
    }

    const now = Date.now();
    const delay = now - lastKeyTime.current;
    
    // Si la frappe est trop lente, c'est un humain : on réinitialise
    if (delay > minDelay) {
      buffer.current = "";
    }
    
    lastKeyTime.current = now;

    if (e.key === "Enter") {
      if (buffer.current.length >= minLength) {
        const code = buffer.current;
        e.preventDefault(); // Empêcher la soumission de formulaire par défaut
        // Petit délai pour s'assurer qu'aucun autre event parasite ne vienne interférer
        setTimeout(() => {
          callbackRef.current(code);
        }, 10);
      }
      buffer.current = "";
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // N'accepter que les caractères simples
      buffer.current += e.key;
    }
  }, [enabled, minDelay, minLength]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
