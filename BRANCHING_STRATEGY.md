# Stratégie de Branches (GitFlow) - NOVAKAM

Pour garantir la qualité et l'isolation du code entre la phase de développement et la production, nous utilisons le modèle GitFlow adapté pour Vercel.

## Branches Principales

### 1. `main` (Production)
- **Rôle** : Reflète exactement le code en production utilisé par les commerçants.
- **Déploiement** : Chaque merge sur `main` déclenche un déploiement Vercel vers le domaine de production.
- **Protection** : Branche strictement protégée (Branch Protection Rules). Pas de push direct autorisé. Les Pull Requests requièrent une validation (Review) et un passage au vert du CI.

### 2. `develop` (Staging / Intégration)
- **Rôle** : La branche de pré-production. Elle contient toutes les nouvelles fonctionnalités testées, en attente de déploiement final.
- **Déploiement** : Déploie sur l'environnement Preview de Vercel. Connecté à la base de données Supabase de Dev.
- **Protection** : Protégée. Pas de push direct.

## Branches Ephémères

### 3. `feature/*` (Nouvelle Fonctionnalité)
- **Créée depuis** : `develop`
- **Fusionnée vers** : `develop`
- **Exemple** : `feature/export-pdf-rapports`
- **Workflow** : Le développeur tire une branche, fait ses commits, ouvre une PR vers `develop`.

### 4. `bugfix/*` (Correction Mineure)
- **Créée depuis** : `develop`
- **Fusionnée vers** : `develop`
- **Exemple** : `bugfix/arrondi-caisse`

### 5. `hotfix/*` (Correction d'Urgence en Production)
- **Créée depuis** : `main`
- **Fusionnée vers** : `main` ET `develop` (pour ne pas perdre la correction lors de la prochaine release).
- **Rôle** : Uniquement pour les bugs critiques en production nécessitant une intervention immédiate (ex: crash du POS).

## Le Cycle de Vie d'une Fonctionnalité

1. Un ticket (Jira/GitHub Issue) est créé.
2. Le dev crée `feature/mon-ticket` depuis `develop`.
3. Le dev code, teste localement, et push sa branche. Vercel génère une URL de Preview isolée pour tester.
4. Une PR est ouverte vers `develop`. L'équipe revoit le code.
5. La PR est validée et mergée. Vercel met à jour l'environnement `develop` (Staging).
6. Quand l'équipe juge que le Staging est stable, une Pull Request de Release est générée de `develop` vers `main`.
7. Après fusion sur `main`, la version part en Production (Domaine public).
