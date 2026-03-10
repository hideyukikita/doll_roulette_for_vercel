#!/usr/bin/env node
/**
 * pre の pg_dump --data-only --column-inserts で得た SQL を読み、
 * 新スキーマ用（dolls / outings に image_url なし）の INSERT に変換する。
 * 使い方: node transform-pre-dump-to-new-schema.mjs < backup_pre_data.sql > supabase_data.sql
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";

const stdin = process.stdin;

// INSERT INTO ... (col1, col2, ...) VALUES (...); をパース
function parseInsert(line) {
  const match = line.match(/^INSERT INTO (?:\w+\.)?(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\);?\s*$/);
  if (!match) return null;
  const [, table, colsStr, valuesStr] = match;
  const cols = colsStr.split(",").map((c) => c.trim());
  const values = parseValues(valuesStr);
  if (values.length !== cols.length) return null;
  return { table, cols, values };
}

/** pg_dump の VALUES 部分をパース（'...', NULL, true, false の並び） */
function parseValues(str) {
  const out = [];
  let i = 0;
  const s = str.trim();
  while (i < s.length) {
    const rest = s.slice(i).trimStart();
    i = s.length - rest.length;
    if (rest.length === 0) break;
    if (rest[0] === "'") {
      let end = 1;
      while (end < rest.length) {
        const idx = rest.indexOf("'", end);
        if (idx === -1) break;
        if (rest[idx + 1] === "'") {
          end = idx + 2;
          continue;
        }
        end = idx;
        break;
      }
      out.push(rest.slice(0, end + 1).trim());
      i += end + 1;
    } else if (rest.startsWith("NULL")) {
      out.push("NULL");
      i += 4;
    } else if (rest.startsWith("true")) {
      out.push("true");
      i += 4;
    } else if (rest.startsWith("false")) {
      out.push("false");
      i += 5;
    } else {
      const nextComma = rest.indexOf(", ");
      const nextParen = rest.indexOf(")");
      const end =
        nextComma === -1 ? (nextParen === -1 ? rest.length : nextParen) : nextParen === -1 ? nextComma : Math.min(nextComma, nextParen);
      out.push(rest.slice(0, end).trim());
      i += end;
    }
    const after = s.slice(i).trimStart();
    if (after.startsWith(",")) i = s.length - after.length + 1;
  }
  return out;
}

/** 既に SQL の値形式の配列をそのまま JOIN。新規生成する値だけ文字列で渡す場合は quote する */
function buildInsert(table, cols, values) {
  const vals = values.map((v) => (typeof v === "string" && v !== "NULL" && !/^(true|false)$/.test(v) && !v.startsWith("'") ? `'${v.replace(/'/g, "''")}'` : v)).join(", ");
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals});`;
}

async function main() {
  const rl = createInterface({ input: stdin, crlfDelay: Infinity });
  const { randomUUID } = await import("crypto");

  for await (const line of rl) {
    const parsed = parseInsert(line.trim());
    if (!parsed) {
      console.log(line);
      continue;
    }
    const { table, cols, values } = parsed;

    if (table === "dolls") {
      const idxImage = cols.indexOf("image_url");
      const newCols = idxImage === -1 ? cols : cols.filter((_, i) => i !== idxImage);
      const newVals = idxImage === -1 ? values : values.filter((_, i) => i !== idxImage);
      console.log(buildInsert("dolls", newCols, newVals));
      if (idxImage !== -1 && values[idxImage] !== "NULL" && values[idxImage] !== "''") {
        const idIdx = cols.indexOf("id");
        const dollId = idIdx >= 0 ? values[idIdx] : null;
        if (dollId) {
          const imgId = "'" + randomUUID() + "'";
          const imgUrl = values[idxImage];
          console.log(buildInsert("doll_images", ["id", "doll_id", "image_url", "sort_order"], [imgId, dollId, imgUrl, "0"]));
        }
      }
      continue;
    }

    if (table === "outings") {
      const idxImage = cols.indexOf("image_url");
      const newCols = idxImage === -1 ? cols : cols.filter((_, i) => i !== idxImage);
      const newVals = idxImage === -1 ? values : values.filter((_, i) => i !== idxImage);
      console.log(buildInsert("outings", newCols, newVals));
      if (idxImage !== -1 && values[idxImage] !== "NULL" && values[idxImage] !== "''") {
        const idIdx = cols.indexOf("id");
        const outingId = idIdx >= 0 ? values[idIdx] : null;
        if (outingId) {
          const imgId = "'" + randomUUID() + "'";
          const imgUrl = values[idxImage];
          console.log(buildInsert("outing_images", ["id", "outing_id", "image_url", "sort_order"], [imgId, outingId, imgUrl, "0"]));
        }
      }
      continue;
    }

    console.log(line);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
