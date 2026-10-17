// Exporte toutes les questions en CSV (séparateur ;, UTF-8 avec BOM, ouvrable dans Excel)
const fs = require("fs");
const src = ["data1.js", "data2.js", "data3.js", "data4.js"].map(f => fs.readFileSync(__dirname + "/src/" + f, "utf8")).join("\n");
const D = []; new Function("D", src)(D);
const LVL = {1: "Fondamental", 2: "Confirmé", 3: "Expert"}, OFF = {B: "BEFM", I: "IRE AIFM", "": "Les deux"};
const clean = s => s.split("\n").map(l => l.trim()).filter(Boolean).map(l =>
  l.replace(/\*\*/g, "").replace(/^! /, "Piège : ").replace(/^> /, "Ton angle : ").replace(/^§ /, "Réf. : ")).join("\n");
const q = v => '"' + String(v).replace(/"/g, '""') + '"';
const rows = [["ID", "Code thème", "Thème", "Niveau", "Entretien", "Question", "Réponse courte", "Explication détaillée"]];
D.forEach(t => t.q.forEach((r, i) => rows.push([t.id + "-" + (i + 1), t.c, t.n, LVL[r[3] || 1], OFF[r[4] || ""], r[0], r[1], clean(r[2])])));
fs.writeFileSync(__dirname + "/questions.csv", "﻿" + rows.map(r => r.map(q).join(";")).join("\r\n") + "\r\n");
console.log(rows.length - 1, "questions exportées");
