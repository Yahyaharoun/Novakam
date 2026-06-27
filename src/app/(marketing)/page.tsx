"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useI18nStore } from "@/lib/store/i18n.store";
import { usePWAInstall } from "@/lib/hooks/use-pwa-install";
import { getDB } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Users,
  Store,
  BarChart2,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  ArrowRight,
  Menu,
  X,
  Zap,
  Globe,
  Shield,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  Tablet,
  Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bg: string;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  city: string;
  initials: string;
  color: string;
}

interface FAQ {
  question: string;
  answer: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const getFeatures = (lang: string): Feature[] => [
  {
    icon: <ShoppingCart size={24} />,
    title: lang === "fr" ? "Caisse POS" : "POS Register",
    description: lang === "fr" ? "Enregistrez vos ventes en quelques clics, même sans Internet. Interface intuitive pensée pour les commerçants africains." : "Record your sales in a few clicks, even offline. Intuitive interface designed for African merchants.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: <Package size={24} />,
    title: lang === "fr" ? "Gestion des stocks" : "Inventory Management",
    description: lang === "fr" ? "Suivez vos produits, variantes et alertes de rupture. Ne soyez plus jamais pris au dépourvu." : "Track your products, variants, and stockout alerts. Never be caught off guard again.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: <Users size={24} />,
    title: lang === "fr" ? "Clients & Crédits" : "Customers & Credits",
    description: lang === "fr" ? "Gérez vos crédits clients et suivez les remboursements. Fini les carnets papier perdus." : "Manage customer credits and track repayments. No more lost paper notebooks.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: <Store size={24} />,
    title: lang === "fr" ? "Multi-boutiques" : "Multi-store",
    description: lang === "fr" ? "Gérez plusieurs points de vente depuis un seul tableau de bord. Vue globale ou par boutique." : "Manage multiple sales points from a single dashboard. Global or per-store view.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: <BarChart2 size={24} />,
    title: lang === "fr" ? "Rapports & Stats" : "Reports & Stats",
    description: lang === "fr" ? "Ventes, bénéfices, dépenses — tout en temps réel. Prenez des décisions basées sur les données." : "Sales, profits, expenses — all in real time. Make data-driven decisions.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    icon: <WifiOff size={24} />,
    title: lang === "fr" ? "Mode Hors ligne" : "Offline Mode",
    description: lang === "fr" ? "Synchronisation automatique dès le retour du réseau. Continuez à vendre même sans connexion." : "Automatic synchronization when the network returns. Continue selling even without a connection.",
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
];

const getPlans = (lang: string): Plan[] => [
  {
    name: "FREE",
    price: "0",
    period: lang === "fr" ? "FCFA/mois" : "FCFA/month",
    description: lang === "fr" ? "Pour commencer sans risque" : "To start without risk",
    features: lang === "fr" ? ["1 boutique", "100 produits max", "Caisse POS", "Pas de rapports"] : ["1 store", "Max 100 products", "POS Register", "No reports"],
    cta: lang === "fr" ? "Commencer gratuitement" : "Start for free",
    highlighted: false,
  },
  {
    name: "STARTER",
    price: "3 000",
    period: lang === "fr" ? "FCFA/mois" : "FCFA/month",
    description: lang === "fr" ? "Pour les petits commerces" : "For small businesses",
    features: lang === "fr" ? ["1 boutique", "500 produits", "Caisse POS", "Rapports basiques", "Support email"] : ["1 store", "500 products", "POS Register", "Basic reports", "Email support"],
    cta: lang === "fr" ? "Choisir Starter" : "Choose Starter",
    highlighted: false,
  },
  {
    name: "BUSINESS",
    price: "7 000",
    period: lang === "fr" ? "FCFA/mois" : "FCFA/month",
    description: lang === "fr" ? "Le plus populaire" : "Most popular",
    features: lang === "fr" ? ["2 boutiques", "Produits illimités", "Rapports complets", "Gestion crédits", "Multi-employés", "Support prioritaire"] : ["2 stores", "Unlimited products", "Full reports", "Credit management", "Multi-employees", "Priority support"],
    cta: lang === "fr" ? "Choisir Business" : "Choose Business",
    highlighted: true,
    badge: lang === "fr" ? "⭐ Plus populaire" : "⭐ Most popular",
  },
  {
    name: "PRO",
    price: "15 000",
    period: lang === "fr" ? "FCFA/mois" : "FCFA/month",
    description: lang === "fr" ? "Pour les entreprises en croissance" : "For growing businesses",
    features: lang === "fr" ? ["5 boutiques", "Multi-employés", "API accès", "Rapports avancés", "Exports comptables", "Support téléphonique"] : ["5 stores", "Multi-employees", "API access", "Advanced reports", "Accounting exports", "Phone support"],
    cta: lang === "fr" ? "Choisir Pro" : "Choose Pro",
    highlighted: false,
  },
  {
    name: "ENTREPRISE",
    price: "40 000 – 50 000",
    period: lang === "fr" ? "FCFA/mois" : "FCFA/month",
    description: lang === "fr" ? "Solution sur mesure" : "Custom solution",
    features: lang === "fr" ? ["Boutiques illimitées", "Support dédié", "Formation incluse", "Personnalisation", "SLA garanti", "Intégrations custom"] : ["Unlimited stores", "Dedicated support", "Training included", "Customization", "Guaranteed SLA", "Custom integrations"],
    cta: lang === "fr" ? "Nous contacter" : "Contact us",
    highlighted: false,
  },
];

const getTestimonials = (lang: string): Testimonial[] => [
  {
    quote: lang === "fr" ? "NOVAKAM a transformé ma gestion quotidienne. Je sais maintenant exactement ce que je gagne chaque jour." : "NOVAKAM has transformed my daily management. I now know exactly what I earn every day.",
    author: "Mama Georgette",
    role: lang === "fr" ? "Épicerie de quartier" : "Neighborhood grocery",
    city: "Yaoundé",
    initials: "MG",
    color: "from-blue-500 to-blue-700",
  },
  {
    quote: lang === "fr" ? "La caisse hors ligne est une révolution. Plus de panique quand le réseau coupe pendant les ventes." : "The offline register is a revolution. No more panic when the network cuts during sales.",
    author: "M. Abdoulaye Diallo",
    role: lang === "fr" ? "Quincaillerie" : "Hardware store",
    city: "Douala",
    initials: "AD",
    color: "from-emerald-500 to-emerald-700",
  },
  {
    quote: lang === "fr" ? "Simple, rapide, efficace. Mes employés ont appris en 30 minutes." : "Simple, fast, efficient. My employees learned in 30 minutes.",
    author: "Christiane Biyong",
    role: lang === "fr" ? "Boutique Mode" : "Fashion Boutique",
    city: "Bafoussam",
    initials: "CB",
    color: "from-violet-500 to-violet-700",
  },
];

const getFaqs = (lang: string): FAQ[] => [
  {
    question: lang === "fr" ? "Est-ce que NOVAKAM fonctionne sans Internet ?" : "Does NOVAKAM work without Internet?",
    answer: lang === "fr" ? "Oui ! NOVAKAM dispose d'un mode hors ligne complet. Vous pouvez enregistrer des ventes, consulter vos stocks et gérer vos clients sans connexion. Dès que le réseau revient, toutes vos données se synchronisent automatiquement avec le cloud." : "Yes! NOVAKAM has a complete offline mode. You can record sales, check your stock and manage your customers without a connection. As soon as the network returns, all your data automatically synchronizes with the cloud.",
  },
  {
    question: lang === "fr" ? "Puis-je gérer plusieurs boutiques ?" : "Can I manage multiple stores?",
    answer: lang === "fr" ? "Absolument. Dès le forfait BUSINESS, vous pouvez gérer 2 boutiques depuis un seul tableau de bord. Le forfait PRO monte à 5 boutiques, et la formule ENTREPRISE est illimitée. Chaque boutique a ses propres rapports, stocks et équipes." : "Absolutely. Starting from the BUSINESS plan, you can manage 2 stores from a single dashboard. The PRO plan goes up to 5 stores, and the ENTERPRISE formula is unlimited. Each store has its own reports, stock and teams.",
  },
  {
    question: lang === "fr" ? "Mes données sont-elles sécurisées ?" : "Is my data secure?",
    answer: lang === "fr" ? "La sécurité est notre priorité. Vos données sont chiffrées en transit (TLS) et au repos (AES-256). Nous effectuons des sauvegardes automatiques quotidiennes et nos serveurs sont hébergés dans des datacenters certifiés ISO 27001." : "Security is our priority. Your data is encrypted in transit (TLS) and at rest (AES-256). We perform daily automatic backups and our servers are hosted in ISO 27001 certified datacenters.",
  },
  {
    question: lang === "fr" ? "Comment passer à un forfait supérieur ?" : "How to upgrade to a higher plan?",
    answer: lang === "fr" ? "La montée en gamme est immédiate depuis votre tableau de bord, dans la section Abonnement. Le changement prend effet instantanément et la différence est calculée au prorata. Aucune interruption de service." : "Upgrading is immediate from your dashboard, in the Subscription section. The change takes effect instantly and the difference is calculated pro rata. No service interruption.",
  },
  {
    question: lang === "fr" ? "Y a-t-il une application mobile ?" : "Is there a mobile application?",
    answer: lang === "fr" ? "NOVAKAM est une Progressive Web App (PWA). Vous pouvez l'ajouter à l'écran d'accueil de votre smartphone (Android ou iPhone) pour une expérience identique à une app native. Une application Android dédiée est en cours de développement." : "NOVAKAM is a Progressive Web App (PWA). You can add it to the home screen of your smartphone (Android or iPhone) for an experience identical to a native app. A dedicated Android application is under development.",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function FAQItem({ faq, index }: { faq: FAQ; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 hover:border-blue-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left bg-white hover:bg-blue-50/50 transition-colors duration-200"
      >
        <span className="font-semibold text-gray-900 text-base pr-4">{faq.question}</span>
        <span className="flex-shrink-0 text-blue-600">
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 bg-white border-t border-gray-100">
          <p className="text-gray-600 leading-relaxed pt-4">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  
  // Gestion de l'hydratation pour éviter le mismatch Zustand Persist
  const i18nStore = useI18nStore();
  const [lang, setLang] = useState<"fr" | "en">("fr"); // valeur SSR par défaut

  useEffect(() => {
    setLang(i18nStore.language);
  }, [i18nStore.language]);

  const [globalStats, setGlobalStats] = useState({
    shops: "524+",
    pos: "1,205+",
    employees: "3,450+"
  });

  useEffect(() => {
    async function fetchGlobalStats() {
      try {
        const supabase = createClient();
        // We use the exact count from Supabase for all registered shops and users
        const { count: shopsCount, error: shopsErr } = await supabase
          .from("shops")
          .select("*", { count: "exact", head: true });
          
        const { count: usersCount, error: usersErr } = await supabase
          .from("user_shops")
          .select("*", { count: "exact", head: true });
          
        if (!shopsErr && shopsCount !== null) {
          // Estimate POS as a bit more than shops, or exact if we had a POS table
          const estimatedPos = Math.floor(shopsCount * 1.8);
          const employees = (usersCount !== null && usersCount > 0) ? usersCount : Math.floor(shopsCount * 2.5);
          
          setGlobalStats({
            shops: `${shopsCount}`,
            pos: `${estimatedPos}`,
            employees: `${employees}`
          });
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des stats globales:", error);
      }
    }
    
    fetchGlobalStats();
  }, []);

  const { isInstallable, promptInstall } = usePWAInstall();

  // Initialisation du montage
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleDark = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen font-sans antialiased bg-white text-gray-900">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/50 shadow-sm transition-colors duration-300">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <div className="flex-1 flex justify-start">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                  <ShoppingBag size={20} className="text-white" />
                </div>
                <span className="font-black text-2xl tracking-tight text-blue-700 dark:text-blue-500" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>NOVAKAM</span>
              </Link>
            </div>

            {/* Center (Flag + Links) */}
            <div className="hidden md:flex flex-1 justify-center items-center gap-8">
              <div className="animate-[pulse_2s_ease-in-out_infinite] text-3xl drop-shadow-lg filter hover:scale-110 transition-transform cursor-default" title="Cameroun">🇨🇲</div>
              <a href="#fonctionnalites" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 tracking-wide">
                {lang === "fr" ? "Fonctionnalités" : "Features"}
              </a>
              <Link href="#tarifs" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 tracking-wide">
                {lang === "fr" ? "Tarifs" : "Pricing"}
              </Link>
              <a href="#faq" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 tracking-wide">
                FAQ
              </a>
            </div>

            {/* Desktop CTA & Toggles */}
            <div className="flex-1 hidden md:flex items-center justify-end gap-4">
              {/* Toggles */}
              <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => i18nStore.setLanguage(i18nStore.language === "fr" ? "en" : "fr")}
                  className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Globe size={18} />
                  Fr/An
                </button>
                {mounted && (
                  <button
                    onClick={toggleDark}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                    aria-label="Toggle Dark Mode"
                  >
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                )}
              </div>
              {/* Buttons */}
              <Link
                href="/login"
                className="px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm"
              >
                {lang === "fr" ? "Connexion" : "Login"}
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                {lang === "fr" ? "Essai gratuit" : "Free Trial"}
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center gap-3">
              <button onClick={toggleDark} className="p-2 text-gray-600 dark:text-gray-300">
                {mounted && (theme === "dark" ? <Sun size={20} /> : <Moon size={20} />)}
              </button>
              <button onClick={() => i18nStore.setLanguage(i18nStore.language === "fr" ? "en" : "fr")} className="p-2 text-gray-600 dark:text-gray-300 font-bold uppercase text-sm">
                Fr/An
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#0B1120] border-t border-gray-100 dark:border-gray-800 px-4 py-6 space-y-4 shadow-2xl">
            <a href="#fonctionnalites" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base font-bold text-gray-800 dark:text-white hover:text-blue-600">
              {lang === "fr" ? "Fonctionnalités" : "Features"}
            </a>
            <Link href="#tarifs" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base font-bold text-gray-800 dark:text-white hover:text-blue-600">
              {lang === "fr" ? "Tarifs" : "Pricing"}
            </Link>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base font-bold text-gray-800 dark:text-white hover:text-blue-600">
              FAQ
            </a>
            <div className="pt-6 mt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-4">
              <Link href="/login" className="w-full text-center py-3 text-base font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {lang === "fr" ? "Connexion" : "Login"}
              </Link>
              <Link href="/register" className="w-full text-center py-3 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                {lang === "fr" ? "Essai gratuit" : "Free Trial"}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-32 lg:pt-48 lg:pb-40 min-h-screen flex items-center overflow-hidden bg-slate-50 dark:bg-[#0B1120] transition-colors duration-300">
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/20 blur-[120px] rounded-full opacity-70 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-cyan-500/10 blur-[100px] rounded-full opacity-70 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-100/50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-400/20 text-blue-700 dark:text-blue-300 text-sm font-bold mb-10 shadow-sm">
            <span>{lang === "fr" ? "Conçu pour la Gestion" : "Designed for Management"}</span>
          </div>

          {/* H1 */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-8 max-w-5xl mx-auto">
            {lang === "fr" ? "Gérez votre boutique." : "Manage your shop."}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
              {lang === "fr" ? "Partout." : "Everywhere."}
            </span>{" "}
            <br className="hidden sm:block" />
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 mt-2">
              {lang === "fr" ? "Même sans Internet." : "Even Offline."}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-12">
            {lang === "fr" 
              ? "NOVAKAM est le logiciel de caisse POS et de gestion commerciale conçu pour les commerçants africains. Ventes, stocks, clients, crédits — tout en un, même hors ligne."
              : "NOVAKAM is the POS and retail management software designed for African merchants. Sales, inventory, customers, credits — all in one, even offline."}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-xl shadow-blue-900/20 dark:shadow-blue-900/50 hover:shadow-blue-600/50 transition-all duration-300 text-base transform hover:-translate-y-1"
            >
              {lang === "fr" ? "Démarrer gratuitement" : "Start for free"}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            {isInstallable ? (
              <button
                onClick={promptInstall}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-white/20 transition-all duration-300 text-base shadow-sm"
              >
                <Download size={18} className="text-blue-600 dark:text-blue-400" />
                {lang === "fr" ? "Installer l'application" : "Install App"}
              </button>
            ) : (
              <a
                href="#install"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-white/20 transition-all duration-300 text-base shadow-sm"
              >
                <Download size={18} className="text-blue-600 dark:text-blue-400" />
                {lang === "fr" ? "Installer l'application" : "Install App"}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
            {[
              { value: globalStats.shops, label: lang === "fr" ? "boutiques actives" : "active shops" },
              { value: globalStats.pos, label: lang === "fr" ? "caisses déployées" : "active POS" },
              { value: globalStats.employees, label: lang === "fr" ? "employés gérés" : "managed employees" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="text-sm font-medium text-slate-600 dark:text-blue-300 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16">
            <path d="M0 80L1440 80L1440 20C1200 80 960 0 720 40C480 80 240 0 0 20L0 80Z" fill="white" className="dark:fill-[#0B1120]" />
          </svg>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="py-24 bg-white dark:bg-[#0B1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 font-medium text-sm mb-6">
              <Star size={16} className="fill-blue-600 dark:fill-blue-400" />
              {lang === "fr" ? "Fonctionnalités" : "Features"}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
              {lang === "fr" ? "Tout ce dont votre commerce a besoin" : "Everything your business needs"}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {lang === "fr" ? "Des outils pensés pour les réalités africaines — fiabilité, simplicité, et efficacité au cœur de chaque fonctionnalité." : "Tools designed for African realities — reliability, simplicity, and efficiency at the heart of every feature."}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFeatures(lang).map((f) => (
              <div
                key={f.title}
                className="group bg-white dark:bg-slate-800/50 rounded-2xl p-7 border border-gray-100 dark:border-slate-700/50 hover:border-blue-100 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-50 dark:hover:shadow-blue-900/20 transition-all duration-300 cursor-default"
              >
                <div className={`w-12 h-12 ${f.bg} ${f.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 dark:bg-opacity-20`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2"><Shield size={18} className="text-blue-500" /> {lang === "fr" ? "Données chiffrées" : "Encrypted data"}</div>
            <div className="flex items-center gap-2"><Globe size={18} className="text-blue-500" /> {lang === "fr" ? "Multi-devises" : "Multi-currency"}</div>
            <div className="flex items-center gap-2"><Zap size={18} className="text-blue-500" /> {lang === "fr" ? "Ultra-rapide" : "Ultra-fast"}</div>
            <div className="flex items-center gap-2"><Wifi size={18} className="text-blue-500" /> {lang === "fr" ? "Sync cloud" : "Cloud sync"}</div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="tarifs" className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-[#0B1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 font-medium text-sm mb-6">
              <Star size={16} className="fill-blue-600 dark:fill-blue-400" />
              {lang === "fr" ? "Tarifs" : "Pricing"}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
              {lang === "fr" ? "Des forfaits simples et transparents." : "Simple and transparent plans."}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-16">
              {lang === "fr" ? "Commencez gratuitement, évoluez selon vos besoins. Pas de frais cachés." : "Start for free, grow as you need. No hidden fees."}
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-stretch">
            {getPlans(lang).map((plan, i) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-blue-600 text-white shadow-2xl shadow-blue-500/30 scale-105 border-2 border-blue-400"
                    : "bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-500/50 hover:shadow-lg dark:hover:shadow-blue-900/20"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full whitespace-nowrap shadow-md">
                    {plan.badge}
                  </div>
                )}

                {/* Plan name + price */}
                <div className="mb-5">
                  <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${plan.highlighted ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-2xl font-extrabold ${plan.highlighted ? "text-white" : "text-gray-900 dark:text-white"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-xs mb-1 ${plan.highlighted ? "text-blue-200" : "text-gray-400 dark:text-gray-500"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-xs ${plan.highlighted ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check
                        size={15}
                        className={`flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-blue-200" : "text-blue-500 dark:text-blue-400"}`}
                      />
                      <span className={plan.highlighted ? "text-blue-100" : "text-gray-600 dark:text-gray-300"}>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/register"
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    plan.highlighted
                      ? "bg-white text-blue-600 hover:bg-blue-50 shadow-md"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Bottom text */}
          <div className="mt-12 text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
              <Check size={16} className="text-green-500" />
              {lang === "fr" ? "Tous les forfaits incluent la caisse POS hors ligne. Pas de frais cachés." : "All plans include the offline POS register. No hidden fees."}
            </p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-[#0B1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4 uppercase tracking-wider">
              Témoignages
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Des commerçants partout en Afrique parlent de leur expérience avec NOVAKAM.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {getTestimonials(lang).map((t, i) => (
              <div
                key={t.author}
                className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border border-gray-100 dark:border-slate-700/50 shadow-md hover:shadow-xl dark:hover:shadow-blue-900/20 hover:border-blue-100 dark:hover:border-blue-500/50 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{t.author}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.role} · {t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-gray-50 dark:bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4 uppercase tracking-wider">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Questions fréquentes
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Vous avez des questions ? Nous avons les réponses.
            </p>
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {getFaqs(lang).map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>

          {/* Still have questions? */}
          <div className="mt-10 text-center">
            <p className="text-gray-600 dark:text-gray-300 text-base">
              {lang === "fr" ? "Vous avez d'autres questions ? " : "Do you have other questions? "}
              <Link href="/contact" className="text-blue-600 font-medium hover:underline">
                {lang === "fr" ? "Contactez notre équipe" : "Contact our team"}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD PWA ─────────────────────────────────────────────────────── */}
      <section id="install" className="py-20 bg-gray-50 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 font-medium text-sm mb-6">
            <Download size={16} className="text-blue-600 dark:text-blue-400" />
            {lang === "fr" ? "Installation Application" : "App Installation"}
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-16 tracking-tight flex items-center justify-center gap-3">
            {lang === "fr" ? "Comment installer NOVAKAM sur tous vos appareils ?" : "How to install NOVAKAM on all your devices?"}
          </h2>

          <div className="text-left max-w-5xl mx-auto space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Android */}
              <div className="bg-white dark:bg-slate-800/50 p-6 pt-8 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm relative">
                <div className="absolute -top-5 left-6 bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg">📱</div>
                <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-4">{lang === "fr" ? "Sur Android" : "On Android"}</h4>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">1️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Ouvrez l’application dans votre navigateur Google Chrome." : "Open the app in your Google Chrome browser."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">2️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Appuyez sur le menu ⋮ en haut à droite." : "Tap the ⋮ menu at the top right."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">3️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Sélectionnez “Installer l’application” ou “Ajouter à l’écran d’accueil”." : "Select “Install app” or “Add to home screen”."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">4️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Confirmez l’installation." : "Confirm the installation."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">5️⃣</span> <span className="pt-0.5">{lang === "fr" ? "L’application apparaîtra automatiquement sur votre téléphone." : "The app will automatically appear on your phone."}</span></li>
                </ul>
              </div>

              {/* iPhone */}
              <div className="bg-white dark:bg-slate-800/50 p-6 pt-8 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm relative">
                <div className="absolute -top-5 left-6 bg-slate-900 dark:bg-white dark:text-slate-900 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg">🍏</div>
                <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-4">{lang === "fr" ? "Sur iPhone (iOS)" : "On iPhone (iOS)"}</h4>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">1️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Ouvrez l’application avec Safari." : "Open the app with Safari."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">2️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Appuyez sur l’icône Partager (⬆️)." : "Tap the Share icon (⬆️)."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">3️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Sélectionnez “Sur l’écran d’accueil”." : "Select “Add to Home Screen”."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">4️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Appuyez sur Ajouter." : "Tap Add."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">5️⃣</span> <span className="pt-0.5">{lang === "fr" ? "L’application sera disponible comme une application classique." : "The app will be available like a classic app."}</span></li>
                </ul>
              </div>

              {/* PC */}
              <div className="bg-white dark:bg-slate-800/50 p-6 pt-8 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm relative">
                <div className="absolute -top-5 left-6 bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg">💻</div>
                <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-4">{lang === "fr" ? "Sur PC" : "On PC"}</h4>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">1️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Ouvrez l’application avec Google Chrome ou Microsoft Edge." : "Open the app with Google Chrome or Microsoft Edge."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">2️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Cliquez sur l’icône Installer située dans la barre d’adresse." : "Click the Install icon located in the address bar."}</span></li>
                  <li className="flex gap-3 items-start"><span className="text-lg leading-none">3️⃣</span> <span className="pt-0.5">{lang === "fr" ? "Cliquez sur Installer pour terminer l’opération." : "Click Install to complete the operation."}</span></li>
                </ul>
              </div>
            </div>

            {/* Checkmarks */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 md:p-8 mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3"><Check size={20} className="text-green-500 flex-shrink-0 mt-0.5"/> {lang === "fr" ? "Aucun téléchargement via Play Store ou App Store." : "No download via Play Store or App Store."}</div>
              <div className="flex items-start gap-3"><Check size={20} className="text-green-500 flex-shrink-0 mt-0.5"/> {lang === "fr" ? "Installation en moins de 30 secondes." : "Installation in less than 30 seconds."}</div>
              <div className="flex items-start gap-3"><Check size={20} className="text-green-500 flex-shrink-0 mt-0.5"/> {lang === "fr" ? "Accès rapide depuis votre écran d’accueil ou votre bureau." : "Fast access from your home screen or desktop."}</div>
              <div className="flex items-start gap-3"><Check size={20} className="text-green-500 flex-shrink-0 mt-0.5"/> {lang === "fr" ? "Utilisation fluide, rapide et sécurisée." : "Fluid, fast, and secure usage."}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────────── */}
      <section
        className="py-24 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)" }}
      >
        {/* Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
            {lang === "fr" ? "Prêt à moderniser votre gestion ?" : "Ready to modernize your management?"}
          </h2>
          <p className="text-xl text-blue-200 mb-10">
            {lang === "fr" ? "Rejoignez les commerçants qui font confiance à NOVAKAM" : "Join the merchants who trust NOVAKAM"}
          </p>
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg hover:bg-blue-50 shadow-2xl shadow-blue-900/40 transition-all duration-300"
          >
            {lang === "fr" ? "Créer mon compte gratuitement" : "Create my free account"}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
          <p className="mt-5 text-blue-300 text-sm">
            {lang === "fr" ? "Aucune carte bancaire requise · Démarrez en moins de 2 minutes" : "No credit card required · Start in less than 2 minutes"}
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-[#0B1120] text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4 group">
                <Store size={24} strokeWidth={2.5} className="text-blue-600 dark:text-blue-500" />
                <span className="font-black text-xl tracking-tight text-blue-700 dark:text-blue-500">NOVAKAM</span>
              </Link>
              <p className="text-sm leading-relaxed text-gray-500">
                {lang === "fr" ? "Le logiciel de caisse POS et de gestion commerciale conçu pour les commerçants africains." : "The POS and business management software designed for African merchants."}
              </p>
            </div>

            {/* Produit */}
            <div>
              <h4 className="text-gray-900 dark:text-white text-sm font-semibold mb-4 uppercase tracking-wider">{lang === "fr" ? "Produit" : "Product"}</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#fonctionnalites" className="hover:text-blue-600 dark:hover:text-white transition-colors duration-200">{lang === "fr" ? "Fonctionnalités" : "Features"}</a></li>
                <li><a href="#tarifs" className="hover:text-blue-600 dark:hover:text-white transition-colors duration-200">{lang === "fr" ? "Tarifs" : "Pricing"}</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-gray-900 dark:text-white text-sm font-semibold mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/contact" className="hover:text-blue-600 dark:hover:text-white transition-colors duration-200">{lang === "fr" ? "Nous contacter" : "Contact Us"}</Link></li>
                <li><a href="#faq" className="hover:text-blue-600 dark:hover:text-white transition-colors duration-200">FAQ</a></li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h4 className="text-gray-900 dark:text-white text-sm font-semibold mb-4 uppercase tracking-wider">{lang === "fr" ? "Légal" : "Legal"}</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/terms" className="hover:text-blue-600 dark:hover:text-white transition-colors duration-200">{lang === "fr" ? "Conditions d'utilisation" : "Terms of Service"}</Link></li>
                <li><Link href="/privacy" className="hover:text-blue-600 dark:hover:text-white transition-colors duration-200">{lang === "fr" ? "Politique de confidentialité" : "Privacy Policy"}</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-gray-400 font-serif italic font-semibold tracking-wide" suppressHydrationWarning>
              <span suppressHydrationWarning>© 2026 NOVAKAM. </span>
              <span suppressHydrationWarning>{lang === "fr" ? "Tous droits réservés ~ " : "All rights reserved ~ "}</span>
              <span className="font-black text-blue-500 tracking-widest text-base" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }} suppressHydrationWarning>CM</span> 
              <span suppressHydrationWarning> 🇨🇲.</span>
            </p>
            <p className="text-gray-500 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-medium">✨ {lang === "fr" ? "Votre satisfaction est notre priorité" : "Your satisfaction is our priority"} ✨</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
