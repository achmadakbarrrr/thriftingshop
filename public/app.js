const rupiah = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);
const el = (id) => document.getElementById(id);

const els = {
  year: el("year"),
  grid: el("productGrid"),
  empty: el("emptyState"),

  q: el("searchInput"),
  cat: el("categoryFilter"),
  size: el("sizeFilter"),
  sort: el("sortSelect"),
  reset: el("resetBtn"),
  emptyReset: el("emptyReset"),

  overlay: el("overlay"),
  drawer: el("cartDrawer"),
  openCart: el("openCart"),
  closeCart: el("closeCart"),

  cartCount: el("cartCount"),
  cartItems: el("cartItems"),
  cartSubtotal: el("cartSubtotal"),
  clearBtn: el("clearBtn"),

  productModal: el("productModal"),
  closeProduct: el("closeProduct"),
  pmTitle: el("pmTitle"),
  pmMeta: el("pmMeta"),
  pmPrice: el("pmPrice"),
  pmDesc: el("pmDesc"),
  pmAdd: el("pmAdd"),

  checkoutOpen: el("checkoutOpen"),
  checkoutModal: el("checkoutModal"),
  closeCheckout: el("closeCheckout"),
  checkoutForm: el("checkoutForm"),
  coName: el("coName"),
  coPhone: el("coPhone"),
  coAddr: el("coAddr"),
  coNote: el("coNote"),

  toast: el("toast"),
};

const LS_KEY = "thrift_cart_v1";

let state = {
  products: [],
  q: "",
  category: "all",
  size: "all",
  sort: "newest",
  cart: loadCart(), // [{product_id, qty}]
  openProductId: null,
};

function toast(msg){
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> els.toast.hidden = true, 1600);
}

function loadCart(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  }catch{ return []; }
}
function saveCart(){ localStorage.setItem(LS_KEY, JSON.stringify(state.cart)); }

function uniq(arr){ return [...new Set(arr)].sort((a,b)=>String(a).localeCompare(String(b))); }
function esc(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---------- UI open/close (single source of truth) ----------
function openOverlay(){ els.overlay.hidden = false; }
function closeAll(){
  els.drawer.hidden = true;
  els.productModal.hidden = true;
  els.checkoutModal.hidden = true;
  els.overlay.hidden = true;
  state.openProductId = null;
}
function closeOverlayIfNothingOpen(){
  const open = !els.drawer.hidden || !els.productModal.hidden || !els.checkoutModal.hidden;
  if (!open) els.overlay.hidden = true;
}
function openCart(){
  openOverlay();
  els.drawer.hidden = false;
  renderCart();
}
function closeCart(){
  els.drawer.hidden = true;
  closeOverlayIfNothingOpen();
}

// ---------- Data ----------
async function fetchProducts(){
  const qs = new URLSearchParams({
    q: state.q,
    category: state.category,
    size: state.size,
    sort: state.sort
  });
  const res = await fetch(`/api/products?${qs.toString()}`);
  state.products = await res.json();
}

async function refreshProducts(){
  await fetchProducts();
  renderFiltersFromProducts();
  renderProducts();
}

function renderFiltersFromProducts(){
  // Build filters from full DB list (request once without filters)
  // Simple approach: fetch all then set options
  // We already have filtered list; to keep easy, request all quickly:
  // (still fine for small shop)
  // If you want efficient, add /api/meta endpoint.

  // We'll fetch all just for filter options once:
  // But to keep simple in this file: only build from current state.products
  const cats = uniq(state.products.map(p=>p.category));
  const sizes = uniq(state.products.map(p=>p.size));

  if (els.cat.options.length <= 1) {
    els.cat.innerHTML = `<option value="all">Semua Kategori</option>` + cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  }
  if (els.size.options.length <= 1) {
    els.size.innerHTML = `<option value="all">Semua Ukuran</option>` + sizes.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  }

  els.cat.value = state.category;
  els.size.value = state.size;
  els.sort.value = state.sort;
  els.q.value = state.q;
}

function card(p){
  return `
    <article class="card">
      <div class="thumb" aria-hidden="true"></div>
      <div class="card__body">
        <div class="title">${esc(p.title)}</div>
        <div class="meta">${esc(p.brand)} • ${esc(p.category)} • Size ${esc(p.size)} • ${esc(p.condition)}</div>
        <div class="row2">
          <div class="price">${rupiah(p.price)}</div>
          <div class="actions">
            <button class="icon" id="view-${p.id}" type="button" aria-label="Detail">👁️</button>
            <button class="btn primary" id="add-${p.id}" type="button" ${p.stock<=0 ? "disabled" : ""}>Tambah</button>
          </div>
        </div>
        <div class="meta">Stock: ${p.stock}</div>
      </div>
    </article>
  `;
}

function renderProducts(){
  els.grid.innerHTML = state.products.map(card).join("");
  els.empty.hidden = state.products.length !== 0;

  state.products.forEach(p=>{
    el(`view-${p.id}`)?.addEventListener("click", ()=> openProduct(p.id));
    el(`add-${p.id}`)?.addEventListener("click", ()=> addToCart(p.id, 1));
  });
}

// ---------- Product modal ----------
function openProduct(id){
  const p = state.products.find(x=>x.id===id) || null;
  if(!p) return;
  state.openProductId = id;

  els.pmTitle.textContent = p.title;
  els.pmMeta.textContent = `${p.brand} • ${p.category} • Size ${p.size} • ${p.condition} • Stock ${p.stock}`;
  els.pmPrice.textContent = rupiah(p.price);
  els.pmDesc.textContent = p.description || "";
  els.pmAdd.disabled = p.stock <= 0;

  openOverlay();
  els.productModal.hidden = false;
}
function closeProduct(){
  state.openProductId = null;
  els.productModal.hidden = true;
  closeOverlayIfNothingOpen();
}

// ---------- Cart ----------
function cartCount(){ return state.cart.reduce((s,it)=>s+it.qty,0); }
function findProduct(pid){ return state.products.find(p=>p.id===pid); }

function addToCart(product_id, qty){
  const p = state.products.find(x=>x.id===product_id);
  if(!p) return;
  if(p.stock <= 0) return toast("Stok habis.");

  const it = state.cart.find(x=>x.product_id===product_id);
  const cur = it ? it.qty : 0;
  const next = Math.min(p.stock, cur + qty);
  if(next <= cur) return toast("Stok tidak cukup.");

  if(it) it.qty = next;
  else state.cart.push({ product_id, qty: next });

  saveCart();
  renderCart();
  toast("Masuk keranjang ✅");
}

function dec(pid){
  const idx = state.cart.findIndex(x=>x.product_id===pid);
  if(idx < 0) return;
  state.cart[idx].qty -= 1;
  if(state.cart[idx].qty <= 0) state.cart.splice(idx,1);
  saveCart(); renderCart();
}

function inc(pid){
  const p = state.products.find(x=>x.id===pid);
  const it = state.cart.find(x=>x.product_id===pid);
  if(!p || !it) return;
  if(it.qty >= p.stock) return toast("Maks sesuai stok.");
  it.qty += 1;
  saveCart(); renderCart();
}

function clearCart(){
  state.cart = [];
  saveCart(); renderCart();
  toast("Keranjang dikosongkan.");
}

function subtotal(){
  return state.cart.reduce((sum,it)=>{
    const p = state.products.find(x=>x.id===it.product_id);
    return p ? sum + (p.price * it.qty) : sum;
  },0);
}

function cartRow(it){
  const p = state.products.find(x=>x.id===it.product_id);
  if(!p) return "";
  return `
    <div class="cartItem">
      <div>
        <div class="cartTitle">${esc(p.title)}</div>
        <div class="cartMeta">${esc(p.category)} • Size ${esc(p.size)} • ${esc(p.condition)}</div>
        <div class="cartMeta">${rupiah(p.price)}</div>
      </div>
      <div class="qty">
        <button type="button" id="dec-${p.id}">−</button>
        <strong>${it.qty}</strong>
        <button type="button" id="inc-${p.id}">+</button>
      </div>
    </div>
  `;
}

function renderCart(){
  els.cartCount.textContent = String(cartCount());
  els.cartSubtotal.textContent = rupiah(subtotal());

  if(state.cart.length === 0){
    els.cartItems.innerHTML = `<div class="muted">Keranjang masih kosong.</div>`;
    els.checkoutOpen.disabled = true;
    els.clearBtn.disabled = true;
    return;
  }

  els.checkoutOpen.disabled = false;
  els.clearBtn.disabled = false;

  els.cartItems.innerHTML = state.cart.map(cartRow).join("");
  state.cart.forEach(it=>{
    el(`dec-${it.product_id}`)?.addEventListener("click", ()=> dec(it.product_id));
    el(`inc-${it.product_id}`)?.addEventListener("click", ()=> inc(it.product_id));
  });
}

// ---------- Checkout ----------
function openCheckout(){
  if(state.cart.length === 0) return;
  openOverlay();
  els.checkoutModal.hidden = false;
  els.coNote.textContent = `Subtotal: ${rupiah(subtotal())}`;
}

function closeCheckout(){
  els.checkoutModal.hidden = true;
  closeOverlayIfNothingOpen();
}

async function submitCheckout(e){
  e.preventDefault();
  const payload = {
    customer_name: els.coName.value.trim(),
    phone: els.coPhone.value.trim(),
    address: els.coAddr.value.trim(),
    items: state.cart.map(it => ({ product_id: it.product_id, qty: it.qty }))
  };

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if(!res.ok){
    toast(data.error || "Checkout gagal");
    return;
  }

  toast(`Pesanan dibuat • Total ${data.total_formatted}`);
  clearCart();
  closeAll();
  els.checkoutForm.reset();
  await refreshProducts(); // refresh stock
}

// ---------- Events ----------
function wire(){
  els.year.textContent = String(new Date().getFullYear());

  els.q.addEventListener("input", async (e)=>{ state.q = e.target.value; await refreshProducts(); });
  els.cat.addEventListener("change", async (e)=>{ state.category = e.target.value; await refreshProducts(); });
  els.size.addEventListener("change", async (e)=>{ state.size = e.target.value; await refreshProducts(); });
  els.sort.addEventListener("change", async (e)=>{ state.sort = e.target.value; await refreshProducts(); });

  const resetAll = async ()=>{
    state.q = ""; state.category = "all"; state.size = "all"; state.sort = "newest";
    await refreshProducts();
  };
  els.reset.addEventListener("click", resetAll);
  els.emptyReset.addEventListener("click", resetAll);

  els.openCart.addEventListener("click", openCart);

  // ✅ tombol X keranjang: stopPropagation biar overlay tidak ikut nangkep
  els.closeCart.addEventListener("click", (ev)=>{ ev.stopPropagation(); closeCart(); });

  els.clearBtn.addEventListener("click", clearCart);

  els.pmAdd.addEventListener("click", ()=>{ if(state.openProductId) addToCart(state.openProductId, 1); });
  els.closeProduct.addEventListener("click", (ev)=>{ ev.stopPropagation(); closeProduct(); });

  els.checkoutOpen.addEventListener("click", openCheckout);
  els.closeCheckout.addEventListener("click", (ev)=>{ ev.stopPropagation(); closeCheckout(); });
  els.checkoutForm.addEventListener("submit", submitCheckout);

  els.overlay.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeAll(); });
}

async function init(){
  await refreshProducts();
  renderCart();
  wire();
}

document.addEventListener("DOMContentLoaded", init);
