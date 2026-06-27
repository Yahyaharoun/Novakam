"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18nStore } from "@/lib/store/i18n.store";

export default function OfflinePage() {
  const { language } = useI18nStore();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check if we're back online
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };
    
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 p-8 sm:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="w-24 h-24 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          <WifiOff size={48} className="text-red-500" />
          <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-20"></div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {language === "fr" ? "Vous êtes hors ligne" : "You are offline"}
        </h1>
        
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
          {language === "fr" 
            ? "Vérifiez votre connexion Internet. NOVAKAM nécessite une connexion pour accéder à cette page spécifique. La caisse (POS) reste accessible." 
            : "Check your Internet connection. NOVAKAM requires a connection to access this specific page. The POS remains accessible."}
        </p>

        <div className="flex flex-col gap-4 w-full">
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-600/30"
          >
            <RefreshCw size={20} className={!isOnline ? "animate-pulse" : ""} />
            {language === "fr" ? "Réessayer" : "Try again"}
          </button>
          
          <Link 
            href="/pos" 
            className="w-full flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-4 px-6 rounded-xl font-bold transition-all"
          >
            {language === "fr" ? "Aller à la caisse (Mode Offline)" : "Go to POS (Offline Mode)"}
          </Link>
        </div>
      </div>
    </div>
  );
}
