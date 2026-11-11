/* Pixel Arena — Interacciones: menú, catálogo, carrito, detalle, FAQ y contacto */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var money = function (n) { return "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };

  /* ---------- 1. Menú adaptable ---------- */
  var navToggle = $("#navToggle");
  var nav = $("#menuPrincipal");

  function closeMenu() {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menú de navegación");
  }
  navToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Cerrar menú de navegación" : "Abrir menú de navegación");
  });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", closeMenu); });
  window.addEventListener("resize", function () { if (window.innerWidth >= 1024) closeMenu(); });

  /* ---------- 2. Catálogo: filtro, búsqueda y orden ---------- */
  var grid = $("#productGrid");
  var cards = $$(".product-card", grid);
  var originalOrder = cards.slice();
  var state = { cat: "todos", q: "", sort: "relevancia" };
  var products = {};

  cards.forEach(function (c) {
    products[c.dataset.id] = {
      id: c.dataset.id,
      name: c.dataset.name,
      price: Number(c.dataset.price),
      category: c.dataset.category,
      catLabel: $(".tag", c).textContent,
      desc: c.dataset.desc,
      specs: c.dataset.specs.split("|"),
      img: $("img", c).getAttribute("src"),
      alt: $("img", c).getAttribute("alt")
    };
  });

  function applyCatalog() {
    var q = state.q.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (c) {
      var okCat = state.cat === "todos" || c.dataset.category === state.cat;
      var okText = !q || c.dataset.name.toLowerCase().indexOf(q) !== -1;
      c.hidden = !(okCat && okText);
      if (!c.hidden) shown++;
    });

    var list = originalOrder.slice();
    if (state.sort === "precio-asc") list.sort(function (a, b) { return a.dataset.price - b.dataset.price; });
    if (state.sort === "precio-desc") list.sort(function (a, b) { return b.dataset.price - a.dataset.price; });
    list.forEach(function (c) { grid.appendChild(c); });

    $("#resultCount").textContent = shown + (shown === 1 ? " producto" : " productos");
    $("#emptyMsg").hidden = shown !== 0;
  }

  $$(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      $$(".chip").forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      state.cat = chip.getAttribute("data-filter");
      applyCatalog();
    });
  });
  $("#buscar").addEventListener("input", function (e) { state.q = e.target.value; applyCatalog(); });
  $("#orden").addEventListener("change", function (e) { state.sort = e.target.value; applyCatalog(); });

  /* ---------- 3. Carrito ---------- */
  var KEY = "pixelarena_cart";
  var cart = {}; // { id: cantidad }

  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(function (id) { if (!products[id] || !(cart[id] > 0)) delete cart[id]; });

  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* sin almacenamiento */ } }

  var drawer = $("#carrito");
  var overlay = $("#overlay");
  var btnCart = $("#btnCarrito");
  var lastFocus = null;

  function countItems() { return Object.keys(cart).reduce(function (s, id) { return s + cart[id]; }, 0); }
  function total() { return Object.keys(cart).reduce(function (s, id) { return s + cart[id] * products[id].price; }, 0); }

  function toast(text) {
    var t = $("#toast");
    t.textContent = text;
    t.classList.add("is-show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove("is-show"); }, 1800);
  }

  function renderCart() {
    var list = $("#cartList");
    list.innerHTML = "";
    var ids = Object.keys(cart);

    ids.forEach(function (id) {
      var p = products[id];
      var li = document.createElement("li");
      li.className = "cart-item";
      li.innerHTML =
        '<img src="' + p.img + '" alt="" width="64" height="48">' +
        "<div>" +
        "<h3></h3>" +
        '<p class="line-price">' + money(p.price * cart[id]) + "</p>" +
        '<div class="qty">' +
        '<button type="button" data-act="minus" aria-label="Quitar una unidad">−</button>' +
        '<span class="qty-num" aria-live="polite">' + cart[id] + "</span>" +
        '<button type="button" data-act="plus" aria-label="Agregar una unidad">+</button>' +
        '<button type="button" class="remove" data-act="remove">Eliminar</button>' +
        "</div></div>";
      $("h3", li).textContent = p.name;
      li.setAttribute("data-id", id);
      list.appendChild(li);
    });

    $("#cartEmpty").hidden = ids.length > 0;
    $("#cartTotal").textContent = money(total());
    $("#btnComprar").disabled = ids.length === 0;
    $("#btnVaciar").disabled = ids.length === 0;

    var n = countItems();
    $("#cartCount").textContent = n;
    btnCart.setAttribute("aria-label", "Abrir carrito de compras, " + n + (n === 1 ? " producto" : " productos"));
  }

  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    save();
    renderCart();
    $("#cartMsg").textContent = "";
    toast("Agregado: " + products[id].name);
  }

  function openCart() {
    lastFocus = document.activeElement;
    $("#toast").classList.remove("is-show"); // el aviso no debe tapar el carrito
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    btnCart.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
    $("#btnCerrarCarrito").focus();
  }
  function closeCart() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
    btnCart.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
    if (lastFocus) lastFocus.focus();
  }

  btnCart.addEventListener("click", openCart);
  $("#btnCerrarCarrito").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) closeCart();
  });

  $("#cartList").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    var id = btn.closest(".cart-item").getAttribute("data-id");
    var act = btn.getAttribute("data-act");
    if (act === "plus") cart[id] += 1;
    if (act === "minus") { cart[id] -= 1; if (cart[id] <= 0) delete cart[id]; }
    if (act === "remove") delete cart[id];
    save();
    renderCart();
  });

  $("#btnVaciar").addEventListener("click", function () {
    cart = {}; save(); renderCart(); $("#cartMsg").textContent = "";
  });

  $("#btnComprar").addEventListener("click", function () {
    if (!countItems()) return;
    var n = countItems();
    var t = money(total());
    cart = {}; save(); renderCart();
    $("#cartMsg").textContent = "Pedido simulado registrado: " + n + (n === 1 ? " producto" : " productos") + " por " + t + ". No se realizó ningún cobro.";
  });

  /* ---------- 4. Agregar y ver detalle desde las tarjetas ---------- */
  var modal = $("#modalProducto");
  var modalId = null;

  grid.addEventListener("click", function (e) {
    var card = e.target.closest(".product-card");
    if (!card) return;
    if (e.target.closest(".js-agregar")) addToCart(card.dataset.id);
    if (e.target.closest(".js-detalle")) openModal(card.dataset.id);
  });

  function openModal(id) {
    var p = products[id];
    modalId = id;
    $("#modalImg").src = p.img;
    $("#modalImg").alt = p.alt;
    $("#modalCat").textContent = p.catLabel;
    $("#modalTitulo").textContent = p.name;
    $("#modalDesc").textContent = p.desc;
    $("#modalPrecio").textContent = money(p.price);
    var ul = $("#modalSpecs");
    ul.innerHTML = "";
    p.specs.forEach(function (s) {
      var li = document.createElement("li");
      li.textContent = s;
      ul.appendChild(li);
    });
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
  }
  function closeModal() { if (modal.open) { if (typeof modal.close === "function") modal.close(); else modal.removeAttribute("open"); } }

  $("#btnCerrarModal").addEventListener("click", closeModal);
  $("#modalAgregar").addEventListener("click", function () { if (modalId) { addToCart(modalId); closeModal(); } });
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

  /* ---------- 5. Preguntas frecuentes ---------- */
  $$(".acc-trigger").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      document.getElementById(btn.getAttribute("aria-controls")).hidden = expanded;
    });
  });

  /* ---------- 6. Formulario de contacto ---------- */
  var form = $("#formContacto");
  var msg = $("#formMsg");

  function setError(inputId, errId, text) {
    document.getElementById(errId).textContent = text;
    document.getElementById(inputId).closest(".field").classList.toggle("has-error", Boolean(text));
    return !text;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = "";
    var nombre = $("#nombre").value.trim();
    var correo = $("#correo").value.trim();
    var asunto = $("#asunto").value;
    var mensaje = $("#mensaje").value.trim();

    var ok = true;
    ok = setError("nombre", "errNombre", nombre.length < 3 ? "Escribe tu nombre completo." : "") && ok;
    ok = setError("correo", "errCorreo", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? "" : "Ingresa un correo válido.") && ok;
    ok = setError("asunto", "errAsunto", asunto ? "" : "Selecciona un asunto.") && ok;
    ok = setError("mensaje", "errMensaje", mensaje.length < 10 ? "Cuéntanos un poco más (mínimo 10 caracteres)." : "") && ok;

    if (ok) {
      msg.textContent = "¡Gracias, " + nombre.split(" ")[0] + "! Recibimos tu mensaje (envío simulado).";
      form.reset();
    }
  });

  /* ---------- Inicio ---------- */
  renderCart();
  applyCatalog();
})();
