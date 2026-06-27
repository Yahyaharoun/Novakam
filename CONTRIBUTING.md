# Guide de Contribution - NOVAKAM

Merci de contribuer à NOVAKAM ! Pour garantir la stabilité du produit, veuillez respecter ces règles strictes.

## 1. Pas de Push Direct sur `main` ou `develop`
- La branche `main` est protégée. Elle ne reçoit que des fusions (Merge) provenant de `develop` (pour les Releases) ou de `hotfix/*`.
- La branche `develop` est protégée. Elle ne reçoit que des fusions de branches `feature/*` ou `bugfix/*` validées par Pull Request (PR).

## 2. Nommage des Branches
Utilisez toujours les préfixes suivants :
- `feature/nom-de-la-fonctionnalite` (Ex: `feature/export-excel-rapports`)
- `bugfix/description-du-bug` (Ex: `bugfix/calcul-tva-caisse`)
- `hotfix/description-critique` (Ex: `hotfix/crash-login-mobile`)

## 3. Pull Requests (PR)
- Chaque PR doit être liée à un ticket ou une issue.
- La PR doit passer le CI (Lint, Typecheck, Build) avant de pouvoir être fusionnée.
- La revue de code par au moins un autre développeur Senior est obligatoire.

## 4. Nommage des Commits (Conventional Commits)
Le CI utilise `release-please` qui analyse les messages de commit pour versionner l'application. Utilisez le format :
- `feat: ajout du paiement Mobile Money` (Nouvelle fonctionnalité -> Mineure)
- `fix: correction du décalage bouton` (Bugfix -> Patch)
- `docs: mise à jour du readme`
- `chore: mise à jour des dépendances`
- `refactor: nettoyage du store Zustand`

## 5. Qualité du Code
- Typage Strict : Pas de `any` sauf si absolument nécessaire et commenté.
- Tests : Si vous touchez à la logique de synchronisation Offline (Engine), vérifiez scrupuleusement les effets de bord.
