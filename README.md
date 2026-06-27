# NOVAKAM 🚀

![NOVAKAM Cover](public/icons/icon-512x512.png)

**NOVAKAM** est une plateforme SaaS + Progressive Web App (PWA) Offline-First destinée à révolutionner la gestion commerciale des boutiques et commerces en Afrique.

## 🌟 Caractéristiques Principales

- **Multi-Tenant (SaaS)** : Chaque commerçant possède son espace totalement isolé.
- **Offline-First** : Continuez à encaisser et gérer vos stocks même sans connexion internet grâce à IndexedDB et Service Workers.
- **Système RBAC Strict** : Gestion avancée des rôles (Propriétaire, Manager, Caissier, Magasinier, Comptable, Support).
- **Module Point de Vente (POS)** : Rapide, fluide et compatible avec les lecteurs de codes-barres.
- **Synchronisation en Arrière-plan** : `SyncQueue` intelligente avec Retry exponentiel.

## 🛠 Stack Technique

- **Frontend** : Next.js 16 (App Router), React 19, Tailwind CSS.
- **Backend / BDD** : Supabase, PostgreSQL.
- **PWA** : Serwist.
- **State Management** : Zustand.
- **Hébergement** : Vercel.

## 📚 Documentation pour les Développeurs

Pour garantir la stabilité du SaaS, ce dépôt suit des règles strictes. Veuillez lire attentivement les documents suivants avant de contribuer :

1. [Stratégie de Branches (GitFlow)](BRANCHING_STRATEGY.md)
2. [Versioning & Releases](VERSIONING.md)
3. [Règles de Contribution](CONTRIBUTING.md)
4. [Guide de Déploiement Vercel](DEPLOYMENT.md)

## 🚀 Démarrage Rapide (Développement Local)

1. Clonez le dépôt.
2. Copiez `.env.example` vers `.env.local` et remplissez vos identifiants Supabase de développement.
3. Installez les dépendances : `npm ci`
4. Lancez le serveur : `npm run dev`

---
*Propulsé par la technologie, conçu pour l'Afrique.*
