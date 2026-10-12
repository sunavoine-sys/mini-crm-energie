# DMS CRM

CRM de courtage en énergie de Dynamic Makers Sales. Interface React branchée sur le modèle Supabase `crm_*`.

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** et composants **shadcn/ui** (Radix), dans `src/components/ui`
- **Motion** (Framer Motion) pour les animations et les ressorts partagés (`src/lib/motion.ts`)
- **TanStack Query** pour le cache, les mises à jour optimistes et les états de chargement
- **Sonner** pour les notifications, **Geist** pour la typographie

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de production dans dist/
npm run lint
```

Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sont facultatives (voir `.env.example`). Sans elles, l'app utilise le projet `crm-energie`. La clé publishable est publique par conception : l'accès aux données repose sur les politiques RLS (un commercial voit ses dossiers, un admin voit tout).

## Déploiement Vercel

Importer le dépôt dans Vercel : `vercel.json` déclare le framework, la commande de build, le dossier `dist`, la réécriture SPA et les en-têtes de cache et de sécurité. Aucune variable n'est obligatoire.

## Organisation

```
src/
  components/ui/     primitives shadcn (button, dialog, select…)
  components/app/    briques métier partagées (badge d'étape, menus…)
  features/          auth · clients · sites · tasks · documents
  lib/               client Supabase, types, pipeline (stages.ts), formatage
  hooks/             thème, raccourcis clavier, état d'URL
legacy/index.html    ancienne version HTML (tables legacy clients/rappels), conservée pour référence
```

## Règles métier respectées côté base

- **Pipeline unique** dans `crm_clients.stage` : `prospect → factures → acd → offre → signe` (+ `perdu`).
- Les changements d'étape sont journalisés par trigger (`crm_activities`), et passer en signé ou perdu clôt les actions ouvertes.
- **Une seule action ouverte par client** : en créer une ferme la précédente (trigger `crm_tasks_one_open`).
- Les documents sont stockés dans le bucket `Documents/{client_id}/{timestamp}_{nom}`. Les ACD signées ne peuvent être supprimées que par un admin.

## Raccourcis

`/` rechercher · `N` nouveau client · `E` modifier le dossier · `Échap` fermer le dossier · `⌘↵` enregistrer un formulaire
