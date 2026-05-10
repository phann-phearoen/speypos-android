import Database from "better-sqlite3";
import { paths } from "../../src/config/paths.js";
import { SEEDABLE_TABLES } from "./config.js";
import fs from "fs";

// Helper to escape single quotes in SQL strings
const escapeSqlString = (str) => str.replace(/'/g, "''");

function getArg(argName) {
  const arg = process.argv.find((a) => a.startsWith(`${argName}=`));
  if (!arg) return null;
  return arg.split("=")[1];
}

function main() {
  const outFile = getArg("--out");
  const mode = getArg("--mode");

  if (!outFile) {
    console.error(
      "❌ Error: Please provide an output file name using --out=<filename>.sql"
    );
    process.exit(1);
  }

  const dbPath = paths.db.path;
  if (!fs.existsSync(dbPath)) {
    console.error(
      `❌ Error: Database not found at ${dbPath}. Please run the application first to create it.`
    );
    process.exit(1);
  }

  const seedsDir = paths.seeds;
  const outPath = `${seedsDir}/${outFile}`;
  fs.mkdirSync(seedsDir, { recursive: true });

  console.log(`Dumping data from ${dbPath} to ${outPath}...`);

  try {
    const db = new Database(dbPath, { readonly: true });
    let sqlString = "";

    const tablesToDump = mode === "full" ? getAllTableNames(db) : SEEDABLE_TABLES;

    const quote = (str) => `"${str}"`;

    for (const table of tablesToDump) {
      // Check if table exists to prevent errors
      const tableExists = checkTableExists(db, table);

      if (!tableExists) {
        // Only warn if a user-provided table is not found
        if (mode !== "full") {
          console.warn(
            `⚠️  Warning: Table '${table}' from SEEDABLE_TABLES not found. Skipping.`
          );
        }
        continue;
      }

      const rows = db.prepare(`SELECT * FROM ${quote(table)}`).all();
      if (rows.length === 0) continue;

      const columnNames = Object.keys(rows[0]).map(quote).join(", ");

      for (const row of rows) {
        const values = Object.values(row)
          .map((val) => {
            if (val === null) return "NULL";
            if (typeof val === "string")
              return "'" + escapeSqlString(val) + "'";
            return val;
          })
          .join(", ");
        sqlString += `INSERT INTO ${quote(
          table
        )} (${columnNames}) VALUES (${values});\n`;
      }
    }

    fs.writeFileSync(outPath, sqlString);

    console.log(`✅ Successfully dumped data-only SQL to ${outPath}`);
  } catch (error) {
    console.error(`❌ Error during database dump: ${error.message}`);
    process.exit(1);
  }
}

function getAllTableNames(db) {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    )
    .all()
    .map((row) => row.name);
  return tables;
}

function checkTableExists(db, tableName) {
  const result = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
    )
    .get(tableName);
  return !!result;
}

main();
