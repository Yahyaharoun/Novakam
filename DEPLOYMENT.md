# Guide de Déploiement - NOVAKAM

L'architecture est entièrement gérée via Vercel pour le Frontend et Supabase pour le Backend. Le déploiement est automatisé via GitHub.

## 1. Environnements

- **Production** : Branch `main` → Déploiement Vercel automatique. Domaine final. Base de données de Prod.
- **Staging / Preview** : Branch `develop` → Déploiement Vercel Preview automatique. Base de données de Dev.

## 2. Configuration Vercel

### Connexion GitHub
Le projet Vercel est lié au dépôt GitHub.
- "Production Branch" est définie sur `main`.
- La configuration de base est présente dans `vercel.json` (headers de sécurité, auto-annulation des builds redondants).

### Variables d'Environnement
Sur le Dashboard Vercel (Project > Settings > Environment Variables), deux ensembles de variables doivent être configurés :

**Pour la Production (Environment = Production) :**
- `NEXT_PUBLIC_SUPABASE_URL` = URL du Supabase de Prod
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon Key du Supabase de Prod

**Pour le Staging (Environment = Preview & Development) :**
- `NEXT_PUBLIC_SUPABASE_URL` = URL du Supabase de Dev
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon Key du Supabase de Dev

## 3. Gestion Supabase (Migrations)

La base de développement (`develop`) NE DOIT JAMAIS affecter la base de production.

### Modification du Schéma
1. Développement local : `supabase migration new ma_migration`
2. SQL rédigé, test local : `supabase db push` (vers Supabase Dev).
3. Une fois validé, la PR est fusionnée sur `main`.
4. Lors de la mise en production, le DevOps exécute `supabase db push` vers la cible de Prod (via CLI CI/CD, ou manuellement).

## 4. Gestion de la PWA et du Cache (Important)
À chaque déploiement sur Vercel, Next.js génère de nouveaux hash pour les fichiers statiques. 
Le Service Worker (Serwist) s'appuie sur ce mécanisme.
- **Comportement Utilisateur** : Si un commerçant ouvre l'application hors ligne, il utilise la version mise en cache. Dès qu'il se connecte à Internet, le Service Worker détecte la nouvelle version déployée sur Vercel et se met à jour en arrière-plan. Un rafraîchissement appliquera la nouvelle version.
