# pmobs

Application de révision mobile pour préparer des entretiens en Portfolio Management Oversight au Luxembourg (BEFM / Blackstone, IRE AIFM).

- 290 questions sur 19 thèmes (dont les « Questions ajoutées ») (délégation, Investment Advisors, CSSF, AIFMD II, PE, VC, fonds de fonds, dette privée, immobilier, valorisation, risque, structures, compliance, IA et automatisation, études de cas, anglais)
- **Parcours** : interface ludique, thèmes repliés par défaut avec liste des questions à choisir, XP, série quotidienne, objectif du jour, questions à revoir reposées en fin de session
- **Thèmes / Bilan** : mode classique avec réponse courte, explication détaillée, suivi vert / ambre / non vu, entretien blanc chronométré, notes personnelles

## Utilisation

Ouvrir `index.html` dans un navigateur. La progression est enregistrée dans le navigateur.

## Contenu

- `questions.csv` : toutes les questions, réponses et explications (séparateur `;`, UTF-8)
- `src/data*.js` : banque de questions ; `src/head.html` et `src/app.js` : interface
- `./build.sh` régénère `index.html` ; `node export_csv.js` régénère `questions.csv`
