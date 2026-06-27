const fs = require('fs');

function merge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key]) Object.assign(target, { [key]: {} });
      merge(target[key], source[key]);
    } else {
      if (!target[key]) target[key] = source[key];
    }
  }
}

const pos_fr = {
  search_placeholder: "Rechercher un produit ou scanner...",
  all_categories: "Toutes catégories",
  ready_scan: "Prêt à scanner",
  no_product: "Aucun produit trouvé",
  out_of_stock: "Rupture",
  stock: "Stock : ",
  added: "ajouté au panier",
  product_not_found: "Produit non trouvé",
  sale_success: "Vente enregistrée avec succès",
  sale_error: "Erreur lors de la vente"
};

const pos_en = {
  search_placeholder: "Search product or scan...",
  all_categories: "All categories",
  ready_scan: "Ready to scan",
  no_product: "No product found",
  out_of_stock: "Out of stock",
  stock: "Stock: ",
  added: "added to cart",
  product_not_found: "Product not found",
  sale_success: "Sale recorded successfully",
  sale_error: "Error recording sale"
};

const inv_fr = {
  title: "Gestion des Stocks",
  subtitle: "Suivi en temps réel · Synchronisation automatique",
  total_value: "VALEUR TOTALE",
  out_of_stock: "RUPTURES",
  low_stock: "STOCK BAS",
  ok_stock: "PRODUITS OK",
  tab_all: "Tous",
  tab_out: "Ruptures",
  tab_low: "Stock bas",
  tab_ok: "Suffisant",
  no_product_cat: "Aucun produit dans cette catégorie",
  adjustments: "Ajustements & Pertes",
  search_placeholder: "Rechercher un produit...",
  table_product: "Produit",
  table_stock: "Stock",
  table_value: "Valeur",
  table_status: "Statut",
  table_actions: "Actions",
  btn_adjust: "Ajuster",
  modal_title: "Ajuster le stock",
  modal_type: "Type d'opération",
  modal_type_add: "Ajout manuel",
  modal_type_remove: "Retrait manuel",
  modal_type_loss: "Perte / Casse",
  modal_type_return: "Retour client",
  modal_quantity: "Quantité",
  modal_reason: "Motif (Optionnel)"
};

const inv_en = {
  title: "Inventory Management",
  subtitle: "Real-time tracking · Automatic synchronization",
  total_value: "TOTAL VALUE",
  out_of_stock: "OUT OF STOCK",
  low_stock: "LOW STOCK",
  ok_stock: "OK PRODUCTS",
  tab_all: "All",
  tab_out: "Out of stock",
  tab_low: "Low stock",
  tab_ok: "Sufficient",
  no_product_cat: "No product in this category",
  adjustments: "Adjustments & Losses",
  search_placeholder: "Search product...",
  table_product: "Product",
  table_stock: "Stock",
  table_value: "Value",
  table_status: "Status",
  table_actions: "Actions",
  btn_adjust: "Adjust",
  modal_title: "Adjust stock",
  modal_type: "Operation type",
  modal_type_add: "Manual addition",
  modal_type_remove: "Manual removal",
  modal_type_loss: "Loss / Breakage",
  modal_type_return: "Customer return",
  modal_quantity: "Quantity",
  modal_reason: "Reason (Optional)"
};

const treasury_fr = {
  title: "Trésorerie",
  subtitle: "Suivi des liquidités de la boutique",
  new_entry: "Nouvelle entrée/sortie",
  total_balance: "Solde Total",
  total_cash: "Caisse Physique",
  total_momo: "Mobile Money",
  total_bank: "Banque",
  no_movements: "Aucun mouvement enregistré",
  table_date: "Date",
  table_type: "Type",
  table_amount: "Montant",
  table_method: "Méthode",
  table_user: "Utilisateur / Réf",
  type_sale_income: "Revenu de vente",
  type_expense: "Dépense",
  type_credit_payment: "Paiement de crédit",
  type_debt_payment: "Paiement de dette",
  type_deposit: "Dépôt",
  type_withdrawal: "Retrait"
};

const treasury_en = {
  title: "Treasury",
  subtitle: "Tracking shop liquidity",
  new_entry: "New entry/withdrawal",
  total_balance: "Total Balance",
  total_cash: "Physical Cash",
  total_momo: "Mobile Money",
  total_bank: "Bank",
  no_movements: "No movements recorded",
  table_date: "Date",
  table_type: "Type",
  table_amount: "Amount",
  table_method: "Method",
  table_user: "User / Ref",
  type_sale_income: "Sale income",
  type_expense: "Expense",
  type_credit_payment: "Credit payment",
  type_debt_payment: "Debt payment",
  type_deposit: "Deposit",
  type_withdrawal: "Withdrawal"
};

const suppliers_fr = {
  title: "Fournisseurs",
  subtitle: "Gérez vos fournisseurs et vos dettes",
  total_suppliers: "Total fournisseurs",
  active_suppliers: "Fournisseurs actifs",
  total_debt: "Dette totale",
  add_new: "Nouveau Fournisseur",
  search: "Rechercher un fournisseur...",
  table_name: "Nom",
  table_contact: "Contact",
  table_debt: "Dette",
  table_status: "Statut",
  no_data: "Aucun fournisseur trouvé"
};

const suppliers_en = {
  title: "Suppliers",
  subtitle: "Manage your suppliers and debts",
  total_suppliers: "Total suppliers",
  active_suppliers: "Active suppliers",
  total_debt: "Total debt",
  add_new: "New Supplier",
  search: "Search supplier...",
  table_name: "Name",
  table_contact: "Contact",
  table_debt: "Debt",
  table_status: "Status",
  no_data: "No suppliers found"
};

const credits_fr = {
  title: "Crédits Clients",
  subtitle: "Suivez les impayés de vos clients",
  total_unpaid: "Total impayé :",
  no_credits: "Aucun crédit client actif",
  table_date: "Date",
  table_customer: "Client",
  table_original: "Montant initial",
  table_remaining: "Reste à payer",
  action_pay: "Encaisser",
  payment_panel_title: "Enregistrer un paiement",
  amount_paid: "Montant payé *",
  payment_method: "Moyen de paiement *",
  cash_impact: "Sera ajouté au solde de la caisse."
};

const credits_en = {
  title: "Customer Credits",
  subtitle: "Track your unpaid customer invoices",
  total_unpaid: "Total unpaid:",
  no_credits: "No active customer credits",
  table_date: "Date",
  table_customer: "Customer",
  table_original: "Original amount",
  table_remaining: "Remaining to pay",
  action_pay: "Collect",
  payment_panel_title: "Record a payment",
  amount_paid: "Amount paid *",
  payment_method: "Payment method *",
  cash_impact: "Will be added to the cash register balance."
};

const customers_fr = {
  title: "Clients",
  subtitle: "Gérez votre clientèle et leurs crédits",
  total_customers: "Total clients",
  active_customers: "Clients actifs",
  total_credit: "Crédit total",
  add_new: "Nouveau Client",
  search: "Rechercher un client...",
  table_name: "Nom",
  table_contact: "Contact",
  table_purchases: "Total achats",
  table_debt: "Dette",
  table_status: "Statut",
  no_data: "Aucun client trouvé"
};

const customers_en = {
  title: "Customers",
  subtitle: "Manage your clientele and their credits",
  total_customers: "Total customers",
  active_customers: "Active customers",
  total_credit: "Total credit",
  add_new: "New Customer",
  search: "Search customer...",
  table_name: "Name",
  table_contact: "Contact",
  table_purchases: "Total purchases",
  table_debt: "Debt",
  table_status: "Status",
  no_data: "No customers found"
};

function processLang(file, data) {
  let json = JSON.parse(fs.readFileSync(file, 'utf8'));
  merge(json, data);
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
}

processLang('src/lib/i18n/fr.json', { 
  pos: pos_fr, 
  inventory: inv_fr, 
  treasury: treasury_fr, 
  suppliers: suppliers_fr, 
  credits: credits_fr,
  customers: customers_fr
});

processLang('src/lib/i18n/en.json', { 
  pos: pos_en, 
  inventory: inv_en, 
  treasury: treasury_en, 
  suppliers: suppliers_en, 
  credits: credits_en,
  customers: customers_en
});

console.log("I18n updated!");
