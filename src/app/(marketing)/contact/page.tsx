"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, Send, ArrowLeft, ShoppingBag } from "lucide-react";
import { useI18nStore } from "@/lib/store/i18n.store";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ContactPage() {
  const { language } = useI18nStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success(language === "fr" ? "Message envoyé avec succès !" : "Message sent successfully!");
    setIsSubmitting(false);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] pb-12">
      {/* Simple Navbar for Contact Page */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">NOVAKAM</span>
          </Link>
          
          <div className="flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors">Accueil</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">

        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            {language === "fr" ? "Contactez-nous" : "Contact Us"}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {language === "fr" 
              ? "Notre équipe est là pour vous aider à déployer NOVAKAM dans votre commerce."
              : "Our team is here to help you deploy NOVAKAM in your business."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                <Mail size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Email</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {language === "fr" ? "Pour toute demande d'information :" : "For any inquiries:"}
              </p>
              <a href="mailto:contact@novakam.app" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                contact@novakam.app
              </a>
            </div>

            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                <Phone size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Téléphone</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {language === "fr" ? "Assistance téléphonique :" : "Phone support:"}
              </p>
              <a href="tel:+237600000000" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                +237 600 00 00 00
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                {language === "fr" ? "Envoyez-nous un message" : "Send us a message"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {language === "fr" ? "Nom complet" : "Full Name"}
                    </label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder={language === "fr" ? "Jean Dupont" : "John Doe"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {language === "fr" ? "Adresse email" : "Email Address"}
                    </label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder={language === "fr" ? "jean@exemple.com" : "john@example.com"}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {language === "fr" ? "Sujet" : "Subject"}
                  </label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder={language === "fr" ? "Comment pouvons-nous vous aider ?" : "How can we help you?"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {language === "fr" ? "Message" : "Message"}
                  </label>
                  <textarea 
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder={language === "fr" ? "Écrivez votre message ici..." : "Write your message here..."}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  {language === "fr" ? "Envoyer le message" : "Send message"}
                </button>
              </form>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
