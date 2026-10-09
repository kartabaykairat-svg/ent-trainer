(function () {
  "use strict";

  var LANGS = [["en", "EN"], ["ru", "RU"], ["kk", "KZ"]];
  var D = window.DATA;
  // SPA mode: all pages ship as <template data-page> in one file (artifact build).
  var SPA = !!document.querySelector("template[data-page]");
  var page = SPA ? routeFromHash().page : document.body.dataset.page;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var lang = detectLang();

  /* ---------- i18n ---------- */
  function detectLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (isLang(q)) return q;
    try { var s = localStorage.getItem("ss-lang"); if (isLang(s)) return s; } catch (e) {}
    var n = (navigator.language || "en").slice(0, 2).toLowerCase();
    if (n === "kk" || n === "kz") return "kk";
    return n === "ru" ? "ru" : "en";
  }
  function isLang(v) { return LANGS.some(function (l) { return l[0] === v; }); }
  function t(key) { var d = window.I18N[lang]; return (d && d[key]) || window.I18N.en[key] || key; }
  function L(v) { return v && typeof v === "object" ? (v[lang] || v.en) : v; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function routeFromHash() {
    var h = location.hash.slice(1);
    if (h.indexOf("p-") === 0) return { page: "project", slug: h.slice(2) };
    return { page: document.querySelector('template[data-page="' + h + '"]') ? h : "home" };
  }
  function u(path, extra) {
    if (SPA) {
      if (extra && extra.p) return "#p-" + extra.p;
      var name = path.replace(".html", "");
      return "#" + (name === "index" ? "home" : name);
    }
    var p = new URLSearchParams(extra || {});
    p.set("lang", lang);
    return path + "?" + p.toString();
  }

  function applyI18n(root) {
    root.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.dataset.i18nPh)); });
    root.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    root.querySelectorAll("[data-i18n-title]").forEach(function (el) { el.setAttribute("title", t(el.dataset.i18nTitle)); });
  }

  function setMeta() {
    document.documentElement.lang = lang === "kk" ? "kk" : lang;
    if (page !== "project") document.title = t("meta." + page + ".title");
    var desc = document.querySelector('meta[name="description"]');
    if (desc && page !== "project") desc.setAttribute("content", t("meta." + page + ".desc"));
    var og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute("content", { en: "en_GB", ru: "ru_RU", kk: "kk_KZ" }[lang]);
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem("ss-lang", lang); } catch (e) {}
    if (!SPA) {
      var p = new URLSearchParams(location.search);
      p.set("lang", lang);
      history.replaceState(null, "", location.pathname + "?" + p.toString() + location.hash);
    }
    render();
  }

  /* ---------- Layout ---------- */
  var NAV = [["work", "work.html"], ["about", "about.html"], ["equipment", "equipment.html"], ["team", "team.html"], ["reviews", "reviews.html"], ["contact", "contact.html"]];

  function navLinks() {
    return NAV.map(function (n) {
      var cur = page === n[0] || (page === "project" && n[0] === "work") ? ' aria-current="page"' : "";
      return '<li><a href="' + u(n[1]) + '"' + cur + ">" + esc(t("nav." + n[0])) + "</a></li>";
    }).join("");
  }

  function langSwitch() {
    return '<div class="lang" role="group" aria-label="' + esc(t("a11y.lang")) + '">' +
      LANGS.map(function (l) {
        return '<button type="button" data-lang="' + l[0] + '" aria-pressed="' + (l[0] === lang) + '" lang="' + l[0] + '">' + l[1] + "</button>";
      }).join("") + "</div>";
  }

  function renderHeader() {
    var h = document.getElementById("site-header");
    h.className = "site-header";
    h.innerHTML =
      '<div class="wrap">' +
        '<a class="logo" href="' + u("index.html") + '" aria-label="Sarah Studio — ' + esc(t("nav.home")) + '">Sarah Studio<span>.</span></a>' +
        '<nav class="nav" aria-label="Main"><ul>' + navLinks() + "</ul></nav>" +
        '<div class="header-tools">' + langSwitch() +
          '<button class="burger" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="' + esc(t("a11y.menu")) + '"><span></span><span></span></button>' +
        "</div>" +
      "</div>";

    var m = document.getElementById("mobile-menu");
    m.className = "mobile-menu";
    m.innerHTML = '<nav aria-label="Mobile"><ul>' + navLinks() + "</ul></nav>" +
      '<a class="btn" href="' + u("contact.html") + '">' + esc(t("common.start")) + "</a>";

    var burger = h.querySelector(".burger");
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true";
      burger.setAttribute("aria-expanded", open);
      m.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
    });
    h.querySelectorAll("[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.dataset.lang); });
    });
    updateHeader();
  }

  function renderFooter() {
    var f = document.getElementById("site-footer");
    f.className = "site-footer";
    var social = [
      ["Instagram", "https://instagram.com/sarahstudio", "@sarahstudio"],
      ["Facebook", "https://facebook.com/sarahstudio", ""],
      ["Vimeo", "https://vimeo.com/sarahstudio", ""],
      ["YouTube", "https://youtube.com/@sarahstudio", ""],
      ["LinkedIn", "https://linkedin.com/company/sarahstudio", ""]
    ];
    f.innerHTML =
      '<div class="wrap">' +
        '<p class="footer__big">' + t("footer.lets") + "</p>" +
        '<div class="footer__grid">' +
          "<div>" +
            "<h3>" + esc(t("footer.newsletter")) + "</h3>" +
            "<p>" + esc(t("footer.newsletterText")) + "</p>" +
            '<form class="newsletter" novalidate>' +
              '<label class="sr-only" for="nl-email">' + esc(t("footer.emailPh")) + "</label>" +
              '<input id="nl-email" type="email" required autocomplete="email" placeholder="' + esc(t("footer.emailPh")) + '">' +
              '<button type="submit">' + esc(t("footer.subscribe")) + " →</button>" +
            "</form>" +
            '<p class="newsletter-msg" role="status" aria-live="polite"></p>' +
          "</div>" +
          '<div><h3>' + esc(t("footer.follow")) + '</h3><ul class="socials">' +
            social.map(function (s) {
              return '<li><a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + (s[2] ? " <small>" + s[2] + "</small>" : "") + "</a></li>";
            }).join("") +
          "</ul></div>" +
          "<div><h3>" + esc(t("footer.studio")) + "</h3>" +
            "<p>" + t("contact.addressV") + "</p>" +
            '<p><a href="mailto:hello@sarahstudio.co.uk">hello@sarahstudio.co.uk</a><br><a href="tel:+442079460123">+44 20 7946 0123</a></p>' +
          "</div>" +
        "</div>" +
        '<p class="demo-note">' + esc(t("demo.note")) + "</p>" +
        '<div class="footer__bottom"><span>' + esc(t("footer.rights")) + "</span><span>Westminster · London · SW1A</span></div>" +
      "</div>";

    var form = f.querySelector(".newsletter");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input");
      var msg = f.querySelector(".newsletter-msg");
      if (!validEmail(input.value)) { msg.textContent = t("form.badEmail"); input.focus(); return; }
      msg.textContent = t("footer.subscribed");
      form.reset();
    });
  }

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()); }

  /* ---------- Posters & cards ---------- */
  function posterHTML(p) {
    return '<div class="poster poster--' + p.poster + '" aria-hidden="true">' +
      '<div class="poster__shape"></div>' +
      '<div class="poster__top"><span>Sarah Studio</span><span>' + p.year + "</span></div>" +
      '<div class="poster__title">' + esc(p.title) + "</div>" +
    "</div>";
  }

  function cardHTML(p) {
    return '<a class="card reveal" href="' + u("project.html", { p: p.slug }) + '" data-cat="' + p.cat + '" data-video="' + esc(p.video || "") + '">' +
      '<div class="card__media">' + posterHTML(p) +
        '<span class="card__play">' + esc(t("common.watch")) + "</span></div>" +
      '<div class="card__info"><div><div class="card__title">' + esc(p.title) + '</div><div class="muted" style="font-size:14px;margin-top:6px">' + esc(p.client) + "</div></div>" +
        '<div class="card__meta">' + esc(t("cat." + p.cat)) + "<br>" + p.year + "</div></div>" +
    "</a>";
  }

  var missingVideo = {};
  function bindCardVideos(root) {
    if (!finePointer || reduceMotion) return;
    root.querySelectorAll(".card[data-video]").forEach(function (card) {
      var src = card.dataset.video;
      if (!src) return;
      var v;
      card.addEventListener("mouseenter", function () {
        if (missingVideo[src]) return;
        if (!v) {
          v = document.createElement("video");
          v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
          v.setAttribute("aria-hidden", "true");
          v.addEventListener("error", function () { missingVideo[src] = true; v.remove(); v = null; });
          v.addEventListener("playing", function () { v && v.classList.add("is-playing"); });
          v.src = src;
          card.querySelector(".card__media").appendChild(v);
        }
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      });
      card.addEventListener("mouseleave", function () {
        if (v) { v.pause(); v.classList.remove("is-playing"); }
      });
    });
  }

  /* ---------- Pages ---------- */
  var pages = {
    home: function () {
      var grid = document.getElementById("featured");
      grid.innerHTML = D.projects.filter(function (p) { return p.featured; }).slice(0, 6).map(cardHTML).join("");
      bindCardVideos(grid);
      var items = D.clients.concat(D.clients).map(function (c) { return '<span class="marquee__item">' + esc(c) + "</span>"; }).join("");
      document.getElementById("marquee").innerHTML = items;
    },

    work: function () {
      var grid = document.getElementById("projects");
      var cats = ["all", "film", "commercial", "music", "doc"];
      var active = SPA ? "all" : (location.hash || "").slice(1);
      if (cats.indexOf(active) < 0) active = "all";
      grid.innerHTML = D.projects.map(cardHTML).join("");
      bindCardVideos(grid);
      var f = document.getElementById("filters");
      f.innerHTML = cats.map(function (c) {
        var n = c === "all" ? D.projects.length : D.projects.filter(function (p) { return p.cat === c; }).length;
        return '<button type="button" data-filter="' + c + '" aria-pressed="' + (c === active) + '">' + esc(t("cat." + c)) + "<sup>" + n + "</sup></button>";
      }).join("");
      function apply(c) {
        f.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.filter === c); });
        grid.querySelectorAll(".card").forEach(function (card) {
          card.classList.toggle("is-hidden", c !== "all" && card.dataset.cat !== c);
        });
        if (!SPA) history.replaceState(null, "", location.pathname + location.search + (c === "all" ? "" : "#" + c));
      }
      f.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (b) apply(b.dataset.filter);
      });
      apply(active);
    },

    project: function () {
      var slug = SPA ? routeFromHash().slug : new URLSearchParams(location.search).get("p");
      var idx = Math.max(0, D.projects.findIndex(function (p) { return p.slug === slug; }));
      var p = D.projects[idx];
      var next = D.projects[(idx + 1) % D.projects.length];
      document.title = p.title + " — Sarah Studio";
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute("content", L(p.text));

      var hero = document.getElementById("p-hero");
      hero.innerHTML = posterHTML(p);
      if (p.video && !reduceMotion) {
        var v = document.createElement("video");
        v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = "metadata";
        v.setAttribute("aria-label", p.title);
        v.addEventListener("playing", function () { v.classList.add("is-playing"); });
        v.addEventListener("error", function () { v.remove(); });
        v.src = p.video;
        hero.appendChild(v);
      }

      document.getElementById("p-title").textContent = p.title;
      document.getElementById("p-text").textContent = L(p.text);
      document.getElementById("p-facts").innerHTML = [
        ["common.client", esc(p.client)], ["common.year", p.year], ["common.role", esc(L(p.role))], ["common.category", esc(t("cat." + p.cat))]
      ].map(function (f) { return '<div class="fact"><dt>' + esc(t(f[0])) + "</dt><dd>" + f[1] + "</dd></div>"; }).join("");

      var frames = ["#0B2A6F", "#071C4A", "#D62828", "#1F4FB5", "#0B1630"];
      document.getElementById("p-stills").innerHTML = [0, 1, 2].map(function (i) {
        var img = p.stills && p.stills[i];
        var inner = img
          ? '<img src="' + esc(img) + '" alt="' + esc(p.title) + " — still " + (i + 1) + '" loading="lazy">'
          : stillSVG(frames[(idx + i) % frames.length], i);
        return '<figure class="still reveal" style="margin:0">' + inner +
          '<figcaption class="still__cap">' + esc(p.title.toUpperCase()) + " · " + String(i + 1).padStart(2, "0") + " · 2.39:1</figcaption></figure>";
      }).join("");

      document.getElementById("p-credits").innerHTML = ["director", "dop", "producer", "editor"].map(function (k) {
        return "<div><dt>" + esc(t("credit." + k)) + "</dt><dd>" + esc(p.credits[k]) + "</dd></div>";
      }).join("");

      var nx = document.getElementById("p-next");
      nx.href = u("project.html", { p: next.slug });
      nx.querySelector(".h-l").textContent = next.title;
    },

    reviews: function () {
      document.getElementById("quotes").innerHTML = D.reviews.map(function (r) {
        return '<figure class="quote reveal" style="margin:0">' +
          '<figcaption class="quote__who"><strong>' + esc(r.name) + "</strong><span class=\"muted\">" + esc(L(r.title)) + "</span><span>" + esc(r.company) + "</span>" +
          '<span class="quote__logo" aria-label="' + esc(r.company) + ' logo">' + esc(r.logo) + "</span></figcaption>" +
          "<blockquote>" + esc(L(r.quote)) + "</blockquote>" +
        "</figure>";
      }).join("");
      document.getElementById("press").innerHTML = D.press.map(function (p) {
        return '<article class="reveal"><span class="src">' + esc(p.src) + "</span><p>“" + esc(L(p.quote)) + "”</p></article>";
      }).join("");
      document.getElementById("awards").innerHTML = awardsList();
    },

    equipment: function () {
      document.getElementById("eq").innerHTML = D.equipment.map(function (g, i) {
        return '<section class="eq__group reveal" aria-labelledby="eq-' + g.key + '">' +
          '<div><span class="eq__num">' + String(i + 1).padStart(2, "0") + " / " + String(D.equipment.length).padStart(2, "0") + "</span>" +
          '<h2 id="eq-' + g.key + '">' + esc(t("equipment." + g.key)) + "</h2></div>" +
          "<table><tbody>" + g.items.map(function (it) {
            return "<tr><td>" + esc(L(it[0])) + "</td><td>" + esc(L(it[1])) + "</td></tr>";
          }).join("") + "</tbody></table>" +
        "</section>";
      }).join("");
    },

    team: function () {
      document.getElementById("team").innerHTML = D.team.map(function (m, i) {
        var photo = m.photo
          ? '<img src="' + esc(m.photo) + '" alt="' + esc(m.name + ", " + L(m.role)) + '" loading="lazy">'
          : portraitSVG(m, i);
        return '<article class="member reveal" tabindex="0">' +
          '<div class="member__photo">' + photo + "</div>" +
          "<h3>" + esc(m.name) + "</h3>" +
          '<div class="member__role">' + esc(L(m.role)) + "</div>" +
          '<p class="member__quote">“' + esc(L(m.quote)) + "”</p>" +
        "</article>";
      }).join("");
    },

    about: function () {
      document.getElementById("awards").innerHTML = awardsList();
    },

    contact: function () {
      var form = document.getElementById("contact-form");
      var sel = form.querySelector("#f-type");
      var keep = sel.value;
      sel.innerHTML = '<option value="">' + esc(t("form.select")) + "</option>" +
        ["film", "commercial", "music", "doc"].map(function (c) { return '<option value="' + c + '">' + esc(t("cat." + c)) + "</option>"; }).join("") +
        '<option value="other">' + esc(t("form.other")) + "</option>";
      sel.value = keep;
      var bud = form.querySelector("#f-budget");
      var keepB = bud.value;
      bud.innerHTML = '<option value="">' + esc(t("form.select")) + "</option>" +
        ["b1", "b2", "b3", "b4", "b5"].map(function (b) { return '<option value="' + b + '">' + esc(t("form." + b)) + "</option>"; }).join("");
      bud.value = keepB;

      if (form.dataset.bound) return;
      form.dataset.bound = "1";
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = true;
        form.querySelectorAll("[required]").forEach(function (el) {
          var field = el.closest(".field");
          var bad = !el.value.trim() || (el.type === "email" && !validEmail(el.value));
          field.classList.toggle("is-invalid", bad);
          field.querySelector(".err").textContent = el.type === "email" && el.value.trim() ? t("form.badEmail") : t("form.required");
          if (bad && ok) { el.focus(); ok = false; }
        });
        if (!ok) return;
        var v = function (id) { return form.querySelector(id).value.trim(); };
        var typeTxt = sel.value ? sel.options[sel.selectedIndex].text : "—";
        var budTxt = bud.value ? bud.options[bud.selectedIndex].text : "—";
        var body = t("form.name") + ": " + v("#f-name") + "\n" + t("form.email") + ": " + v("#f-email") + "\n" +
          t("form.type") + ": " + typeTxt + "\n" + t("form.budget") + ": " + budTxt + "\n\n" + v("#f-message");
        var status = form.querySelector(".form__status");
        var mail = "mailto:hello@sarahstudio.co.uk?subject=" + encodeURIComponent("Project enquiry — " + v("#f-name")) + "&body=" + encodeURIComponent(body);
        status.innerHTML = "<p>" + esc(t("form.sent")) + '</p><pre class="brief" tabindex="0"></pre>' +
          '<p class="brief__actions"><button type="button" class="link" data-copy>' + esc(t("form.copy")) + '</button> <a class="link" href="' + mail + '">hello@sarahstudio.co.uk</a></p>';
        status.querySelector(".brief").textContent = body;
        status.querySelector("[data-copy]").addEventListener("click", function (ev) {
          var btn = ev.currentTarget, pre = status.querySelector(".brief");
          var done = function () { btn.textContent = t("form.copied"); };
          var fallback = function () { var r = document.createRange(); r.selectNodeContents(pre); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); };
          try { navigator.clipboard.writeText(body).then(done, fallback); } catch (err) { fallback(); }
        });
        status.classList.add("is-visible");
      });
      form.querySelectorAll("input, textarea").forEach(function (el) {
        el.addEventListener("input", function () { el.closest(".field").classList.remove("is-invalid"); });
      });
    }
  };

  function awardsList() {
    return D.awards.map(function (a) {
      return '<li class="reveal"><span class="yr">' + a.year + '</span><span class="ttl">' + esc(a.title) + '</span><span class="sub">' + esc(L(a.sub)) + "</span></li>";
    }).join("");
  }

  function stillSVG(bg, i) {
    var shapes = [
      '<rect y="70%" width="100%" height="30%" fill="#071C4A"/><circle cx="72%" cy="58%" r="9%" fill="#D62828"/>',
      '<rect x="18%" y="20%" width="1" height="60%" fill="#fff" opacity=".5"/><rect x="18%" y="62%" width="64%" height="1" fill="#fff" opacity=".35"/><rect x="60%" y="28%" width="14%" height="34%" fill="#fff" opacity=".9"/>',
      '<circle cx="30%" cy="50%" r="22%" fill="none" stroke="#fff" stroke-opacity=".5"/><rect x="0" y="49.8%" width="100%" height="1" fill="#D62828"/>'
    ];
    return '<svg class="still__fill" viewBox="0 0 239 100" preserveAspectRatio="none" width="100%" height="100%" role="img" aria-label="Still frame placeholder">' +
      '<rect width="100%" height="100%" fill="' + bg + '"/>' + shapes[i % shapes.length] + "</svg>";
  }

  function portraitSVG(m, i) {
    var initials = m.name.split(" ").map(function (s) { return s[0]; }).join("");
    var tones = ["#F2E6DA", "#E8D2BF", "#C99B7A", "#8D5B3E", "#E9CBB0", "#B98260", "#F0DCCB", "#D9B49A"];
    var skin = tones[i % tones.length];
    return '<svg viewBox="0 0 300 400" role="img" aria-label="' + esc(m.name + ", " + L(m.role)) + '">' +
      '<rect width="300" height="400" fill="' + m.hue + '"/>' +
      '<circle cx="230" cy="80" r="46" fill="#fff" opacity=".12"/>' +
      '<path d="M40 400c8-80 52-120 110-120s102 40 110 120z" fill="#0B1630"/>' +
      '<rect x="128" y="236" width="44" height="54" fill="' + skin + '"/>' +
      '<ellipse cx="150" cy="190" rx="58" ry="70" fill="' + skin + '"/>' +
      '<text x="24" y="44" font-family="Inter Tight, Arial" font-weight="800" font-size="22" fill="#fff" letter-spacing="2">' + esc(initials) + "</text>" +
    "</svg>";
  }

  /* ---------- Hero ---------- */
  function initHero() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var v = hero.querySelector("video");
    var conn = navigator.connection || {};
    if (v && !reduceMotion && !conn.saveData) {
      var load = function () {
        v.src = v.dataset.src;
        v.addEventListener("playing", function () { v.classList.add("is-playing"); });
        v.addEventListener("error", function () { v.remove(); });
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      };
      if (document.readyState === "complete") load(); else window.addEventListener("load", load);
    }
    var tc = hero.querySelector("[data-tc]");
    if (tc && !reduceMotion) {
      var start = performance.now();
      (function tick(now) {
        if (!tc.isConnected) return;
        var s = (now - start) / 1000, f = Math.floor((s % 1) * 24);
        var pad = function (n) { return String(Math.floor(n)).padStart(2, "0"); };
        tc.textContent = pad(s / 3600) + ":" + pad((s / 60) % 60) + ":" + pad(s % 60) + ":" + pad(f);
        requestAnimationFrame(tick);
      })(start);
    }
  }

  /* ---------- Header over dark hero ---------- */
  function updateHeader() {
    var h = document.getElementById("site-header");
    var dark = document.querySelector(".hero, .p-hero");
    if (!h || !dark || dark.querySelector(".poster--2, .poster--5")) return;
    h.classList.toggle("is-over-hero", window.scrollY < dark.offsetHeight - h.offsetHeight);
  }

  /* ---------- Reveal ---------- */
  var io = "IntersectionObserver" in window && !reduceMotion
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
    : null;
  function observeReveals() {
    document.querySelectorAll(".reveal:not(.is-in)").forEach(function (el) {
      if (io) io.observe(el); else el.classList.add("is-in");
    });
  }

  /* ---------- Cursor ---------- */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    var c = document.createElement("div");
    c.className = "cursor"; c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    document.documentElement.classList.add("has-cursor");
    var x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener("mousemove", function (e) { x = e.clientX; y = e.clientY; c.classList.add("is-visible"); }, { passive: true });
    document.addEventListener("mouseleave", function () { c.classList.remove("is-visible"); });
    document.addEventListener("mouseover", function (e) {
      c.classList.toggle("is-hover", !!e.target.closest("a, button, select, label, .member, input[type=submit]"));
    });
    (function loop() {
      cx += (x - cx) * 0.25; cy += (y - cy) * 0.25;
      c.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Page transitions ---------- */
  function initTransitions() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      var href = a.getAttribute("href") || "";
      if (!/\.html(\?|#|$)/.test(href) || /^https?:/.test(href)) return;
      if (reduceMotion) return;
      e.preventDefault();
      document.body.classList.add("is-leaving");
      setTimeout(function () { location.href = href; }, 320);
    });
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) document.body.classList.remove("is-leaving");
    });
  }

  /* ---------- Boot ---------- */
  function render() {
    setMeta();
    renderHeader();
    renderFooter();
    applyI18n(document);
    document.querySelectorAll("a[data-href]").forEach(function (a) { a.href = u(a.dataset.href); });
    if (pages[page]) pages[page]();
    observeReveals();
  }

  function mountRoute() {
    page = routeFromHash().page;
    document.body.dataset.page = page;
    var main = document.getElementById("main");
    main.innerHTML = "";
    main.appendChild(document.querySelector('template[data-page="' + page + '"]').content.cloneNode(true));
    var m = document.getElementById("mobile-menu");
    if (m) document.body.classList.remove("menu-open");
    window.scrollTo(0, 0);
  }
  if (SPA) {
    mountRoute();
    window.addEventListener("hashchange", function () {
      var h = location.hash.slice(1);
      if (h.indexOf("p-") !== 0 && h && !document.querySelector('template[data-page="' + h + '"]')) return;
      mountRoute(); render(); initHero(); updateHeader(); main_focus();
    });
  }
  function main_focus() { var h = document.querySelector("#main h1"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }

  render();
  initHero();
  initCursor();
  initTransitions();
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", updateHeader);
  requestAnimationFrame(function () { document.body.classList.add("is-ready"); });
})();
