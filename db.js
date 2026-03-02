import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "thrift.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);

// init schema
const schema = fs.readFileSync(path.join(process.cwd(), "schema.sql"), "utf-8");
db.exec(schema);

// seed minimal products if empty
const count = db.prepare("SELECT COUNT(*) as c FROM products").get().c;
if (count === 0) {
  const ins = db.prepare(`
    INSERT INTO products (title, brand, category, size, condition, price, stock, description)
    VALUES (@title,@brand,@category,@size,@condition,@price,@stock,@description)
  `);

  const seed = [
    { title:"Jaket Denim Vintage", brand:"Levi's", category:"Jaket", size:"L", condition:"Very Good", price:189000, stock:1, description:"Denim tebal, fade natural. Jahitan aman." },
    { title:"Hoodie Oversize", brand:"Uniqlo", category:"Hoodie", size:"XL", condition:"Good", price:129000, stock:2, description:"Hangat, nyaman. Ada pilling ringan." },
    { title:"Kemeja Flanel Kotak", brand:"H&M", category:"Kemeja", size:"M", condition:"Like New", price:99000, stock:1, description:"Flanel lembut, kondisi sangat bagus." },
    { title:"Celana Chino Slim", brand:"Gap", category:"Celana", size:"32", condition:"Very Good", price:139000, stock:1, description:"Chino rapi untuk casual/kantor." }
  ];
  const tx = db.transaction((rows) => rows.forEach(r => ins.run(r)));
  tx(seed);
}
