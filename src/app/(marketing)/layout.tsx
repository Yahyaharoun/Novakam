import Link from "next/link";
import { ShoppingBag, Moon, Sun } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <main className="flex-1">{children}</main>
    </div>
  );
}
