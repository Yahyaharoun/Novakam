# Gestion des Versions (Semantic Versioning) - NOVAKAM

NOVAKAM suit scrupuleusement les règles du [Semantic Versioning (SemVer)](https://semver.org/lang/fr/).
Les numéros de version sont sous la forme : `MAJOR.MINOR.PATCH` (ex: `1.2.4`).

## Comment la version est calculée ?

Le dépôt GitHub utilise le bot **Release Please** via GitHub Actions.
Lorsqu'une branche est fusionnée sur `main`, Release Please lit l'historique des commits pour déterminer le prochain numéro de version et générer le Changelog.

- **MAJOR (Ex: `1.0.0` -> `2.0.0`)** : Changements majeurs incompatibles ou refonte critique de l'architecture. (Déclenché par `feat!: ...` ou `BREAKING CHANGE: ...` dans un commit).
- **MINOR (Ex: `1.1.0` -> `1.2.0`)** : Nouvelles fonctionnalités rétro-compatibles. (Déclenché par `feat: ...`).
- **PATCH (Ex: `1.1.1` -> `1.1.2`)** : Corrections de bugs rétro-compatibles. (Déclenché par `fix: ...`).

## Processus de Release

1. Des commits (`feat: ...`, `fix: ...`) sont fusionnés de `develop` vers `main`.
2. L'Action GitHub `release-please` crée automatiquement une Pull Request de Release (ex: `chore: release 1.2.0`).
3. Cette PR contient la mise à jour automatique de `package.json` et génère le fichier `CHANGELOG.md`.
4. Le Super Admin valide et fusionne cette PR de Release.
5. GitHub crée un Tag Git (ex: `v1.2.0`) et génère la release officielle.
6. Vercel déploie la version officiellement estampillée en production.

## Statut Actuel
- **v0.9.x** : Phase Bêta. Le logiciel est stable, mais la version majeure `1.0.0` sera déclenchée lors du lancement grand public officiel.
