import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { db } from "./db.js";

dotenv.config();

const app = express();
app.use(helmet({ contentSecurityPolicy: false })); // simple dev-friendly
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(process.cwd(), "public")));

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return res.status(401).set("WWW-Authenticate", "Basic").json({ error: "Auth required" });

  const decoded = Buffer.from(header.replace("Basic ", ""), "base64").toString("utf-8");
  const [u, p] = decoded.split(":");
  if (u !== ADMIN_USER || p !== ADMIN_PASS) return res.status(403).json({ error: "Forbidden" });
  next();
}

const rupiah = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

// ---------- Public API ----------
app.get("/api/products", (req, res) => {
  const q = (req.query.q || "").toString().trim().toLowerCase();
  const category = (req.query.category || "all").toString();
  const size = (req.query.size || "all").toString();
  const sort = (req.query.sort || "newest").toString();

  let rows = db.prepare("SELECT * FROM products").all();

  if (q) {
    rows = rows.filter(p =>
      `${p.title} ${p.brand} ${p.category} ${p.size} ${p.condition}`.toLowerCase().includes(q)
    );
  }
  if (category !== "all") rows = rows.filter(p => p.category === category);
  if (size !== "all") rows = rows.filter(p => p.size === size);

  if (sort === "newest") rows.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  if (sort === "priceAsc") rows.sort((a,b)=> a.price - b.price);
  if (sort === "priceDesc") rows.sort((a,b)=> b.price - a.price);

  res.json(rows);
});

app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT * FROM products WHERE id=?").get(id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

app.post("/api/checkout", (req, res) => {
  const { customer_name, phone, address, items } = req.body || {};
  if (!customer_name || !phone || !address) return res.status(400).json({ error: "Missing customer data" });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Cart empty" });

  // Validate items & stock
  const getProd = db.prepare("SELECT * FROM products WHERE id=?");
  const updStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id=? AND stock >= ?");
  const insOrder = db.prepare("INSERT INTO orders (customer_name, phone, address, total) VALUES (?,?,?,?)");
  const insItem = db.prepare("INSERT INTO order_items (order_id, product_id, title, price, qty) VALUES (?,?,?,?,?)");

  let computedTotal = 0;

  const tx = db.transaction(() => {
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.qty);
      if (!pid || !qty || qty <= 0) throw new Error("Invalid cart item");

      const p = getProd.get(pid);
      if (!p) throw new Error("Product not found");
      if (p.stock < qty) throw new Error(`Stock not enough: ${p.title}`);

      computedTotal += p.price * qty;

      const ok = updStock.run(qty, pid, qty).changes;
      if (!ok) throw new Error(`Stock update failed: ${p.title}`);
    }

    const orderId = insOrder.run(customer_name, phone, address, computedTotal).lastInsertRowid;

    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.qty);
      const p = getProd.get(pid);
      insItem.run(orderId, pid, p.title, p.price, qty);
    }

    return orderId;
  });

  try {
    const orderId = tx();
    res.json({ ok: true, order_id: orderId, total: computedTotal, total_formatted: rupiah(computedTotal) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || "Checkout failed" });
  }
});

// ---------- Admin API ----------
app.get("/api/admin/products", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const b = req.body || {};
  const required = ["title","brand","category","size","condition","price","stock","description"];
  for (const k of required) if (b[k] === undefined || b[k] === "") return res.status(400).json({ error: `Missing ${k}` });

  const st = db.prepare(`
    INSERT INTO products (title,brand,category,size,condition,price,stock,description)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  const info = st.run(b.title, b.brand, b.category, b.size, b.condition, Number(b.price), Number(b.stock), b.description);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const st = db.prepare(`
    UPDATE products SET
      title=?,
      brand=?,
      category=?,
      size=?,
      condition=?,
      price=?,
      stock=?,
      description=?
    WHERE id=?
  `);
  const ch = st.run(b.title, b.brand, b.category, b.size, b.condition, Number(b.price), Number(b.stock), b.description, id).changes;
  if (!ch) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const ch = db.prepare("DELETE FROM products WHERE id=?").run(id).changes;
  if (!ch) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running http://localhost:${PORT}`);
});
