# pmobs

Application de révision mobile pour préparer des entretiens en Portfolio Management Oversight au Luxembourg (BEFM / Blackstone, IRE AIFM).

- 211 questions sur 18 thèmes (délégation, Investment Advisors, CSSF, AIFMD II, PE, VC, fonds de fonds, dette privée, immobilier, valorisation, risque, structures, compliance, IA et automatisation, études de cas, anglais)
- Réponse courte, explication détaillée, suivi vert / ambre / non vu, bilan par thème, entretien blanc chronométré, notes personnelles

## Utilisation

Ouvrir `index.html` dans un navigateur. La progression est enregistrée dans le navigateur.

## Modifier le contenu

Les questions sont dans `src/data*.js`, l'interface dans `src/head.html` et `src/app.js`. Après modification, lancer `./build.sh` pour régénérer `index.html`.
