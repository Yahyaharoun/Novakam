"use client";

import React from "react";
import { Lock } from "lucide-react";
import { FeatureKey } from "../types";
import { useFeature } from "../hooks";
import Link from "next/link";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const hasFeature = useFeature(feature);

  if (hasFeature) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/30 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Fonctionnalité Verrouillée</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Votre abonnement actuel ne permet pas d'accéder à cette fonctionnalité. Mettez à niveau votre forfait pour débloquer de nouveaux outils.
        </p>
        <Link
          href="/subscription"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          Voir les forfaits
        </Link>
      </div>
    );
  }

  return null;
}
