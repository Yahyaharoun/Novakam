import fs from 'fs';
import path from 'path';

const frPath = path.join(process.cwd(), 'src/locales/fr.json');
const enPath = path.join(process.cwd(), 'src/locales/en.json');

const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Ajouter nav
if (!fr.nav) fr.nav = {};
if (!en.nav) en.nav = {};

const navTranslationsFr = {
  "dashboard": "Tableau de bord",
  "pos": "Caisse",
  "management": "GESTION",
  "products": "Produits",
  "inventory": "Stocks",
  "customers": "Clients",
  "suppliers": "Fournisseurs",
  "finances": "FINANCES",
  "credits": "Crédits",
  "debts": "Dettes fournisseurs",
  "expenses": "Dépenses",
  "treasury": "Trésorerie",
  "hr_reports": "RH & RAPPORTS",
  "employees": "Employés",
  "registers": "Caisses / Terminaux",
  "warehouses": "Magasins / Entrepôts",
  "reports": "Rapports"
};

const navTranslationsEn = {
  "dashboard": "Dashboard",
  "pos": "Point of Sale",
  "management": "MANAGEMENT",
  "products": "Products",
  "inventory": "Inventory",
  "customers": "Customers",
  "suppliers": "Suppliers",
  "finances": "FINANCE",
  "credits": "Credits",
  "debts": "Supplier Debts",
  "expenses": "Expenses",
  "treasury": "Treasury",
  "hr_reports": "HR & REPORTS",
  "employees": "Employees",
  "registers": "Registers / Terminals",
  "warehouses": "Warehouses",
  "reports": "Reports"
};

Object.assign(fr.nav, navTranslationsFr);
Object.assign(en.nav, navTranslationsEn);

fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

console.log("Translations updated successfully!");
