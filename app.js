/* Thriftly Demo Store (Frontend only)
   - Product listing + filters + sort
   - Product modal
   - Cart drawer saved in localStorage
   - Fake checkout
*/

const rupiah = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

const PRODUCTS = [
  {
    id: "p1",
    title: "Jaket Denim Vintage",
    brand: "Levi's",
    category: "Jaket",
    size: "L",
    condition: "Very Good",
    price: 189000,
    stock: 1,
    createdAt: "2026-02-20",
    desc: "Denim tebal, warna masih solid. Ada fade natural (khas vintage).",
  },
  {
    id: "p2",
    title: "Hoodie Basic Oversize",
    brand: "Uniqlo",
    category: "Hoodie",
    size: "XL",
    condition: "Good",
    price: 129000,
    stock: 2,
    createdAt: "2026-02-26",
    desc: "Hangat, nyaman, cocok daily. Ada sedikit pilling normal pemakaian.",
  },
  {
    id: "p3",
    title: "Kemeja Flanel Kotak",
    brand: "H&M",
    category: "Kemeja",
    size: "M",
    condition: "Like New",
    price: 99000,
    stock: 1,
    createdAt: "2026-02-28",
    desc: "Flanel lembut, warna cerah. Nyaris seperti baru.",
  },
  {
    id: "p4",
    title: "Celana Chino Slim",
    brand: "Gap",
    category: "Celana",
    size: "32",
    condition: "Very Good",
    price: 139000,
    stock: 1,
    createdAt: "2026-02-18",
    desc: "Chino rapi untuk kantor/casual. Jahitan aman, noda tidak ada.",
  },
  {
    id: "p5",
    title: "T-shirt Graphic 90s",
    brand: "Vintage",
    category: "Kaos",
    size: "L",
    condition: "Fair",
    price: 79000,
    stock: 1,
    createdAt: "2026-02-14",
    desc: "Ada crack print tipis (wajar 90s). Vibe klasik untuk kolektor.",
  },
  {
    id: "p6",
    title: "Sweater Knit Minimal",
    brand: "Zara",
    category: "Sweater",
    size: "M",
    condition: "Good",
    price: 119000,
    stock: 1,
    createdAt: "2026-02-22",
    desc: "Knit halus, cocok layering. Ada sedikit serat terangkat.",
  },
  {
    id: "p7",
    title: "Jersey Retro",
    brand: "Nike",
    category: "Jersey",
    size: "L",
    condition: "Very Good",
    price: 159000,
    stock: 1,
    createdAt: "2026-02-27",
    desc: "Bahan sporty, patch rapi. Cocok streetwear.",
  },
  {
    id: "p8",
    title: "Rok Pleats",
    brand: "Mango",
    category: "Rok",
    size: "S",
    condition: "Like New",
    price: 109000,
    stock: 1,
    createdAt: "2026-02-25",
    desc: "Pleats jatuh bagus, tidak kusut. Warna netral gampang mix.",
  },
];

const LS_KEY = "thriftly_cart_v1";

const els = {
  year: document.getElementById("year"),

  productGrid: document.getElementById("productGrid"),
  emptyState: document.getElementById("emptyState"),

  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  sizeFilter: document.getElementById("sizeFilter"),
  sortSelect: document.getElementById("sortSelect"),
  btnReset: document.getElementById("btnReset"),
  btnEmptyReset: document.getElementById("btnEmptyReset"),

  btnMenu: document.getElementById("btnMenu"),
  mobileNav: document.getElementById("mobileNav"),

  overlay: document.getElementById("overlay"),

  // search modal
  btnOpenSearch: document.getElementById("btnOpenSearch"),
  searchModal: document.getElementById("searchModal"),
  btnCloseSearch: document.getElementById("btnCloseSearch"),
  searchModalInput: document.getElementById("searchModalInput"),

  // guide modal
  btnOpenGuide: document.getElementById("btnOpenGuide"),
  guideModal: document.getElementById("guideModal"),
  btnCloseGuide: document.getElementById("btnCloseGuide"),

  // product modal
  productModal: document.getElementById("productModal"),
  btnCloseProduct: document.getElementById("btnCloseProduct"),
  pmTitle: document.getElementById("pmTitle"),
  pmImg: document.getElementById("pmImg"),
  pmCategory: document.getElementById("pmCategory"),
  pmSize: document.getElementById("pmSize"),
  pmCond: document.getElementById("pmCond"),
  pmDesc: document.getElementById("pmDesc"),
  pmPrice: document.getElementById("pmPrice"),
  pmStock: document.getElementById("pmStock"),
  pmAdd: document.getElementById("pmAdd"),

  // cart drawer
  btnOpenCart: document.getElementById("btnOpenCart"),
  cartDrawer: document.getElementById("cartDrawer"),
  btnCloseCart: document.getElementById("btnCloseCart"),
  cartItems: document.getElementById("cartItems"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  cartShip: document.getElementById("cartShip"),
  cartTotal: document.getElementById("cartTotal"),
  cartCount: document.getElementById("cartCount"),
  cartSub: document.getElementById("cartSub"),
  btnCheckout: document.getElementById("btnCheckout"),
  btnClearCart: document.getElementById("btnClearCart"),

  // checkout
  checkoutModal: document.getElementById("checkoutModal"),
  btnCloseCheckout: document.getElementById("btnCloseCheckout"),
  checkoutForm: document.getElementById("checkoutForm"),

  // contact
  contactForm: document.getElementById("contactForm"),

  // toast
  toast: document.getElementById("toast"),

  // featured
  featuredImg: document.getElementById("featuredImg"),
  featuredTitle: document.getElementById("featuredTitle"),
  featuredMeta: document.getElementById("featuredMeta"),
  featuredPrice: document.getElementById("featuredPrice"),
  featuredCond: document.getElementById("featuredCond"),
  btnFeaturedAdd: document.getElementById("btnFeaturedAdd"),
};

let state = {
  q: "",
  category: "all",
  size: "all",
  sort: "recommended",
  cart: loadCart(),
  openProductId: null,
  featuredId: null,
};

function loadCart() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.cart));
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (els.toast.hidden = true), 2200);
}

function uniq(arr) {
  return [...new Set(arr)].sort((a, b) => String(a).localeCompare(String(b)));
}

function byNewest(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function getFilteredProducts() {
  let list = [...PRODUCTS];

  // search (title/brand/category)
  const q = state.q.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const hay = `${p.title} ${p.brand} ${p.category} ${p.size} ${p.condition}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (state.category !== "all") {
    list = list.filter((p) => p.category === state.category);
  }
  if (state.size !== "all") {
    list = list.filter((p) => p.size === state.size);
  }

  // sort
  if (state.sort === "priceAsc") list.sort((a, b) => a.price - b.price);
  if (state.sort === "priceDesc") list.sort((a, b) => b.price - a.price);
  if (state.sort === "newest") list.sort(byNewest);

  // recommended = newest first as a sane demo default
  if (state.sort === "recommended") list.sort(byNewest);

  return list;
}

function renderFilters() {
  const categories = uniq(PRODUCTS.map((p) => p.category));
  const sizes = uniq(PRODUCTS.map((p) => p.size));

  // categories
  els.categoryFilter.innerHTML = `<option value="all">Semua Kategori</option>` +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  // sizes
  els.sizeFilter.innerHTML = `<option value="all">Semua Ukuran</option>` +
    sizes.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");

  els.categoryFilter.value = state.category;
  els.sizeFilter.value = state.size;
  els.sortSelect.value = state.sort;
  els.searchInput.value = state.q;
}

function renderProducts() {
  const list = getFilteredProducts();

  els.productGrid.innerHTML = list.map((p) => productCard(p)).join("");
  els.emptyState.hidden = list.length !== 0;

  // wire events
  list.forEach((p) => {
    document.getElementById(`view-${p.id}`)?.addEventListener("click", () => openProduct(p.id));
    document.getElementById(`add-${p.id}`)?.addEventListener("click", () => addToCart(p.id, 1));
  });
}

function productCard(p) {
  return `
    <article class="cardP" aria-label="${escapeHtml(p.title)}">
      <div class="cardP__img" aria-hidden="true"></div>
      <div class="cardP__body">
        <div class="cardP__title">${escapeHtml(p.title)}</div>
        <div class="muted small">${escapeHtml(p.brand)} • ${escapeHtml(p.category)}</div>
        <div class="cardP__meta">
          <span class="chip">${escapeHtml(p.condition)}</span>
          <span class="chip chip--soft">Size ${escapeHtml(p.size)}</span>
          <span class="chip chip--soft">Stock ${p.stock}</span>
        </div>
        <div class="cardP__bottom">
          <div class="price">${rupiah(p.price)}</div>
          <div class="cardP__actions">
            <button class="iconBtn" id="view-${p.id}" type="button" aria-label="Lihat detail">👁️</button>
            <button class="btn btn--primary" id="add-${p.id}" type="button">Tambah</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Product modal */
function openProduct(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;

  state.openProductId = id;
  els.pmTitle.textContent = p.title;
  els.pmCategory.textContent = p.category;
  els.pmSize.textContent = `Size ${p.size}`;
  els.pmCond.textContent = p.condition;
  els.pmDesc.textContent = p.desc;
  els.pmPrice.textContent = rupiah(p.price);
  els.pmStock.textContent = `Sisa stok: ${p.stock}`;
  els.pmAdd.disabled = p.stock <= 0;

  openModal(els.productModal);
}

function closeProduct() {
  state.openProductId = null;
  closeModal(els.productModal);
}

/* Cart */
function cartCount() {
  return state.cart.reduce((sum, it) => sum + it.qty, 0);
}

function cartSubtotal() {
  return state.cart.reduce((sum, it) => {
    const p = PRODUCTS.find((x) => x.id === it.productId);
    if (!p) return sum;
    return sum + p.price * it.qty;
  }, 0);
}

function addToCart(productId, qty) {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) return;

  const existing = state.cart.find((x) => x.productId === productId);
  const currentQty = existing ? existing.qty : 0;
  const nextQty = Math.min(p.stock, currentQty + qty);

  if (nextQty <= currentQty) {
    toast("Stok tidak cukup.");
    return;
  }

  if (existing) existing.qty = nextQty;
  else state.cart.push({ productId, qty: nextQty });

  saveCart();
  renderCart();
  toast("Ditambahkan ke keranjang ✅");
}

function decCart(productId) {
  const idx = state.cart.findIndex((x) => x.productId === productId);
  if (idx < 0) return;

  state.cart[idx].qty -= 1;
  if (state.cart[idx].qty <= 0) state.cart.splice(idx, 1);

  saveCart();
  renderCart();
}

function incCart(productId) {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) return;

  const it = state.cart.find((x) => x.productId === productId);
  if (!it) return;

  if (it.qty >= p.stock) {
    toast("Maksimum sesuai stok.");
    return;
  }
  it.qty += 1;

  saveCart();
  renderCart();
}

function removeCart(productId) {
  state.cart = state.cart.filter((x) => x.productId !== productId);
  saveCart();
  renderCart();
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderCart();
  toast("Keranjang dikosongkan.");
}

function renderCart() {
  const count = cartCount();
  els.cartCount.textContent = String(count);
  els.cartSub.textContent = `${count} item`;

  if (state.cart.length === 0) {
    els.cartItems.innerHTML = `
      <div class="empty">
        <h3>Keranjang masih kosong</h3>
        <p class="muted">Tambahkan produk favoritmu dulu.</p>
      </div>
    `;
  } else {
    els.cartItems.innerHTML = state.cart.map((it) => cartRow(it)).join("");
    state.cart.forEach((it) => {
      document.getElementById(`dec-${it.productId}`)?.addEventListener("click", () => decCart(it.productId));
      document.getElementById(`inc-${it.productId}`)?.addEventListener("click", () => incCart(it.productId));
      document.getElementById(`rm-${it.productId}`)?.addEventListener("click", () => removeCart(it.productId));
    });
  }

  const sub = cartSubtotal();
  const ship = state.cart.length ? 15000 : 0;
  els.cartSubtotal.textContent = rupiah(sub);
  els.cartShip.textContent = rupiah(ship);
  els.cartTotal.textContent = rupiah(sub + ship);

  els.btnCheckout.disabled = state.cart.length === 0;
  els.btnClearCart.disabled = state.cart.length === 0;
}

function cartRow(it) {
  const p = PRODUCTS.find((x) => x.id === it.productId);
  if (!p) return "";

  return `
    <div class="cartItem">
      <div class="cartItem__img" aria-hidden="true"></div>
      <div class="cartItem__info">
        <div class="cartItem__title">${escapeHtml(p.title)}</div>
        <div class="cartItem__meta">
          <span class="chip">${escapeHtml(p.condition)}</span>
          <span class="chip chip--soft">Size ${escapeHtml(p.size)}</span>
        </div>
        <div class="muted small">${rupiah(p.price)} • Stock ${p.stock}</div>
      </div>
      <div class="cartItem__actions">
        <button class="qtyBtn" id="dec-${p.id}" type="button" aria-label="Kurangi">−</button>
        <div class="qty" aria-label="Jumlah">${it.qty}</div>
        <button class="qtyBtn" id="inc-${p.id}" type="button" aria-label="Tambah">+</button>
        <button class="qtyBtn" id="rm-${p.id}" type="button" aria-label="Hapus">🗑️</button>
      </div>
    </div>
  `;
}

/* Modal helpers */
function openModal(modalEl) {
  els.overlay.hidden = false;
  modalEl.hidden = false;
  // focus first input if any
  const focusable = modalEl.querySelector("input,select,textarea,button");
  focusable?.focus?.();
}

function closeModal(modalEl) {
  modalEl.hidden = true;
  // if no other open modal/drawer, hide overlay
  const somethingOpen = !els.searchModal.hidden || !els.guideModal.hidden || !els.productModal.hidden || !els.checkoutModal.hidden || !els.cartDrawer.hidden;
  if (!somethingOpen) els.overlay.hidden = true;
}

/* Drawer */
function openCart() {
  els.overlay.hidden = false;
  els.cartDrawer.hidden = false;
  renderCart();
}
function closeCart() {
  els.cartDrawer.hidden = true;
  closeModal({ hidden: true }); // triggers overlay check
}

/* Featured */
function pickFeatured() {
  const sorted = [...PRODUCTS].sort(byNewest);
  state.featuredId = sorted[0]?.id ?? PRODUCTS[0]?.id ?? null;
  const p = PRODUCTS.find((x) => x.id === state.featuredId);
  if (!p) return;

  els.featuredTitle.textContent = p.title;
  els.featuredMeta.textContent = `${p.brand} • ${p.category} • Size ${p.size}`;
  els.featuredPrice.textContent = rupiah(p.price);
  els.featuredCond.textContent = `${p.condition} • Stock ${p.stock}`;

  els.btnFeaturedAdd.onclick = () => addToCart(p.id, 1);
}

/* Events */
function wireEvents() {
  els.year.textContent = String(new Date().getFullYear());

  // mobile nav
  els.btnMenu.addEventListener("click", () => {
    const open = !els.mobileNav.hidden;
    els.mobileNav.hidden = open;
    els.btnMenu.setAttribute("aria-expanded", String(!open));
  });

  // filter controls
  els.searchInput.addEventListener("input", (e) => {
    state.q = e.target.value;
    renderProducts();
  });
  els.categoryFilter.addEventListener("change", (e) => {
    state.category = e.target.value;
    renderProducts();
  });
  els.sizeFilter.addEventListener("change", (e) => {
    state.size = e.target.value;
    renderProducts();
  });
  els.sortSelect.addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderProducts();
  });

  const doReset = () => {
    state.q = "";
    state.category = "all";
    state.size = "all";
    state.sort = "recommended";
    renderFilters();
    renderProducts();
  };
  els.btnReset.addEventListener("click", doReset);
  els.btnEmptyReset.addEventListener("click", doReset);

  // search modal
  els.btnOpenSearch.addEventListener("click", () => {
    openModal(els.searchModal);
    els.searchModalInput.value = state.q;
  });
  els.btnCloseSearch.addEventListener("click", () => closeModal(els.searchModal));
  els.searchModalInput.addEventListener("input", (e) => {
    state.q = e.target.value;
    els.searchInput.value = state.q;
    renderProducts();
  });

  // guide modal
  els.btnOpenGuide.addEventListener("click", () => openModal(els.guideModal));
  els.btnCloseGuide.addEventListener("click", () => closeModal(els.guideModal));

  // product modal
  els.btnCloseProduct.addEventListener("click", closeProduct);
  els.pmAdd.addEventListener("click", () => {
    if (state.openProductId) addToCart(state.openProductId, 1);
  });

  // cart
  els.btnOpenCart.addEventListener("click", openCart);
  els.btnCloseCart.addEventListener("click", closeCart);
  els.btnClearCart.addEventListener("click", clearCart);

  // checkout
  els.btnCheckout.addEventListener("click", () => {
    if (state.cart.length === 0) return;
    openModal(els.checkoutModal);
  });
  els.btnCloseCheckout.addEventListener("click", () => closeModal(els.checkoutModal));
  els.checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();
    // demo success
    clearCart();
    closeModal(els.checkoutModal);
    closeCart();
    toast("Pesanan dibuat (simulasi) 🎉");
    els.checkoutForm.reset();
  });

  // contact form
  els.contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    toast("Pesan terkirim (demo). Terima kasih!");
    els.contactForm.reset();
  });

  // overlay click closes modals (not drawer by default)
  els.overlay.addEventListener("click", () => {
    // close any open modal
    if (!els.searchModal.hidden) closeModal(els.searchModal);
    if (!els.guideModal.hidden) closeModal(els.guideModal);
    if (!els.productModal.hidden) closeModal(els.productModal);
    if (!els.checkoutModal.hidden) closeModal(els.checkoutModal);
    if (!els.cartDrawer.hidden) closeCart();
  });

  // ESC closes top layers
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!els.checkoutModal.hidden) return closeModal(els.checkoutModal);
    if (!els.productModal.hidden) return closeProduct();
    if (!els.guideModal.hidden) return closeModal(els.guideModal);
    if (!els.searchModal.hidden) return closeModal(els.searchModal);
    if (!els.cartDrawer.hidden) return closeCart();
  });
}

/* Init */
function init() {
  renderFilters();
  renderProducts();
  renderCart();
  pickFeatured();
  wireEvents();
}

init();
