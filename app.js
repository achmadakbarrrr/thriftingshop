const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

const PRODUCTS = [
  { id:"p1", title:"Jaket Denim Vintage", brand:"Levi's", category:"Jaket", size:"L", condition:"Very Good", price:189000, stock:1, createdAt:"2026-02-20", desc:"Denim tebal, fade natural vintage." },
  { id:"p2", title:"Hoodie Basic Oversize", brand:"Uniqlo", category:"Hoodie", size:"XL", condition:"Good", price:129000, stock:2, createdAt:"2026-02-26", desc:"Hangat, nyaman. Ada pilling ringan." },
  { id:"p3", title:"Kemeja Flanel Kotak", brand:"H&M", category:"Kemeja", size:"M", condition:"Like New", price:99000, stock:1, createdAt:"2026-02-28", desc:"Flanel lembut, kondisi sangat bagus." },
  { id:"p4", title:"Celana Chino Slim", brand:"Gap", category:"Celana", size:"32", condition:"Very Good", price:139000, stock:1, createdAt:"2026-02-18", desc:"Chino rapi, jahitan aman." },
  { id:"p5", title:"T-shirt Graphic 90s", brand:"Vintage", category:"Kaos", size:"L", condition:"Fair", price:79000, stock:1, createdAt:"2026-02-14", desc:"Crack print tipis khas 90s." },
  { id:"p6", title:"Sweater Knit Minimal", brand:"Zara", category:"Sweater", size:"M", condition:"Good", price:119000, stock:1, createdAt:"2026-02-22", desc:"Knit halus untuk layering." },
  { id:"p7", title:"Jersey Retro", brand:"Nike", category:"Jersey", size:"L", condition:"Very Good", price:159000, stock:1, createdAt:"2026-02-27", desc:"Patch rapi, vibe streetwear." },
  { id:"p8", title:"Rok Pleats", brand:"Mango", category:"Rok", size:"S", condition:"Like New", price:109000, stock:1, createdAt:"2026-02-25", desc:"Pleats jatuh bagus, warna netral." },
];

const LS_KEY = "thriftmart_cart_v1";

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
  checkoutBtn: el("checkoutBtn"),
  clearBtn: el("clearBtn"),

  productModal: el("productModal"),
  closeProduct: el("closeProduct"),
  pmTitle: el("pmTitle"),
  pmMeta: el("pmMeta"),
  pmPrice: el("pmPrice"),
  pmDesc: el("pmDesc"),
  pmAdd: el("pmAdd"),

  toast: el("toast"),
};

let state = {
  q: "",
  category: "all",
  size: "all",
  sort: "newest",
  cart: loadCart(),
  openProductId: null,
};

function toast(msg){
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> els.toast.hidden = true, 1800);
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
function byNewest(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); }

function filtered(){
  let list = [...PRODUCTS];

  const q = state.q.trim().toLowerCase();
  if(q){
    list = list.filter(p => (`${p.title} ${p.brand} ${p.category} ${p.size} ${p.condition}`).toLowerCase().includes(q));
  }
  if(state.category !== "all") list = list.filter(p => p.category === state.category);
  if(state.size !== "all") list = list.filter(p => p.size === state.size);

  if(state.sort === "newest") list.sort(byNewest);
  if(state.sort === "priceAsc") list.sort((a,b)=>a.price-b.price);
  if(state.sort === "priceDesc") list.sort((a,b)=>b.price-a.price);

  return list;
}

function renderFilters(){
  const cats = uniq(PRODUCTS.map(p=>p.category));
  const sizes = uniq(PRODUCTS.map(p=>p.size));

  els.cat.innerHTML = `<option value="all">Semua Kategori</option>` + cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  els.size.innerHTML = `<option value="all">Semua Ukuran</option>` + sizes.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");

  els.cat.value = state.category;
  els.size.value = state.size;
  els.sort.value = state.sort;
  els.q.value = state.q;
}

function renderProducts(){
  const list = filtered();
  els.grid.innerHTML = list.map(card).join("");
  els.empty.hidden = list.length !== 0;

  list.forEach(p=>{
    el(`view-${p.id}`)?.addEventListener("click", ()=> openProduct(p.id));
    el(`add-${p.id}`)?.addEventListener("click", ()=> addToCart(p.id, 1));
  });
}

function card(p){
  return `
    <article class="card">
      <div class="thumb" aria-hidden="true"></div>
      <div class="card__body">
        <div class="title">${esc(p.title)}</div>
        <div class="meta">${esc(p.brand)} • ${esc(p.category)} • Size ${esc(p.size)}</div>
        <div class="row2">
          <div class="price">${rupiah(p.price)}</div>
          <div class="actions">
            <button class="icon" id="view-${p.id}" type="button" aria-label="Detail">👁️</button>
            <button class="btn primary" id="add-${p.id}" type="button">Tambah</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function esc(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* Product modal */
function openProduct(id){
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  state.openProductId = id;

  els.pmTitle.textContent = p.title;
  els.pmMeta.textContent = `${p.brand} • ${p.category} • Size ${p.size} • ${p.condition} • Stock ${p.stock}`;
  els.pmPrice.textContent = rupiah(p.price);
  els.pmDesc.textContent = p.desc;
  els.pmAdd.disabled = p.stock <= 0;

  openOverlay();
  els.productModal.hidden = false;
}
function closeProduct(){
  state.openProductId = null;
  els.productModal.hidden = true;
  closeOverlayIfNothingOpen();
}

/* Cart */
function cartCount(){ return state.cart.reduce((s,it)=>s+it.qty,0); }
function cartSubtotal(){
  return state.cart.reduce((sum,it)=>{
    const p = PRODUCTS.find(x=>x.id===it.productId);
    return p ? sum + (p.price * it.qty) : sum;
  },0);
}

function addToCart(productId, qty){
  const p = PRODUCTS.find(x=>x.id===productId);
  if(!p) return;

  const it = state.cart.find(x=>x.productId===productId);
  const cur = it ? it.qty : 0;
  const next = Math.min(p.stock, cur + qty);
  if(next <= cur) return toast("Stok tidak cukup.");

  if(it) it.qty = next;
  else state.cart.push({ productId, qty: next });

  saveCart();
  renderCart();
  toast("Masuk keranjang ✅");
}

function dec(productId){
  const idx = state.cart.findIndex(x=>x.productId===productId);
  if(idx < 0) return;
  state.cart[idx].qty -= 1;
  if(state.cart[idx].qty <= 0) state.cart.splice(idx,1);
  saveCart(); renderCart();
}
function inc(productId){
  const p = PRODUCTS.find(x=>x.id===productId);
  const it = state.cart.find(x=>x.productId===productId);
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

function renderCart(){
  const count = cartCount();
  els.cartCount.textContent = String(count);

  if(state.cart.length === 0){
    els.cartItems.innerHTML = `<div class="muted">Keranjang masih kosong.</div>`;
    els.checkoutBtn.disabled = true;
    els.clearBtn.disabled = true;
  }else{
    els.cartItems.innerHTML = state.cart.map(cartRow).join("");
    state.cart.forEach(it=>{
      el(`dec-${it.productId}`)?.addEventListener("click", ()=> dec(it.productId));
      el(`inc-${it.productId}`)?.addEventListener("click", ()=> inc(it.productId));
    });
    els.checkoutBtn.disabled = false;
    els.clearBtn.disabled = false;
  }

  els.cartSubtotal.textContent = rupiah(cartSubtotal());
}

function cartRow(it){
  const p = PRODUCTS.find(x=>x.id===it.productId);
  if(!p) return "";
  return `
    <div class="cartItem">
      <div class="left">
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

/* Overlay + drawer */
function openOverlay(){ els.overlay.hidden = false; }
function closeOverlayIfNothingOpen(){
  const somethingOpen = !els.drawer.hidden || !els.productModal.hidden;
  if(!somethingOpen) els.overlay.hidden = true;
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

/* Events */
function wire(){
  els.year.textContent = String(new Date().getFullYear());

  els.q.addEventListener("input", (e)=>{ state.q = e.target.value; renderProducts(); });
  els.cat.addEventListener("change", (e)=>{ state.category = e.target.value; renderProducts(); });
  els.size.addEventListener("change", (e)=>{ state.size = e.target.value; renderProducts(); });
  els.sort.addEventListener("change", (e)=>{ state.sort = e.target.value; renderProducts(); });

  const resetAll = ()=>{
    state.q = "";
    state.category = "all";
    state.size = "all";
    state.sort = "newest";
    renderFilters();
    renderProducts();
  };
  els.reset.addEventListener("click", resetAll);
  els.emptyReset.addEventListener("click", resetAll);

  els.openCart.addEventListener("click", openCart);
  els.closeCart.addEventListener("click", closeCart);
  els.clearBtn.addEventListener("click", clearCart);

  els.pmAdd.addEventListener("click", ()=>{
    if(state.openProductId) addToCart(state.openProductId, 1);
  });
  els.closeProduct.addEventListener("click", closeProduct);

  els.overlay.addEventListener("click", ()=>{
    if(!els.productModal.hidden) closeProduct();
    if(!els.drawer.hidden) closeCart();
  });

  els.checkoutBtn.addEventListener("click", ()=>{
    if(state.cart.length === 0) return;
    clearCart();
    closeCart();
    toast("Checkout berhasil (demo) 🎉");
  });

  document.addEventListener("keydown", (e)=>{
    if(e.key !== "Escape") return;
    if(!els.productModal.hidden) return closeProduct();
    if(!els.drawer.hidden) return closeCart();
  });
}

function init(){
  renderFilters();
  renderProducts();
  renderCart();
  wire();
}
init();