"use client";
import { useState } from "react";
import {
  BarChart3,
  Download,
  FileText,
  ShoppingBag,
  Package,
  DollarSign,
  Users,
  Calendar,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useI18nStore } from "@/lib/store/i18n.store";
import { getDB } from "@/lib/db/schema";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getReportCards = (t: any) => [
  {
    id: "sales",
    title: t("reports.sales_title"),
    description: t("reports.sales_desc"),
    icon: ShoppingBag,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
  },
  {
    id: "stocks",
    title: t("reports.stocks_title"),
    description: t("reports.stocks_desc"),
    icon: Package,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
  },
  {
    id: "finance",
    title: t("reports.finance_title"),
    description: t("reports.finance_desc"),
    icon: DollarSign,
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
  },
  {
    id: "clients",
    title: t("reports.clients_title"),
    description: t("reports.clients_desc"),
    icon: Users,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
  },
];


const RECENT_REPORTS = [
  {
    id: "1",
    name: "Rapport Ventes - Juin 2025",
    type: "Ventes",
    date: "2025-06-20",
    status: "ready",
  },
  {
    id: "2",
    name: "Rapport Financier - Mai 2025",
    type: "Finance",
    date: "2025-06-01",
    status: "ready",
  },
  {
    id: "3",
    name: "Rapport Stocks - Juin 2025",
    type: "Stocks",
    date: "2025-06-15",
    status: "ready",
  },
];

export default function ReportsPage() {
  const { t } = useI18nStore();
  const [generating, setGenerating] = useState<string | null>(null);

  const REPORT_CARDS = getReportCards(t);

  async function handleGenerate(id: string) {
    setGenerating(id);
    try {
      const db = getDB();
      const doc = new jsPDF();
      let filename = `rapport_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
      let title = "";
      let head: string[][] = [];
      let body: (string | number)[][] = [];

      if (id === "sales") {
        title = "Rapport des Ventes";
        const sales = await db.sales.toArray();
        head = [["ID", "Numéro", "Total (FCFA)", "Date"]];
        body = sales.map(s => [s.id.substring(0,8), s.sale_number, s.total_amount, new Date(s.created_at).toLocaleDateString()]);
      } else if (id === "stocks") {
        title = "Rapport des Stocks";
        const products = await db.products.toArray();
        head = [["Nom", "SKU", "Stock", "Prix Vente (FCFA)"]];
        body = products.map(p => [p.name, p.sku || "-", p.stock_quantity, p.selling_price]);
      } else if (id === "finance") {
        title = "Rapport Financier";
        const expenses = await db.expenses.toArray();
        const credits = await db.credits.toArray();
        head = [["Type", "Montant (FCFA)", "Date"]];
        expenses.forEach(e => body.push([`Dépense (${e.category})`, e.amount, new Date(e.spent_at).toLocaleDateString()]));
        credits.forEach(c => body.push([`Crédit client (reste)`, c.remaining_amount, new Date(c.created_at).toLocaleDateString()]));
      } else if (id === "clients") {
        title = "Rapport Clients";
        let clients = await db.customers.toArray();
        if (clients.length === 0 && typeof window !== "undefined") {
          const saved = localStorage.getItem("novakam-mock-customers");
          if (saved) clients = JSON.parse(saved);
        }
        head = [["Nom", "Téléphone", "Dette (FCFA)"]];
        body = clients.map(c => [c.name, c.phone || "-", c.current_debt || 0]);
      } else {
        title = "Rapport";
      }

      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.text(`Généré le : ${new Date().toLocaleDateString()}`, 14, 30);

      autoTable(doc, {
        startY: 36,
        head: head,
        body: body,
      });

      doc.save(filename);
      
      toast.success(t("common.success") || "Rapport téléchargé !");
    } catch (error) {
      console.error(error);
      toast.error(t("common.error") || "Erreur lors de la génération");
    } finally {
      setGenerating(null);
    }
  }

  async function downloadRecent(report: any) {
    // Map the mock recent report type to the actual generator ID
    let reportId = "sales";
    if (report.type === "Finance") reportId = "finance";
    if (report.type === "Stocks") reportId = "stocks";
    if (report.type === "Clients") reportId = "clients";
    
    await handleGenerate(reportId);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("reports.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("reports.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={15} />
          <span>
            {new Date().toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <TrendingUp size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            {t("reports.local_mode")}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            {t("reports.local_mode_desc")}
          </p>
        </div>
      </div>

      {/* Report Cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {t("reports.generate_title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORT_CARDS.map((report) => {
            const Icon = report.icon;
            const isGenerating = generating === report.id;
            return (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: report.bg }}
                  >
                    <Icon size={20} style={{ color: report.color }} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300 mt-1" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                  {report.title}
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {report.description}
                </p>
                <button
                  onClick={() => handleGenerate(report.id)}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors border"
                  style={{
                    borderColor: report.color,
                    color: isGenerating ? "#94a3b8" : report.color,
                    background: isGenerating ? "#f8fafc" : "transparent",
                  }}
                >
                  {isGenerating ? (
                    <>
                      <div
                        className="w-3 h-3 border-2 rounded-full animate-spin"
                        style={{ borderColor: `${report.color}30`, borderTopColor: report.color }}
                      />
                      {t("reports.generating")}
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      {t("reports.generate_btn")}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {t("reports.recent_title")}
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("reports.table_report")}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("reports.table_type")}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("reports.table_date")}
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t("reports.table_status")}
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {RECENT_REPORTS.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {report.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {report.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {new Date(report.date).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      {t("reports.status_available")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => downloadRecent(report)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium ml-auto">
                      <Download size={13} />
                      {t("reports.action_download")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
