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

## Modules 2 à 7 (cas pratiques fictifs)

Onglet « Modules » de l'application. Le module 1 reste le parcours de flashcards.

| Module | Contenu | Cas |
|---|---|---|
| 2 Quiz pièges | QCM à 4 réponses, distracteurs crédibles, explication immédiate | 49 |
| 3 Analyse de portefeuille | Coche les anomalies, puis décide s'il faut escalader | 50 |
| 4 Décisions et escalade | Incident à embranchements (3 décisions), conséquences en fin de partie | 48 |
| 6 Atelier KPI et scorecards | Classer KPI/KRI/contrôle/escalade, fixer des seuils, noter un délégataire | 49 |
| 7 Oversight Challenge | Scénario + tuiles KPI + question A à D + bonne réponse | 50 |

Sources : `src/gd*.js` (données), `src/jeux.js` (moteur). Progression synchronisée avec le compte (clé `m`). Le module 5 n'a pas été défini.

## Langue FR / EN
Le bouton `EN` / `FR` de la barre du bas bascule toute l'application (flashcards, cas pratiques, interface). Le choix est mémorisé sur l'appareil. Sources : `src/en*.js` (flashcards en anglais), `src/ge*.js` (cas en anglais), `src/i18n.js` (interface et bascule). Le français reste la langue par défaut.
