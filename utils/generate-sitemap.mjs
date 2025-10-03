// utils/generate-sitemap.mjs
import fs from "fs";
import path from "path";
import xml from "xml";
import { baseUrl } from "../config/config-app.js";

// 📁 Dossier des pages générées
const pagesDir = path.join(process.cwd(), "dist");

// ❌ Nom du dossier à exclure (ex: "modals")
const EXCLUDED_FOLDER = "modals";

// 🔁 Fonction récursive pour récupérer tous les fichiers "index.html"
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const isDirectory = fs.statSync(filePath).isDirectory();

    if (isDirectory) {
      // Exclure les dossiers dont le nom correspond à EXCLUDED_FOLDER
      if (path.basename(filePath) !== EXCLUDED_FOLDER) {
        getFiles(filePath, fileList);
      }
    } else if (file === "index.html") {
      const relativePath = filePath.replace(pagesDir, "").replace(/\\/g, "/");

      // Ne pas inclure les fichiers dont le chemin commence par /modals
      if (!relativePath.startsWith(`/${EXCLUDED_FOLDER}/`)) {
        fileList.push(relativePath);
      }
    }
  });

  return fileList;
}

// 📄 Récupérer tous les fichiers index.html valides
const files = getFiles(pagesDir);

// 🌐 Détection des langues
const rootStructure = new Set();
const languages = new Set();

files.forEach((file) => {
  const parts = file.split("/").filter(Boolean);
  if (parts.length === 1) {
    rootStructure.add(parts[0]);
  } else if (!rootStructure.has(parts[0])) {
    languages.add(parts[0]);
  }
});

// 🔗 Construction des URLs avec gestion des priorités
const urlSet = new Set();
const urls = [];

files.forEach((file) => {
  const route = file.replace("/index.html", "");
  const fullUrl = `${baseUrl}${route}`;

  if (!urlSet.has(fullUrl)) {
    urlSet.add(fullUrl);

    const parts = route.split("/").filter(Boolean);
    const isLang = parts.length > 0 && languages.has(parts[0]);

    let priority;
    if (parts.length === 0 || (parts.length === 1 && isLang)) {
      priority = 1.0;
    } else if (parts.length === 1 || (parts.length === 2 && isLang)) {
      priority = 0.9;
    } else {
      priority = 0.8;
    }

    urls.push({
      loc: fullUrl,
      changefreq: "weekly",
      priority,
      lastmod: new Date().toISOString(),
    });
  }
});

// 📊 Tri des URLs par priorité décroissante puis par ordre alphabétique
urls.sort((a, b) => {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.loc.localeCompare(b.loc);
});

// 🧾 Génération du sitemap XML
const sitemap = xml(
  [
    {
      urlset: [
        { _attr: { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" } },
        ...urls.map((url) => ({
          url: [
            { loc: url.loc },
            { changefreq: url.changefreq },
            { priority: url.priority.toFixed(1) },
            { lastmod: url.lastmod },
          ],
        })),
      ],
    },
  ],
  { declaration: true }
);

// 💾 Écriture dans le fichier sitemap.xml
fs.writeFileSync("sitemap.xml", sitemap);

console.log("✅ Sitemap généré avec succès, dossier 'modals' exclu !");
