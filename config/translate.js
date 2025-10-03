import fs from "fs";
import path from "path";
import { glob } from "glob";
import { OpenAI } from "openai";
import { createHash } from "crypto";
import { autoTranslatedLanguages, defaultLanguage } from "./config-app.js";
import dotenv from "dotenv";

dotenv.config();

// Chemins
const LOCALES_PATH = path.resolve("content");

// Initialisation de l'API Open AI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Expression régulière pour détecter les URLs
const urlRegex =
  /^(https?:\/\/|www\.|\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/|$))[^\s]*$/i;

// Expression régulière pour détecter les placeholders (ex: {{variable}})
const placeholderRegex = /\{\{.*?\}\}/;

// Liste des valeurs à exclure explicitement de la traduction
const EXCLUDED_VALUES = new Set([
  "2025",
  "2024",
  "2023",
  "", // Chaînes vides
]);

// Fonction pour vérifier si une chaîne est une URL
function isUrl(value) {
  return urlRegex.test(value);
}

// Fonction pour vérifier si une chaîne est un placeholder
function isPlaceholder(value) {
  return placeholderRegex.test(value);
}

// Fonction pour vérifier si une clé est technique (plus précise)
function isTechnicalKey(key) {
  // Ne considérer comme technique que les clés qui correspondent exactement à des termes techniques
  return /^(api_key|id|token|url|path|src|href)$/i.test(key);
}

// Fonction pour vérifier si une valeur est du texte à traduire
function shouldTranslateValue(value) {
  // Vérifier si c'est une chaîne valide
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  // Ne pas traduire si c'est une URL ou un placeholder
  if (isUrl(value) || isPlaceholder(value)) {
    return false;
  }

  // Ne pas traduire si la valeur est dans la liste des exclusions
  if (EXCLUDED_VALUES.has(value.trim())) {
    return false;
  }

  // Traduire tout le reste
  return true;
}

// Fonction pour lire un fichier JSON
function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Fichier introuvable : ${filePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Fonction pour écrire un fichier JSON
function writeJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Fichier généré : ${filePath}`);
}

// Fonction pour obtenir le hash d'un fichier (pour le cache)
function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(
      `[getFileHash] Fichier non trouvé : ${filePath}, retourne null`
    );
    return null;
  }
  const content = fs.readFileSync(filePath, "utf8");
  const hash = createHash("md5").update(content).digest("hex");
  console.log(`[getFileHash] Hachage calculé pour ${filePath} : ${hash}`);
  return hash;
}

// Fonction pour générer un nom de fichier de cache unique
function getCacheFileName(sourceFilePath, targetLang) {
  // Remplacer les slashes par des underscores pour éviter les problèmes de chemin
  const relativePath = path
    .relative(LOCALES_PATH, sourceFilePath)
    .replace(`${defaultLanguage}.json`, "") // Enlever "en.json"
    .replace(/[/\\]/g, "_") // Remplacer les slashes par des underscores
    .replace(/\.json$/, ""); // Enlever l'extension .json si elle reste
  return `${relativePath}.${targetLang}.hash`;
}

// Fonction pour vérifier si un fichier a changé (en comparant avec le cache)
function hasFileChanged(sourceFilePath, targetLang) {
  const targetFilePath = sourceFilePath.replace(
    `${defaultLanguage}.json`,
    `${targetLang}.json`
  );
  const cacheDir = path.join(LOCALES_PATH, ".cache");
  const cacheFileName = getCacheFileName(sourceFilePath, targetLang);
  const cacheFile = path.join(cacheDir, cacheFileName);
  const sourceHash = getFileHash(sourceFilePath);

  console.log(
    `[hasFileChanged] Vérification pour ${sourceFilePath} -> ${targetLang}`
  );
  console.log(
    `[hasFileChanged] Fichier cible existe : ${fs.existsSync(targetFilePath)}`
  );
  console.log(`[hasFileChanged] Fichier de cache : ${cacheFile}`);
  console.log(
    `[hasFileChanged] Fichier de cache existe : ${fs.existsSync(cacheFile)}`
  );

  if (!fs.existsSync(targetFilePath)) {
    console.log(
      `[hasFileChanged] Fichier cible n'existe pas, traduction nécessaire : ${targetFilePath}`
    );
    return true;
  }

  if (!fs.existsSync(cacheFile)) {
    console.log(
      `[hasFileChanged] Fichier de cache n'existe pas, traduction nécessaire : ${cacheFile}`
    );
    return true;
  }

  try {
    const cachedHash = fs.readFileSync(cacheFile, "utf8").trim(); // Ajout de trim() pour éviter les espaces
    console.log(
      `[hasFileChanged] Hachage actuel : ${sourceHash}, Hachage en cache : ${cachedHash}`
    );
    if (cachedHash === sourceHash) {
      console.log(
        `[hasFileChanged] Fichier inchangé : ${sourceFilePath} pour ${targetLang}`
      );
      return false;
    } else {
      console.log(
        `[hasFileChanged] Fichier modifié (hachage différent) : ${sourceFilePath} pour ${targetLang}`
      );
      return true;
    }
  } catch (error) {
    console.error(
      `[hasFileChanged] Erreur lors de la lecture du fichier de cache ${cacheFile} : ${error.message}`
    );
    return true; // Si le cache est corrompu, on retraduit
  }
}

// Fonction pour traduire un seul texte via Open AI
async function translateSingleText(text, targetLang) {
  try {
    const prompt = `Translate the following text (and keep <br> inside text if you find it) from ${defaultLanguage} to ${targetLang}:\n\n${text}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Do not translate URLs, placeholders (like {{variable}}), or technical terms but keep <br> inside text if you find it",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 14000, // Augmenté pour éviter la troncature
      temperature: 0.3,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(
      `Erreur lors de la traduction de "${text}" en ${targetLang} : ${error.message}`
    );
    return text; // Retourne le texte original en cas d'erreur
  }
}

// Fonction pour traduire un lot de textes (un par un)
async function translateBatch(texts, targetLang) {
  const translatedTexts = [];
  for (const text of texts) {
    const translatedText = await translateSingleText(text, targetLang);
    translatedTexts.push(translatedText);
  }
  return translatedTexts;
}

// Fonction pour traduire un objet JSON (support des objets imbriqués)
async function translateObject(
  obj,
  targetLang,
  sourceFilePath,
  targetFilePath
) {
  const translatedObj = {};
  const textsToTranslate = [];
  const keysToTranslate = [];

  // Parcourir l'objet pour collecter les textes à traduire
  const collectTexts = (currentObj, prefix = "") => {
    for (const [key, value] of Object.entries(currentObj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") {
        if (isUrl(value)) {
          translatedObj[fullKey] = value;
          console.log(`Valeur non traduite (URL) : ${value}`);
        } else if (isPlaceholder(value)) {
          translatedObj[fullKey] = value;
          console.log(`Valeur non traduite (placeholder) : ${value}`);
        } else if (isTechnicalKey(key)) {
          translatedObj[fullKey] = value;
          console.log(
            `Valeur non traduite (clé technique) : ${key} -> ${value}`
          );
        } else if (!shouldTranslateValue(value)) {
          translatedObj[fullKey] = value;
          console.log(`Valeur non traduite (exclue) : ${value}`);
        } else {
          textsToTranslate.push(value);
          keysToTranslate.push(fullKey);
        }
      } else if (typeof value === "object" && value !== null) {
        collectTexts(value, fullKey);
      } else {
        translatedObj[fullKey] = value;
      }
    }
  };

  collectTexts(obj);

  // Traduire les textes par lot
  let translatedTexts = [];
  if (textsToTranslate.length > 0) {
    console.log(
      `[translateObject] Traduction de ${textsToTranslate.length} textes pour ${targetFilePath}`
    );
    translatedTexts = await translateBatch(textsToTranslate, targetLang);
  } else {
    console.log(
      `[translateObject] Aucun texte à traduire pour ${targetFilePath}`
    );
  }

  // Reconstruire l'objet traduit
  textsToTranslate.forEach((_, index) => {
    const key = keysToTranslate[index];
    const translatedValue = translatedTexts[index];
    const keys = key.split(".");
    let current = translatedObj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) current[k] = {};
      current = current[k];
    }
    current[keys[keys.length - 1]] = translatedValue;
  });

  // Convertir l'objet plat en objet imbriqué
  const finalObj = {};
  for (const [key, value] of Object.entries(translatedObj)) {
    const keys = key.split(".");
    let current = finalObj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) current[k] = {};
      current = current[k];
    }
    current[keys[keys.length - 1]] = value;
  }

  writeJSON(targetFilePath, finalObj);
}

// Fonction pour traduire un fichier JSON
async function translateJSONFile(sourceFilePath, targetLang) {
  const targetFilePath = sourceFilePath.replace(
    `${defaultLanguage}.json`,
    `${targetLang}.json`
  );

  const sourceData = readJSON(sourceFilePath);
  if (!sourceData) return;

  console.log(
    `[translateJSONFile] Traduction de ${sourceFilePath} vers ${targetFilePath}`
  );
  await translateObject(sourceData, targetLang, sourceFilePath, targetFilePath);

  // Mettre à jour le cache
  const cacheDir = path.join(LOCALES_PATH, ".cache");
  const cacheFileName = getCacheFileName(sourceFilePath, targetLang);
  const cacheFile = path.join(cacheDir, cacheFileName);
  const sourceHash = getFileHash(sourceFilePath);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFile, sourceHash, "utf8");
  console.log(
    `[translateJSONFile] Cache mis à jour pour ${targetFilePath} : ${cacheFile}`
  );
}

// Fonction principale pour générer les traductions
async function generateTranslations() {
  console.log("Génération des traductions automatiques...");

  if (!autoTranslatedLanguages || autoTranslatedLanguages.length === 0) {
    console.log("Aucune langue à traduire automatiquement.");
    return;
  }

  const sourceFiles = glob.sync(`**/${defaultLanguage}.json`, {
    cwd: LOCALES_PATH,
  });
  if (sourceFiles.length === 0) {
    console.warn(
      `Aucun fichier de traduction trouvé pour la langue par défaut (${defaultLanguage}).`
    );
    return;
  }

  console.log(
    `[generateTranslations] ${sourceFiles.length} fichiers sources trouvés : ${sourceFiles}`
  );

  for (const lang of autoTranslatedLanguages) {
    console.log(`Traduction en ${lang}...`);
    // Filtrer les fichiers qui ont changé
    const filesToTranslate = sourceFiles.filter((file) => {
      const sourceFilePath = path.join(LOCALES_PATH, file);
      const hasChanged = hasFileChanged(sourceFilePath, lang);
      if (!hasChanged) {
        console.log(
          `[generateTranslations] Fichier inchangé, ignoré : ${sourceFilePath} pour ${lang}`
        );
      } else {
        console.log(
          `[generateTranslations] Fichier à traduire : ${sourceFilePath} pour ${lang}`
        );
      }
      return hasChanged;
    });

    if (filesToTranslate.length === 0) {
      console.log(`Aucun fichier à traduire pour ${lang}.`);
      continue;
    }

    console.log(
      `[generateTranslations] ${filesToTranslate.length} fichiers à traduire pour ${lang} : ${filesToTranslate}`
    );
    for (const file of filesToTranslate) {
      const sourceFilePath = path.join(LOCALES_PATH, file);
      await translateJSONFile(sourceFilePath, lang);
    }
  }

  console.log("Traductions automatiques terminées !");
}

// Exécuter la génération des traductions
generateTranslations().catch((error) => {
  console.error("Erreur lors de la génération des traductions :", error);
  process.exit(1);
});
