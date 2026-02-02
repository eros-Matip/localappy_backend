import fs from "fs";
import path from "path";
import csv from "csv-parser";

const INPUT_CSV = path.resolve(
  process.cwd(),
  "data/rna_waldec_20250401_dpt_64.csv",
);
const OUTPUT_JSON = path.resolve(
  process.cwd(),
  "data/associations_dpt_64.json",
);

const normalize = (v: string) =>
  (v ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function pick(row: any, keys: string[]) {
  for (const k of keys) {
    if (
      row[k] !== undefined &&
      row[k] !== null &&
      String(row[k]).trim() !== ""
    ) {
      return row[k];
    }
  }
  return null;
}

function detectSeparator(filePath: string): "," | ";" {
  const firstLine = fs.readFileSync(filePath, "utf-8").split(/\r?\n/)[0] || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

const extractRnaW = (text: string | null) => {
  if (!text) return null;
  const m = String(text).match(/W\d{9}/);
  return m ? m[0] : null;
};

const clean = (v: any) =>
  v === null || v === undefined ? "" : String(v).trim();

function buildAddress(row: any) {
  // Bloc "adrs_*" (adresse structurée)
  const adrs_complement = pick(row, ["adrs_complement", "ADRS_COMPLEMENT"]);
  const adrs_numvoie = pick(row, ["adrs_numvoie", "ADRS_NUMVOIE"]);
  const adrs_repetition = pick(row, ["adrs_repetition", "ADRS_REPETITION"]);
  const adrs_typevoie = pick(row, ["adrs_typevoie", "ADRS_TYPEVOIE"]);
  const adrs_libvoie = pick(row, ["adrs_libvoie", "ADRS_LIBVOIE"]);
  const adrs_distrib = pick(row, ["adrs_distrib", "ADRS_DISTRIB"]);

  const line1 = [adrs_numvoie, adrs_repetition, adrs_typevoie, adrs_libvoie]
    .filter((x) => clean(x) !== "")
    .map(clean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const partsAdrs = [adrs_complement, line1, adrs_distrib]
    .filter((x) => clean(x) !== "")
    .map(clean)
    .join(", ")
    .trim();

  // Fallback "adrg_*" (adresse de gestion)
  const adrg_complemgeo = pick(row, ["adrg_complemgeo", "ADRG_COMPLEMGEO"]);
  const adrg_libvoie = pick(row, ["adrg_libvoie", "ADRG_LIBVOIE"]);
  const adrg_distrib = pick(row, ["adrg_distrib", "ADRG_DISTRIB"]);

  const partsAdrg = [adrg_complemgeo, adrg_libvoie, adrg_distrib]
    .filter((x) => clean(x) !== "")
    .map(clean)
    .join(", ")
    .trim();

  // Ancien format "adr1/adr2/adr3" en dernier recours
  const adr1 = pick(row, ["adr1", "ADR1"]);
  const adr2 = pick(row, ["adr2", "ADR2"]);
  const adr3 = pick(row, ["adr3", "ADR3"]);
  const partsOld = [adr1, adr2, adr3]
    .filter((x) => clean(x) !== "")
    .map(clean)
    .join(", ")
    .trim();

  return partsAdrs || partsAdrg || partsOld || null;
}

async function run() {
  if (!fs.existsSync(INPUT_CSV)) {
    throw new Error(`CSV introuvable: ${INPUT_CSV}`);
  }

  const separator = detectSeparator(INPUT_CSV);

  const associations: any[] = [];
  let rowCount = 0;

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(INPUT_CSV)
      .pipe(csv({ separator }))
      .on("headers", (headers) => {
        console.log("CSV headers:", headers);
      })
      .on("data", (row) => {
        rowCount++;

        // Identifiants
        const internalId = pick(row, ["id", "﻿id"]); // souvent RNA dans WALDEC (ex: W641000001)
        const externalId = pick(row, ["id_ex", "ID_EX"]);
        const siret = pick(row, ["siret", "SIRET"]);

        // Texte
        const name = pick(row, ["titre", "TITRE"]);
        const objet = pick(row, ["objet", "OBJET"]);
        const observation = pick(row, ["observation", "OBSERVATION"]);
        const position = pick(row, ["position", "POSITION"]);

        // Ville / CP : WALDEC utilise adrs_libcommune / adrs_codepostal
        const zipRaw = pick(row, [
          "adrs_codepostal",
          "ADRS_CODEPOSTAL",
          "adrg_codepostal",
          "ADRG_CODEPOSTAL",
        ]);
        const cityRaw = pick(row, [
          "adrs_libcommune",
          "ADRS_LIBCOMMUNE",
          "adrg_achemine",
          "ADRG_ACHEMINE",
        ]);

        const zip = zipRaw ? clean(zipRaw) : "";
        const city = cityRaw ? normalize(clean(cityRaw)) : "";

        // Adresse
        const address = buildAddress(row);

        // RNA : dans WALDEC, `id` est souvent déjà W#########
        const idStr = internalId ? clean(internalId) : null;
        const rna =
          idStr && /^W\d{9}$/.test(idStr) ? idStr : extractRnaW(observation);

        associations.push({
          id: idStr,
          idEx: externalId ? clean(externalId) : null,
          rna: rna || null,
          siret: siret ? clean(siret) : null,

          name: name ? clean(name) : null,
          objet: objet ? clean(objet) : null,

          city,
          zip,
          address,

          position: position ? clean(position) : null,
          // utile au debug, tu peux l'enlever après
          observation: observation ? clean(observation) : null,
        });
      })
      .on("end", () => resolve())
      .on("error", reject);
  });

  console.log("Rows read:", rowCount);
  console.log("Example:", associations[0]);

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(associations, null, 2), "utf-8");
  console.log(`✅ Export: ${OUTPUT_JSON} (${associations.length} lignes)`);
}

run().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
