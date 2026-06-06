import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const dataDir = path.join(repoRoot, "data");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false }
});

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const [headerLine, ...rows] = lines;

  if (!headerLine) return [];

  const headers = parseCsvLine(headerLine);

  return rows.map((row) => {
    const values = parseCsvLine(row);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

const allFiles = await readdir(dataDir);
const csvFiles = allFiles
  .filter((file) => /^recent_orders_\d{4}-\d{2}-\d{2}\.csv$/.test(file))
  .sort();

if (!csvFiles.length) {
  console.error("No dated recent_orders CSV files found in data/.");
  process.exit(1);
}

const rows = [];

for (const file of csvFiles) {
  const filePath = path.join(dataDir, file);
  const text = await readFile(filePath, "utf8");
  const parsedRows = parseCsv(text);

  for (const row of parsedRows) {
    rows.push({
      order_date: row.order_date || null,
      item_name: row.item_name,
      quantity: row.quantity || null,
      unit: row.unit || null,
      category: row.category || null,
      notes: row.notes || null,
      source_type: "repo_csv",
      source_name: file
    });
  }
}

const deleted = await supabase.from("order_history_items").delete().eq("source_type", "repo_csv");
if (deleted.error) {
  console.error("Failed clearing existing repo_csv order history:", deleted.error.message);
  process.exit(1);
}

const chunkSize = 500;
for (let index = 0; index < rows.length; index += chunkSize) {
  const chunk = rows.slice(index, index + chunkSize);
  const inserted = await supabase.from("order_history_items").insert(chunk);

  if (inserted.error) {
    console.error("Failed inserting order history:", inserted.error.message);
    process.exit(1);
  }
}

console.log(`Seeded ${rows.length} order history rows from ${csvFiles.length} repo CSV files.`);
