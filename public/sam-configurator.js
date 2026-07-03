/**
 * SAM Booth Configurator — Framery-style accordion UI
 *
 * Data source: Payload CMS API.
 * PALETTES is populated at boot via fetchCatalogue() — see SamApp().
 */

/* ================================================================
   COLOUR PALETTES — hydrated from API at boot
   ================================================================ */
const PALETTES = {};

// Local-only swatch image overrides. Keyed by code; merged on top of API
// color data. Interior PET felt textures live in assets/swatches/; accessory
// upholstery (bench/sofa) woven textures live in assets/access-swatches/.
const LOCAL_SWATCH_IMAGES = {
  // Interior PET (felt)
  BWH: "/assets/swatches/BWH.jpg",
  LTG: "/assets/swatches/LTG.jpg",
  DKG: "/assets/swatches/DKG.jpg",
  BUR: "/assets/swatches/BUR.jpg",
  TAU: "/assets/swatches/TAU.jpg",
  GRN: "/assets/swatches/GRN.jpg",
  BLU: "/assets/swatches/BLU.jpg",
  // Accessory upholstery (woven) — Flex Bench / Milli Sofa
  GYE: "/assets/access-swatches/GYE.jpg",
  GPP: "/assets/access-swatches/GPP.jpg",
  GGR: "/assets/access-swatches/GGR.jpg",
  GDG: "/assets/access-swatches/GDG.jpg",
  GDB: "/assets/access-swatches/GDB.jpg",
  GLB: "/assets/access-swatches/GLB.jpg",
  GRD: "/assets/access-swatches/GRD.jpg",
  GBN: "/assets/access-swatches/GBN.jpg"
};

// Brand logo. Hosted on S3 so it can be swapped (e.g. different colour
// variants) without a code change or redeploy — just replace this file on S3
// (same path + name) and make it public. Falls back to the bundled copy if the
// S3 object is missing, so the header never renders without a logo.
const LOGO_URL = "https://kolo-website.s3.eu-west-1.amazonaws.com/SamWebp/brand/koplus-logo.webp";
const LOGO_FALLBACK = "/assets/koplus-logo.png";
const LOGO_ONERROR = `this.onerror=null;this.src='${LOGO_FALLBACK}'`;

// Local order overrides for a palette, by palette key. Codes listed here are
// reordered to this sequence; any codes not listed keep their API order at the
// end. Used to mirror the canonical Gabriel Medley swatch order from
// koplus.com/en/accessories/discuter-system (Slate Grey, Mocha Brown, Mustard
// Yellow, Scarlet Red, Fuchsia Purple, Indigo Blue, Sky Teal, Matcha Green).
const LOCAL_PALETTE_ORDER = {
  accUpholstery: ["GDG", "GBN", "GYE", "GRD", "GPP", "GDB", "GLB", "GGR"]
};

// Convert a palette object into a swatch array.
//   codes        — whitelist: only these codes (in given order)
//   excludeCodes — blacklist: all codes except these
// If both are provided, whitelist wins.
function getPalette(paletteKey, codes, excludeCodes) {
  const palette = PALETTES[paletteKey];
  if (!palette) return [];
  let keys = (codes && codes.length) ? codes : Object.keys(palette);
  if (!codes && excludeCodes && excludeCodes.length) {
    keys = keys.filter(k => !excludeCodes.includes(k));
  }
  return keys.filter(k => palette[k]).map(k => ({ code: k, ...palette[k] }));
}

const PANEL_ICONS = {
  glass:       '<rect x="3" y="3" width="18" height="18" rx="2"/>',
  wall:        '<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity=".15"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
  "glass-wall":'<rect x="12" y="3" width="9" height="18" rx="1" fill="currentColor" opacity=".15"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
  "wall-glass":'<rect x="3" y="3" width="9" height="18" rx="1" fill="currentColor" opacity=".15"/><rect x="3" y="3" width="18" height="18" rx="2"/>'
};
PANEL_ICONS["2glass"] = PANEL_ICONS.glass;
PANEL_ICONS["2wall"]  = PANEL_ICONS.wall;

/* ================================================================
   SVG ICONS
   ================================================================ */
const ICON_CHEVRON_DOWN = '<svg class="h-5 w-5 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19 9-7 7-7-7"/></svg>';
const ICON_LOCK = '<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path stroke-linecap="round" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

/* ================================================================
   API CLIENT — fetches catalogue from Payload CMS
   ================================================================ */
async function fetchCatalogue(apiBase) {
  const [productsRes, colorsRes, seriesRes] = await Promise.all([
    fetch(`${apiBase}/api/products?depth=2&limit=100&sort=sortOrder`),
    fetch(`${apiBase}/api/colors?depth=1&limit=200&sort=sortOrder`),
    fetch(`${apiBase}/api/series?depth=0&limit=100&sort=sortOrder`)
  ]);
  if (!productsRes.ok) throw new Error(`Products fetch failed: ${productsRes.status}`);
  if (!colorsRes.ok)   throw new Error(`Colors fetch failed: ${colorsRes.status}`);
  if (!seriesRes.ok)   throw new Error(`Series fetch failed: ${seriesRes.status}`);
  const productsJson = await productsRes.json();
  const colorsJson   = await colorsRes.json();
  const seriesJson   = await seriesRes.json();
  return { products: productsJson.docs, colors: colorsJson.docs, series: seriesJson.docs };
}

// Build the PALETTES dictionary from the colors collection.
function buildPalettesFromApi(colors) {
  const out = {};
  for (const c of colors) {
    const paletteKey = (c.palette && c.palette.key) || null;
    if (!paletteKey) continue;
    if (!out[paletteKey]) out[paletteKey] = {};
    const entry = {
      name: c.name,
      bg: c.bgColor,
      border: c.borderColor || c.bgColor
    };
    if (LOCAL_SWATCH_IMAGES[c.code]) entry.swatch = LOCAL_SWATCH_IMAGES[c.code];
    out[paletteKey][c.code] = entry;
  }
  // Apply any local order overrides (e.g. accUpholstery → koplus.com sequence).
  // Object key insertion order drives getPalette()'s default order.
  for (const key in LOCAL_PALETTE_ORDER) {
    if (!out[key]) continue;
    const reordered = {};
    LOCAL_PALETTE_ORDER[key].forEach(code => {
      if (out[key][code]) reordered[code] = out[key][code];
    });
    Object.keys(out[key]).forEach(code => {
      if (!(code in reordered)) reordered[code] = out[key][code];
    });
    out[key] = reordered;
  }
  return out;
}

// Derive layer stack from base + the product's accessories.
// Layers render bottom-to-top by zIndex.
function deriveLayers(accessories) {
  const layers = [
    { key: "panel",    folder: "panel",    zIndex: 1 },
    { key: "interior", folder: "interior", zIndex: 2 }
  ];
  (accessories || []).forEach(a => {
    if (a.layerKey) {
      layers.push({ key: a.layerKey, folder: "accessories", zIndex: 3 });
    }
  });
  layers.push({ key: "exterior", folder: "exterior", zIndex: 4 });
  layers.push({ key: "door",     folder: "frame",    zIndex: 5 });
  return layers;
}

// Transform a Payload product doc into the in-memory shape the configurator expects.
function transformProduct(p) {
  const accessoryItems = (p.accessories || []).map(a => ({
    code: a.code,
    label: a.label,
    layerKey: a.layerKey,
    skuTemplate: a.skuTemplate,
    defaultColour: a.defaultColorCode,
    paletteKey: a.palette && a.palette.key,
    // Which configurator section this accessory's control renders in.
    // Defaults to the Accessory section. Set per-accessory in the CMS.
    displaySection: a.displaySection || "accessory",
    excludeCodes: (a.excludedColorCodes || []).map(x => x.code)
  }));
  const panelMissingInteriors = {};
  (p.panelRestrictions || []).forEach(r => {
    panelMissingInteriors[r.panelCode] = (r.excludedInteriorCodes || []).map(x => x.code);
  });
  return {
    key: p.slug,
    label: p.label,
    // Series this product belongs to. With depth>=1 the relationship resolves to
    // an object; fall back to the raw id/null. Used to filter by product line.
    seriesKey: (p.series && p.series.key) || null,
    title: p.title,
    subtitle: p.subtitle || "",
    skuPrefix: p.skuPrefix,
    assetBase: p.assetBaseUrl,
    allGlassCode: p.allGlassCode,
    // CMS-set default door orientation for this product (LT/RT); falls back to LT.
    defaultDoor: p.defaultDoor === "RT" ? "RT" : "LT",
    exteriorPaletteKey: p.exteriorPalette && p.exteriorPalette.key,
    interiorPaletteKey: p.interiorPalette && p.interiorPalette.key,
    layers: deriveLayers(accessoryItems),
    panels:  (p.panels  || []).map(pn => ({ code: pn.code, label: pn.label, icon: pn.icon })),
    accessories: accessoryItems.length ? { mode: "multi", items: accessoryItems } : undefined,
    panelMissingInteriors
  };
}

/* ================================================================
   APP WRAPPER
   ================================================================ */
function SamApp(appConfig) {
  const root = document.querySelector(appConfig.el);
  const apiBase = appConfig.apiBase || "http://localhost:3000";
  // Which product line to load — resolved dynamically at runtime, so one static
  // deployment serves every line with zero host config. Priority:
  //   1. appConfig.series        — hardcoded per-deployment override
  //   2. location.hash           — e.g. /#duo or /#/duo (works on any static host)
  //   3. ?series= query param    — backward-compatible fallback
  //   4. first path segment      — e.g. /duo (only if the host rewrites to index.html)
  //   5. "sam" default
  function resolveSeriesKey() {
    const hash = location.hash.replace(/^#\/?/, "").trim();
    if (hash) return hash;
    const q = new URLSearchParams(location.search).get("series");
    if (q) return q;
    const seg = location.pathname.split("/").filter(Boolean)[0];
    if (seg && !seg.includes(".")) return seg;
    return "sam";
  }
  const seriesKey = (appConfig.series || resolveSeriesKey()).toLowerCase();

  // Switching the hash (e.g. user edits /#sam → /#duo) reloads into that line.
  window.addEventListener("hashchange", () => location.reload());

  root.innerHTML = `
    <div style="min-height:60vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;color:#6b7280;font-family:system-ui,sans-serif">
      <svg class="animate-spin" style="height:32px;width:32px;color:#061629" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"></path></svg>
      <div style="font-size:14px">Loading catalogue…</div>
    </div>`;

  let products = [];
  let activeKey = "";
  // Branding for the active line (name + tagline), de-hardcoded from "SAM".
  // Falls back to SAM defaults if the series record is missing a field.
  let series = { key: seriesKey, name: "", tagline: "" };

  fetchCatalogue(apiBase)
    .then(({ products: productDocs, colors, series: seriesDocs }) => {
      // Hydrate PALETTES from API
      const built = buildPalettesFromApi(colors);
      Object.assign(PALETTES, built);
      // Resolve the active series record for branding.
      const found = (seriesDocs || []).find(s => (s.key || "").toLowerCase() === seriesKey);
      if (found) {
        series = {
          key: found.key,
          name: found.name || "",
          // Use the CMS value as-is — if it's cleared, the tagline stays empty
          // (don't fall back to the hardcoded default).
          tagline: found.tagline || ""
        };
      }
      document.title = `Koplus - ${series.name} Booth Configurator`;
      // Transform products, then keep only those in the active line.
      products = productDocs.map(transformProduct).filter(p => p.seriesKey === seriesKey);
      if (!products.length) throw new Error(`No products found for series "${seriesKey}"`);
      activeKey = products[0].key;
      window._samSwitchTo = switchTo;
      switchTo(activeKey);
    })
    .catch(err => {
      console.error("[SamApp] Catalogue load failed:", err);
      root.innerHTML = `
        <div style="min-height:60vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.5rem;color:#b91c1c;font-family:system-ui,sans-serif;text-align:center;padding:2rem">
          <div style="font-size:16px;font-weight:600">Unable to load configurator</div>
          <div style="font-size:13px;color:#6b7280">${String(err.message || err)}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:0.5rem">Make sure the Payload backend is running at ${apiBase}</div>
        </div>`;
    });

  function switchTo(key) {
    activeKey = key;
    const config = products.find(p => p.key === key);
    renderConfigurator(config);
  }

  /* ==============================================================
     CONFIGURATOR
     ============================================================== */
  function renderConfigurator(config) {
    const subtitle = config.subtitle || "";
    // The big series heading already brands the page, so drop any leading series
    // name the CMS title carries — the product title reads e.g. "Large Acoustic Booth".
    // Declared here (not in buildHTML) so the quote handlers can reference it too.
    const seriesNameRe = new RegExp("^" + series.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+", "i");
    const productTitle = config.title.replace(seriesNameRe, "");

    // ── Resolved palettes for this product ──
    const exteriorPalette = getPalette(config.exteriorPaletteKey || "exterior");
    const interiorPalette = getPalette("interior");

    // Pre-resolve accessory palettes (each item: { ...item, colours: [...] })
    if (config.accessories) {
      config.accessories.items.forEach(a => {
        a.colours = getPalette(a.paletteKey, a.colourCodes, a.excludeCodes);
      });
    }

    // SAM Single: the Flex Desk is a standard feature, not an optional accessory.
    // It renders below Exterior Color and its surface colour is locked to the
    // exterior — White exterior → White desk, any other → Black desk.
    const deskItem = config.key === "single" && config.accessories
      ? config.accessories.items.find(a => a.layerKey === "accDesk")
      : null;
    const optionalAccessories = config.accessories
      ? config.accessories.items.filter(a => a !== deskItem)
      : [];

    function deskColour() {
      return state.exterior === "WH" ? "WH" : "BK";
    }
    function deskColourName(code) {
      const c = ((deskItem && deskItem.colours) || []).find(x => x.code === code);
      return c ? c.name : (code === "WH" ? "White" : "Black");
    }

    // Floor PET colour — not user-selectable; auto-assigned from the Interior PET colour
    // (the floor is baked into the interior render, so it tracks the interior).
    // Blended White (BWH) or Light Grey (LTG) → Light Grey (LTG); anything else → Dark Grey (DKG).
    // Reuses the Interior PET palette's Light/Dark Grey swatches.
    function floorColour() {
      return (state.interior === "BWH" || state.interior === "LTG") ? "LTG" : "DKG";
    }
    function floorColourName(code) {
      const c = interiorPalette.find(x => x.code === code);
      return c ? c.name : (code === "LTG" ? "Light Grey" : "Dark Grey");
    }

    // ── State ──
    const state = {
      door:       config.defaultDoor || "LT",
      exterior:   exteriorPalette[0].code,
      interior:   "BWH",
      panel:      config.panels[0].code
    };

    if (config.accessories) {
      state.accessories = {};
      state.accessoryColours = {};
      config.accessories.items.forEach(a => {
        state.accessories[a.code] = false;
        if (a.colours && a.colours.length) {
          state.accessoryColours[a.code] = a.defaultColour || a.colours[0].code;
        }
      });
      // Desk is standard (always rendered) with its colour locked to the exterior.
      if (deskItem) {
        state.accessories[deskItem.code] = true;
        state.accessoryColours[deskItem.code] = deskColour();
      }
    }

    // ── Layer URL builder — standardised Sam612 S3 layout ──
    // Uniform across all products:
    //   {base}/{slug}/L1-door/{door}.webp
    //   {base}/{slug}/L2-exterior/{colour}.webp
    //   {base}/{slug}/L4-interior/{colour}.webp
    //   {base}/{slug}/L5-panel/{panelCode}/{interior|000}.webp   (000 = all-glass)
    //   {base}/{slug}/L3-accessory/{type}/{colour}.webp
    // Asset base comes from the product's `assetBaseUrl` in Payload CMS
    // (e.g. .../SamWebp/single). Falls back to the standard SamWebp path by slug.
    const productBase = config.assetBase || `https://kolo-website.s3.eu-west-1.amazonaws.com/SamWebp/${config.key}`;

    // Accessory type from its SKU template: "L3_AC_FB_{colour}" → "FB".
    function accType(skuTemplate) {
      const parts = skuTemplate.split("_");
      return parts[parts.length - 2];
    }

    // Returns the S3 URL for a layer key, or null if the layer is currently off.
    function buildLayerUrl(key) {
      switch (key) {
        case "door":     return `${productBase}/L1-door/${state.door}.webp`;
        case "exterior": return `${productBase}/L2-exterior/${state.exterior}.webp`;
        case "interior": return `${productBase}/L4-interior/${state.interior}.webp`;
        case "panel": {
          // Folder = the panel code itself (e.g. GS_NA, GS_GS). All-glass uses 000;
          // wall panels take the interior colour.
          const file = state.panel === config.allGlassCode ? "000" : state.interior;
          return `${productBase}/L5-panel/${state.panel}/${file}.webp`;
        }
        default: {
          if (!config.accessories) return null;
          const acc = config.accessories.items.find(a => a.layerKey === key);
          if (!acc || !state.accessories[acc.code]) return null;
          const colour = state.accessoryColours[acc.code];
          return `${productBase}/L3-accessory/${accType(acc.skuTemplate)}/${colour}.webp`;
        }
      }
    }

    // ── Render ──
    root.innerHTML = buildHTML();

    // ── DOM refs ──
    const layerEls = {};
    const thumbEls = {};
    config.layers.forEach(l => {
      layerEls[l.key] = root.querySelector(`#layer-${l.key}`);
      thumbEls[l.key] = root.querySelector(`#thumb-${l.key}`);
    });
    const placeholder  = root.querySelector("#img-placeholder");
    const exteriorSec  = root.querySelector('[data-row="exterior"]');
    const interiorSec  = root.querySelector('[data-row="interior"]');
    const deskSec      = root.querySelector('[data-row="desk"]');
    const floorSec     = root.querySelector('[data-row="floor"]');

    // ── Accordion logic ──
    root.querySelectorAll(".cfg-row-header").forEach(header => {
      header.addEventListener("click", () => {
        const row = header.closest(".cfg-row");
        const body = row.querySelector(".cfg-row-body");
        const chevron = header.querySelector(".chevron");
        const isOpen = body.classList.contains("open");

        if (isOpen) {
          body.classList.remove("open");
          if (chevron) chevron.style.transform = "";
          row.classList.remove("ring-2", "ring-[#061629]");
          row.classList.add("ring-1", "ring-gray-200");
        } else {
          body.classList.add("open");
          if (chevron) chevron.style.transform = "rotate(180deg)";
          row.classList.remove("ring-1", "ring-gray-200");
          row.classList.add("ring-2", "ring-[#061629]");
        }
      });
    });

    // Section accordions
    root.querySelectorAll(".section-toggle").forEach(toggle => {
      toggle.addEventListener("click", () => {
        const section = toggle.closest(".cfg-section");
        const body = section.querySelector(".section-body");
        const chevron = toggle.querySelector(".section-chevron");
        const isOpen = !body.classList.contains("hidden");
        body.classList.toggle("hidden");
        chevron.style.transform = isOpen ? "" : "rotate(180deg)";
      });
    });

    // Helper: update row summary text
    function updateRowSummary(rowId, text) {
      const el = root.querySelector(`[data-row="${rowId}"] .row-value`);
      if (el) el.textContent = text;
    }

    // ── Image loading ──
    // Preload + decode the affected layers off-screen, then swap them all
    // in place in a single frame. The old images stay visible until every
    // new one is decoded, so the switch is instant and the layers never
    // desync — no fade-out gap, no flicker.
    function loadLayers(keys) {
      const jobs = [];
      keys.forEach(key => {
        const img = layerEls[key];
        if (!img) return;
        const thumb = thumbEls[key];
        const newSrc = buildLayerUrl(key);
        if (!newSrc) {
          img.removeAttribute("src"); img.style.opacity = 0;
          if (thumb) { thumb.removeAttribute("src"); thumb.style.opacity = 0; }
          return;
        }
        if (img.src === newSrc && img.style.opacity === "1") return;
        const preload = new Image();
        preload.src = newSrc;
        const decoded = preload.decode
          ? preload.decode().then(() => true, () => false)
          : new Promise(res => { preload.onload = () => res(true); preload.onerror = () => res(false); });
        jobs.push(decoded.then(ok => ({ img, thumb, newSrc, ok })));
      });
      if (!jobs.length) return;
      Promise.all(jobs).then(results => {
        results.forEach(({ img, thumb, newSrc, ok }) => {
          if (ok) img.src = newSrc;
          img.style.opacity = ok ? 1 : 0;
          if (thumb) {
            if (ok) { thumb.src = newSrc; thumb.style.opacity = 1; }
            else thumb.style.opacity = 0;
          }
        });
        hidePlaceholder();
      });
    }

    function loadLayer(key) { loadLayers([key]); }

    function loadAllLayers() {
      Object.values(layerEls).forEach(img => { if (img) img.style.opacity = 0; });
      Object.values(thumbEls).forEach(img => { if (img) img.style.opacity = 0; });
      placeholder.classList.remove("hidden");
      const promises = config.layers.map(l => {
        const img  = layerEls[l.key];
        const thumb = thumbEls[l.key];
        const url = buildLayerUrl(l.key);
        if (!img || !url) return Promise.resolve();
        return new Promise(resolve => {
          img.style.opacity = 0;
          img.src = url;
          if (thumb) thumb.src = url;
          img.onload  = () => {
            img.style.opacity = 1;
            if (thumb) thumb.style.opacity = 1;
            resolve();
          };
          img.onerror = () => {
            img.style.opacity = 0;
            if (thumb) thumb.style.opacity = 0;
            resolve();
          };
        });
      });
      Promise.all(promises).then(() => {
        placeholder.classList.add("hidden");
        prefetchVariants();
      });
    }

    // Warm the browser cache with every colour / panel / accessory variant
    // so later swatch clicks resolve from cache and swap in with no delay.
    // Runs in the background after the initial booth has rendered.
    function prefetchVariants() {
      const urls = new Set();
      const add = u => { if (u) urls.add(u); };

      ["LT", "RT"].forEach(c => add(`${productBase}/L1-door/${c}.webp`));
      exteriorPalette.forEach(c => add(`${productBase}/L2-exterior/${c.code}.webp`));
      interiorPalette.forEach(c => add(`${productBase}/L4-interior/${c.code}.webp`));

      // All-glass panel uses 000; wall panels take the interior colour.
      config.panels.forEach(p => {
        if (p.code === config.allGlassCode) {
          add(`${productBase}/L5-panel/${p.code}/000.webp`);
        } else {
          interiorPalette.forEach(c => add(`${productBase}/L5-panel/${p.code}/${c.code}.webp`));
        }
      });

      if (config.accessories) {
        config.accessories.items.forEach(acc => {
          if (!acc.layerKey || !acc.skuTemplate) return;
          (acc.colours || []).forEach(c =>
            add(`${productBase}/L3-accessory/${accType(acc.skuTemplate)}/${c.code}.webp`));
        });
      }

      urls.forEach(url => { const img = new Image(); img.decoding = "async"; img.src = url; });
    }

    function hidePlaceholder() {
      if (Object.values(layerEls).some(img => img && img.style.opacity === "1")) {
        placeholder.classList.add("hidden");
      }
    }

    // Tint each upholstery swatch's ring to its fabric's own colour, sampled
    // from the image, so the border blends with the texture instead of showing
    // the flat catalogue colour. Same-origin images, so canvas reads are safe.
    function averageImageColour(img) {
      try {
        const cv = document.createElement("canvas");
        cv.width = cv.height = 16;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
      } catch (e) {
        return null;
      }
    }

    // Sample each fabric swatch's average colour off-screen and use it as the
    // button's border so the ring blends with the texture. The swatch URL is
    // read from the inline background-image; we load a fresh Image() for
    // sampling — the browser dedupes the request via cache.
    function tintAccessorySwatchBorders() {
      root.querySelectorAll(".acc-swatch").forEach(btn => {
        const m = btn.style.backgroundImage.match(/url\(["']?([^"')]+)/);
        if (!m) return;
        const img = new Image();
        img.onload = () => {
          const colour = averageImageColour(img);
          if (colour) btn.style.borderColor = colour;
        };
        img.src = m[1];
      });
    }


    // ── Events: Swatches ──
    function setupSwatchRow(rowEl, stateKey, layerKey) {
           rowEl.addEventListener("click", e => {
        const btn = e.target.closest(".swatch");
        if (!btn) return;
        rowEl.querySelectorAll(".swatch").forEach(s => s.classList.remove("on"));
        btn.classList.add("on");
        state[stateKey] = btn.dataset.code;
        updateRowSummary(stateKey, btn.dataset.name);
        // Interior colour also paints the back-panel walls — swap both
        // layers together so they never appear out of sync.
        if (stateKey === "interior") {
          // Floor PET is locked to the interior colour — keep its swatch in sync.
          applyFloorBinding();
          loadLayers(["interior", "panel"]);
        } else if (stateKey === "exterior") {
          if (deskItem) {
            // Desk surface is locked to the exterior — rebind and swap together.
            applyDeskBinding();
            loadLayers(["exterior", "accDesk"]);
          } else {
            loadLayer("exterior");
          }
        } else {
          loadLayer(layerKey);
        }
      });
    }

    // Keep the locked desk surface in sync with the current exterior colour.
    function applyDeskBinding() {
      if (!deskItem) return;
      const code = deskColour();
      state.accessoryColours[deskItem.code] = code;
      updateRowSummary("desk", deskColourName(code));
      if (deskSec) {
        deskSec.querySelectorAll(".desk-swatch").forEach(s =>
          s.classList.toggle("on", s.dataset.code === code));
      }
    }

    // Keep the locked Floor PET colour in sync with the current interior colour.
    function applyFloorBinding() {
      state.floor = floorColour();
      updateRowSummary("floor", floorColourName(state.floor));
      if (floorSec) {
        floorSec.querySelectorAll(".floor-swatch").forEach(s =>
          s.classList.toggle("on", s.dataset.code === state.floor));
      }
    }

    setupSwatchRow(exteriorSec, "exterior", "exterior");
    setupSwatchRow(interiorSec, "interior", "interior");

    // ── Events: Door Direction ──
    root.querySelectorAll(".door-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        root.querySelectorAll(".door-btn").forEach(b => {
          b.classList.remove("ring-2", "ring-[#061629]", "bg-blue-50");
          b.classList.add("ring-1", "ring-gray-200");
        });
        btn.classList.remove("ring-1", "ring-gray-200");
        btn.classList.add("ring-2", "ring-[#061629]", "bg-blue-50");
        state.door = btn.dataset.code;
        updateRowSummary("door", btn.dataset.name);
        loadLayer("door");
      });
    });

    // ── Interior availability based on panel (e.g. WL_WL has no BUR) ──
    const panelMissingInteriors = config.panelMissingInteriors || {};

    function updateInteriorAvailability() {
      const missing = panelMissingInteriors[state.panel] || [];
      const swatches = interiorSec.querySelectorAll(".swatch");
      swatches.forEach(btn => {
        btn.classList.toggle("unavailable", missing.includes(btn.dataset.code));
      });
      // If current interior is now unavailable, fall back to BWH
      if (missing.includes(state.interior)) {
        swatches.forEach(s => s.classList.remove("on"));
        const fallback = interiorSec.querySelector('.swatch[data-code="BWH"]');
        if (fallback) fallback.classList.add("on");
        state.interior = "BWH";
        updateRowSummary("interior", "Blended White");
      }
    }

    // ── Events: Back Panel ──
    root.querySelectorAll(".panel-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        root.querySelectorAll(".panel-btn").forEach(b => {
          b.classList.remove("ring-2", "ring-[#061629]", "bg-blue-50");
          b.classList.add("ring-1", "ring-gray-200");
        });
        btn.classList.remove("ring-1", "ring-gray-200");
        btn.classList.add("ring-2", "ring-[#061629]", "bg-blue-50");
        state.panel = btn.dataset.panel;
        updateRowSummary("backpanel", btn.dataset.label);
        updateInteriorAvailability();
        // updateInteriorAvailability may fall the interior back to BWH;
        // swap panel + interior together (the guard skips interior if unchanged).
        loadLayers(["panel", "interior"]);
      });
    });

    // Initial availability check
    updateInteriorAvailability();

    // ── Events: Accessories ──
    if (config.accessories) {
      root.querySelectorAll(".acc-toggle").forEach(btn => {
        btn.addEventListener("click", () => {
          const acc = btn.dataset.acc;
          const isOn = !state.accessories[acc];
          state.accessories[acc] = isOn;

          // Toggle wrapper border (matches the Exterior row pattern) + body open.
          const wrapper = btn.closest(".cfg-row");
          const label = btn.querySelector(".acc-status");
          const coloursEl = root.querySelector(`[data-acc-colours="${acc}"]`);
          if (isOn) {
            if (wrapper) {
              wrapper.classList.remove("ring-1", "ring-gray-200");
              wrapper.classList.add("ring-2", "ring-[#061629]", "bg-blue-50");
            }
            if (label) { label.textContent = "Added"; label.classList.add("font-bold", "text-[#061629]"); }
            if (coloursEl) coloursEl.classList.add("open");
          } else {
            if (wrapper) {
              wrapper.classList.remove("ring-2", "ring-[#061629]", "bg-blue-50");
              wrapper.classList.add("ring-1", "ring-gray-200");
            }
            if (label) { label.textContent = "Add +"; label.classList.remove("font-bold", "text-[#061629]"); }
            if (coloursEl) coloursEl.classList.remove("open");
          }

          const item = config.accessories.items.find(a => a.code === acc);
          if (item && item.layerKey) loadLayer(item.layerKey);
        });
      });

      // Colour swatch clicks for each accessory
      root.querySelectorAll("[data-acc-colours]").forEach(container => {
        const accCode = container.dataset.accColours;
        container.addEventListener("click", e => {
          const btn = e.target.closest(".acc-swatch");
          if (!btn) return;
          container.querySelectorAll(".acc-swatch").forEach(s => s.classList.remove("on"));
          btn.classList.add("on");
          state.accessoryColours[accCode] = btn.dataset.code;
          const label = container.querySelector(".acc-colour-label");
          if (label) label.textContent = btn.dataset.name;
          const item = config.accessories.items.find(a => a.code === accCode);
          if (item && item.layerKey) loadLayer(item.layerKey);
        });
      });
    }

    // ── Sticky summary bar ──
    // Build a one-line summary of the current selections for the bottom bar.
    // Order mirrors the right-side selector top-to-bottom:
    // Door Orientation · Back Panel · Exterior Colour · Tabletop Colour · Interior PET Colour · Accessory.
    function buildSummaryText() {
      const parts = [];
      // Door Orientation
      parts.push(state.door === "LT" ? "Left-handed door" : "Right-handed door");
      // Back Panel
      const panel = config.panels.find(p => p.code === state.panel);
      if (panel) {
        const lbl = panel.label || "";
        parts.push(/\bback\b/i.test(lbl) ? lbl : `${lbl} back`);
      }
      // Exterior Colour
      const ext = exteriorPalette.find(c => c.code === state.exterior);
      if (ext) parts.push(`${ext.name} exterior`);
      // Tabletop Colour (standard Flex Desk — Single only)
      if (deskItem && state.accessories[deskItem.code]) {
        const code = state.accessoryColours[deskItem.code];
        const c = (deskItem.colours || []).find(x => x.code === code);
        const colourName = c ? c.name : "";
        parts.push(colourName ? `${colourName} laminate desk` : "Laminate desk");
      }
      // Interior PET Colour
      const intP = interiorPalette.find(c => c.code === state.interior);
      if (intP) parts.push(`${intP.name} interior`);
      // Floor PET Colour (auto-assigned from the interior)
      parts.push(`${floorColourName(floorColour())} floor`);
      // Accessory (optional add-ons)
      optionalAccessories.forEach(a => {
        if (!state.accessories[a.code]) return;
        const code = state.accessoryColours[a.code];
        const c = (a.colours || []).find(x => x.code === code);
        const colourName = c ? c.name : "";
        parts.push(colourName ? `${a.label} (${colourName})` : a.label);
      });
      return parts.join(" · ");
    }

    function updateSummary() {
      const el = root.querySelector("#summary-config");
      if (el) el.textContent = buildSummaryText();
    }

    // Single delegated listener: any interactive change in the configurator
    // triggers a summary refresh (deferred so per-handler state mutations run
    // first).
    root.addEventListener("click", e => {
      if (e.target.closest(".swatch, .acc-swatch, .door-btn, .panel-btn, .acc-toggle")) {
        setTimeout(updateSummary, 0);
      }
    });

    // Reset → re-render this product with default state.
    const resetBtn = root.querySelector("#btn-reset");
    if (resetBtn) resetBtn.addEventListener("click", () => switchTo(config.key));

    // ── Request-a-quote modal ──
    const quoteModal   = root.querySelector("#quote-modal");
    const quoteBtn     = root.querySelector("#btn-quote");
    const summaryThumb = root.querySelector("#summary-thumb");
    let quoteQty = 1;

    // Mirror the live configuration into the modal's spec list.
    function fillQuoteSpecs() {
      const ext   = exteriorPalette.find(c => c.code === state.exterior);
      const intP  = interiorPalette.find(c => c.code === state.interior);
      const panel = config.panels.find(p => p.code === state.panel);
      const set = (id, val) => { const el = root.querySelector(id); if (el) el.textContent = val || "—"; };
      set("#qspec-frame",    "-"); // SAM has no outer frame.
      set("#qspec-exterior", ext && ext.name);
      set("#qspec-interior", intP && intP.name);
      set("#qspec-floor",    floorColourName(floorColour()));
      set("#qspec-door",     state.door === "LT" ? "Left Handed" : "Right Handed");
      set("#qspec-panel",    panel && panel.label);
      set("#qspec-tabletop", deskItem ? deskColourName(state.accessoryColours[deskItem.code]) : "—");
      // Selected accessories — show each row (name + chosen colour), hide the rest.
      // Rows are direct grid items so they flow and align with the other fields.
      optionalAccessories.forEach(a => {
        const row = root.querySelector(`[data-qacc="${a.code}"]`);
        if (!row) return;
        if (state.accessories[a.code]) {
          row.style.display = "";
          const c = (a.colours || []).find(x => x.code === state.accessoryColours[a.code]);
          const val = row.querySelector(`[data-qacc-val="${a.code}"]`);
          if (val) val.textContent = (c && c.name) || "—";
        } else {
          row.style.display = "none";
        }
      });
    }

    // Structured configuration snapshot for the quote payload (mirrors the Payload
    // quoteRequests.configuration group).
    function quoteConfiguration() {
      const ext   = exteriorPalette.find(c => c.code === state.exterior);
      const intP  = interiorPalette.find(c => c.code === state.interior);
      const panel = config.panels.find(p => p.code === state.panel);
      const accNames = optionalAccessories
        .filter(a => state.accessories[a.code])
        .map(a => {
          const c = (a.colours || []).find(x => x.code === state.accessoryColours[a.code]);
          return c ? `${a.label} (${c.name})` : a.label;
        });
      return {
        summary: buildSummaryText(),
        door: state.door === "LT" ? "Left Handed" : "Right Handed",
        backPanel: panel ? panel.label : "",
        exterior: ext ? ext.name : "",
        interior: intP ? intP.name : "",
        floor: floorColourName(floorColour()),
        tabletop: deskItem ? deskColourName(state.accessoryColours[deskItem.code]) : "",
        accessories: accNames.join(", "),
      };
    }

    function openQuote() {
      fillQuoteSpecs();
      // Show the form view. We intentionally DON'T reset the fields here, so if the
      // user types something, closes, and reopens, their input is still there.
      // (After a successful submit, the submit handler clears the form, so the next
      // open starts blank.)
      const details = root.querySelector("#quote-details");
      const form    = root.querySelector("#quote-form");
      const success = root.querySelector("#quote-success");
      if (details) details.classList.remove("hidden");
      if (form) form.classList.remove("hidden");
      if (success) success.classList.add("hidden");
      // Reuse the already-decoded summary-bar thumbnail for an instant preview
      // (strip ids so we don't duplicate them in the document).
      const qthumb = root.querySelector("#qmodal-thumb");
      if (qthumb && summaryThumb) {
        qthumb.innerHTML = summaryThumb.innerHTML;
        qthumb.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
      }
      quoteModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
    function closeQuote() {
      quoteModal.classList.add("hidden");
      document.body.style.overflow = "";
    }

    if (quoteBtn) quoteBtn.addEventListener("click", openQuote);
    if (quoteModal) {
      root.querySelector("#quote-close").addEventListener("click", closeQuote);
      root.querySelector("#quote-backdrop").addEventListener("click", closeQuote);
      root.querySelector("#quote-done").addEventListener("click", closeQuote);
      root.querySelector("#quote-close-x").addEventListener("click", closeQuote);
      // Click anywhere outside the panel (the scroll/centering area) closes the modal.
      root.querySelector("#quote-scroll").addEventListener("click", e => {
        if (!e.target.closest("#quote-panel")) closeQuote();
      });

      // Quantity stepper
      const qtyVal = root.querySelector("#qty-value");
      root.querySelector("#qty-minus").addEventListener("click", () => { quoteQty = Math.max(1, quoteQty - 1); qtyVal.textContent = quoteQty; });
      root.querySelector("#qty-plus").addEventListener("click",  () => { quoteQty += 1; qtyVal.textContent = quoteQty; });

      // Submit — POST to the Payload `quoteRequests` collection.
      const quoteForm = root.querySelector("#quote-form");
      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      quoteForm.addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const payload = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          country: data.country,
          address: data.address || "",
          company: data.company,
          companyType: data.companyType,
          notes: data.notes || "",
          product: `${series.name} ${productTitle}`,
          productSlug: config.key,
          quantity: quoteQty,
          configuration: quoteConfiguration(),
        };
        const originalLabel = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.6";
        submitBtn.textContent = "Submitting…";
        try {
          const res = await fetch(`${apiBase}/api/quoteRequests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          // GA4 conversion — a successful quote request is the key conversion.
          // Mark "generate_lead" as a Key event / conversion in GA4. Guarded so a
          // missing gtag (e.g. analytics blocked) never breaks the submission.
          if (typeof window.gtag === "function") {
            window.gtag("event", "generate_lead", {
              product: payload.product,
              product_slug: payload.productSlug,
              quantity: payload.quantity,
            });
          }
          // Replace the summary + form with the in-modal success state.
          root.querySelector("#quote-details").classList.add("hidden");
          quoteForm.classList.add("hidden");
          root.querySelector("#quote-success").classList.remove("hidden");
          quoteForm.reset();
          quoteQty = 1; qtyVal.textContent = 1;
        } catch (err) {
          console.error("[Quote submit] failed:", err);
          alert("Sorry, something went wrong submitting your request. Please try again.");
        } finally {
          submitBtn.disabled = false;
          submitBtn.style.opacity = "";
          submitBtn.innerHTML = originalLabel;
        }
      });

      // Esc closes the modal (replace any handler from a prior render — avoids leaks).
      if (window._samQuoteEsc) document.removeEventListener("keydown", window._samQuoteEsc);
      window._samQuoteEsc = (e) => { if (e.key === "Escape" && !quoteModal.classList.contains("hidden")) closeQuote(); };
      document.addEventListener("keydown", window._samQuoteEsc);
    }

    // ── Init ──
    loadAllLayers();
    tintAccessorySwatchBorders();
    updateSummary();

    /* ==============================================================
       HTML BUILDER
       ============================================================== */
    function buildHTML() {
      const doorName = state.door === "RT" ? "Right Handed" : "Left Handed";
      const extName  = exteriorPalette[0].name;
      const intName  = "Blended White";
      const panelName = config.panels[0].label;

      return `
  <header class="border-b border-gray-200 px-6 py-4">
    <nav class="mx-auto flex max-w-7xl items-center">
      <a href="/" class="inline-flex items-center" aria-label="Koplus">
        <img src="${LOGO_URL}" onerror="${LOGO_ONERROR}" alt="Koplus" class="h-8 w-auto">
      </a>
    </nav>
  </header>

  <section class="px-5 sm:px-3 py-10 md:py-14">
    <div class="w-full flex flex-col lg:flex-row gap-10">

      <!-- LEFT — Product image -->
      <div class="lg:w-3/5 lg:sticky lg:top-0 lg:self-start lg:h-screen lg:flex lg:flex-col lg:justify-center lg:bg-[#fafbfc]">
        <div id="pod-image" class="relative w-full rounded-xl lg:rounded-2xl bg-[#fafbfc] aspect-[4/3] lg:aspect-auto lg:h-[85vh] overflow-hidden">
          ${config.layers.map(l =>
            `<img id="layer-${l.key}" class="pod-layer absolute inset-0 h-full w-full object-contain" style="z-index:${l.zIndex}; opacity:0" src="" alt="${l.key} layer">`
          ).join("\n          ")}
          <div id="img-placeholder" class="absolute inset-0 flex items-center justify-center transition-opacity duration-300">
            <svg class="animate-spin h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- RIGHT — Config panel -->
      <div class="lg:w-2/5 flex flex-col gap-6">

        <!-- Series name — aligns with the top edge of the product image on the left. -->
        <div>
          <h1 class="font-['Cal_Sans'] text-[40px] md:text-[52px] lg:text-[64px] font-normal leading-[1.05]" style="color:#0a2240">${series.name}</h1>
          ${series.tagline ? `<p class="font-['Noto_Sans'] text-base font-light leading-snug mt-0.5" style="color:#5b6b7b">${series.tagline}</p>` : ""}
        </div>

        <!-- Product title — sits directly below the series tagline and updates with the
             selector. Title text is API-driven (config.title); per-size naming lives in CMS. -->
        <h2 class="font-['Noto_Sans'] text-[22px] md:text-[26px] lg:text-[30px] font-medium leading-[1.2] -mt-2" style="color:#0a2240">${productTitle}</h2>

        <!-- Product selector (Single / Medium / Large) — compact pill with generous
             per-option padding so each segment (incl. the selected one) reads spacious. -->
        <div class="flex gap-1 rounded-full bg-gray-100 p-1.5 self-start -mt-2">
          ${products.map(p =>
            `<button onclick="_samSwitchTo('${p.key}')" class="rounded-full px-7 py-2 text-sm font-medium transition ${p.key === activeKey ? 'bg-[#061629] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}">${p.label}</button>`
          ).join("\n          ")}
        </div>

        <!-- Product description (API-driven subtitle) — Noto Sans Light to match the tagline. -->
        ${subtitle ? `<p class="font-['Noto_Sans'] text-lg font-light leading-[22px]" style="color:#5b6b7b">${subtitle}</p>` : ""}

        <!-- Divider (replaces the former "Configure" heading). -->
        <div class="border-b border-gray-300"></div>

        <!-- ═══ Section: Setup ═══ -->
        <div class="cfg-section">
          <button class="section-toggle w-full flex items-center justify-between py-2">
            <h2 class="text-lg font-bold" style="color:#0a2240">Setup</h2>
            <span class="section-chevron text-gray-400 transition-transform" style="transform:rotate(180deg)">${ICON_CHEVRON_DOWN}</span>
          </button>
          <div class="section-body space-y-4 pt-2">

            <!-- Door Direction -->
            <div class="cfg-row rounded-xl ring-1 ring-gray-200 overflow-hidden" data-row="door">
              <button class="cfg-row-header w-full flex items-center justify-between px-4 py-3 text-left">
                <div>
                  <div class="text-sm font-semibold text-gray-900">Door Orientation</div>
                  <div class="row-value text-xs text-gray-500">${doorName}</div>
                </div>
              </button>
              <div class="cfg-row-body px-4">
                <div class="flex gap-3 pt-2">
                  <button data-code="LT" data-name="Left Handed" class="door-btn flex-1 rounded-lg px-4 py-3 text-sm font-medium text-center transition ${state.door === "LT" ? 'ring-2 ring-[#061629] bg-blue-50' : 'ring-1 ring-gray-200 text-gray-600 hover:ring-gray-400'}">Left Handed</button>
                  <button data-code="RT" data-name="Right Handed" class="door-btn flex-1 rounded-lg px-4 py-3 text-sm font-medium text-center transition ${state.door === "RT" ? 'ring-2 ring-[#061629] bg-blue-50' : 'ring-1 ring-gray-200 text-gray-600 hover:ring-gray-400'}">Right Handed</button>
                </div>
              </div>
            </div>
            ${accessoriesIn("door")}

            <!-- Back Panel -->
            <div class="cfg-row rounded-xl ring-1 ring-gray-200 overflow-hidden" data-row="backpanel">
              <button class="cfg-row-header w-full flex items-center justify-between px-4 py-3 text-left">
                <div>
                  <div class="text-sm font-semibold text-gray-900">Back Panel</div>
                  <div class="row-value text-xs text-gray-500">${panelName}</div>
                </div>
              </button>
              <div class="cfg-row-body px-4">
                <div class="flex flex-wrap gap-2 pt-2">
                  ${config.panels.map((p, i) => {
                    const iconSvg = PANEL_ICONS[p.icon] || PANEL_ICONS.glass;
                    const isFirst = i === 0;
                    return `<button data-panel="${p.code}" data-label="${p.label}" class="panel-btn flex items-center gap-2 rounded-lg ${isFirst ? 'ring-2 ring-[#061629] bg-blue-50' : 'ring-1 ring-gray-200 hover:ring-gray-400'} px-3 py-2.5 text-sm font-medium transition">
                      <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">${iconSvg}</svg>
                      ${p.label}
                    </button>`;
                  }).join("\n                  ")}
                </div>
              </div>
            </div>
            ${accessoriesIn("backPanel")}

          </div>
        </div>

        <!-- ═══ Section: Color and Materials ═══ -->
        <div class="cfg-section">
          <button class="section-toggle w-full flex items-center justify-between py-2">
            <h2 class="text-lg font-bold" style="color:#0a2240">Colour Option</h2>
            <span class="section-chevron text-gray-400 transition-transform" style="transform:rotate(180deg)">${ICON_CHEVRON_DOWN}</span>
          </button>
          <div class="section-body space-y-4 pt-2">

            <!-- Exterior Colour -->
            <div class="cfg-row rounded-xl ring-1 ring-gray-200 overflow-hidden" data-row="exterior">
              <button class="cfg-row-header w-full flex items-center justify-between px-4 py-3 text-left">
                <div>
                  <div class="text-sm font-semibold text-gray-900">Exterior Colour</div>
                  <div class="row-value text-xs text-gray-500">${extName}</div>
                </div>
              </button>
              <div class="cfg-row-body px-4">
                <div class="flex flex-wrap gap-2.5 pt-2">
                  ${renderSwatches(exteriorPalette, state.exterior)}
                </div>
              </div>
            </div>
            ${accessoriesIn("exterior")}
            ${renderDeskRow()}
            ${accessoriesIn("tabletop")}
            <!-- Interior Colour -->
            <div class="cfg-row rounded-xl ring-1 ring-gray-200 overflow-hidden" data-row="interior">
              <button class="cfg-row-header w-full flex items-center justify-between px-4 py-3 text-left">
                <div>
                  <div class="text-sm font-semibold text-gray-900">Interior PET Colour</div>
                  <div class="row-value text-xs text-gray-500">${intName}</div>
                </div>
              </button>
              <div class="cfg-row-body px-4">
                <div class="flex flex-wrap gap-2.5 pt-2">
                  ${renderSwatches(interiorPalette, "BWH")}
                </div>
              </div>
            </div>
            ${renderFloorRow()}
            ${accessoriesIn("interior")}

          </div>
        </div>

        ${optionalAccessories.some(a => (a.displaySection || "accessory") === "accessory") ? `
        <!-- ═══ Section: Accessories ═══ -->
        <div class="cfg-section">
          <button class="section-toggle w-full flex items-center justify-between py-2">
            <h2 class="text-lg font-bold" style="color:#0a2240">Accessory</h2>
            <span class="section-chevron text-gray-400 transition-transform" style="transform:rotate(180deg)">${ICON_CHEVRON_DOWN}</span>
          </button>
          <div class="section-body space-y-4 pt-2">
            ${accessoriesIn("accessory")}
          </div>
        </div>` : ''}

      </div>
    </div>
  </section>

  <footer class="border-t border-gray-200 px-6 py-6">
    <div class="mx-auto max-w-7xl text-center text-sm text-gray-500">
      &copy; 2026 Koplus. All rights reserved.
    </div>
  </footer>

  <!-- Spacer so page content can scroll clear of the fixed summary bar below. -->
  <div class="h-24"></div>

  <!-- Sticky bottom configuration summary bar -->
  <div id="cfg-summary-bar" class="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white" style="box-shadow:0 -2px 12px rgba(0,0,0,0.06)">
    <div class="w-full px-5 sm:px-12 lg:px-20 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4">
      <!-- Left: live product thumbnail + product / live summary -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div id="summary-thumb" class="hidden sm:block relative aspect-[4/3] h-12 rounded-md overflow-hidden shrink-0 ring-1 ring-gray-200 bg-[#fafbfc]">
          ${config.layers.map(l =>
            `<img id="thumb-${l.key}" class="pod-layer absolute inset-0 h-full w-full object-contain" style="z-index:${l.zIndex}; opacity:0" src="" alt="">`
          ).join("")}
        </div>
        <div class="min-w-0 flex-1">
          <div id="summary-product" class="text-sm font-semibold text-gray-900 truncate">${series.name} ${productTitle}</div>
          <div id="summary-config" class="hidden sm:block text-xs text-gray-500 truncate"></div>
        </div>
      </div>
      <!-- Right: secondary + primary actions -->
      <button id="btn-reset" type="button" class="shrink-0 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 sm:px-6 py-2 transition">Reset</button>
      <button id="btn-quote" type="button" class="shrink-0 inline-flex items-center gap-2 px-4 sm:px-8 py-2.5 text-sm font-medium text-white rounded-full transition hover:opacity-90" style="background:#061629">
        Request a quote
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 5l7 7-7 7"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- ═══ Request-a-quote modal — opens from the summary-bar CTA ═══ -->
  <div id="quote-modal" class="fixed inset-0 z-50 hidden">
    <div id="quote-backdrop" class="absolute inset-0 bg-black/50"></div>
    <div class="absolute inset-0 overflow-y-auto">
      <div id="quote-scroll" class="min-h-full flex items-start justify-center p-4 sm:p-6">
        <div id="quote-panel" class="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl my-6">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-200">
            <img src="${LOGO_URL}" onerror="${LOGO_ONERROR}" alt="Koplus" class="md:block hidden h-7 w-auto">
            <h2 class="font-['Cal_Sans'] text-2xl md:text-3xl font-normal" style="color:#0a2240">Request a Quote</h2>
            <button id="quote-close" type="button" aria-label="Close" class="hidden text-gray-400 hover:text-gray-700 transition">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Product summary -->
          <div id="quote-details" class="px-6 sm:px-10 pt-6">
            <div class="flex flex-col sm:flex-row gap-6">
              <div class="shrink-0 w-full sm:w-auto">
                <div id="qmodal-thumb" class="relative aspect-[4/3] sm:aspect-square w-full sm:w-64 rounded-xl ring-1 ring-gray-200 overflow-hidden bg-[#fafbfc]"></div>
                <div class="mt-3 font-['Noto_Sans'] text-lg font-medium text-center sm:text-left" style="color:#0a2240">${series.name} ${productTitle}</div>
              </div>
              <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-10 sm:self-start">
                <div class="flex justify-between border-b border-gray-200 py-3"><span class="text-sm font-semibold text-gray-800">Frame</span><span id="qspec-frame" class="text-sm text-gray-500"></span></div>
                <div class="flex justify-between border-b border-gray-200 py-3"><span class="text-sm font-semibold text-gray-800">Exterior</span><span id="qspec-exterior" class="text-sm text-gray-500"></span></div>
                <div class="flex justify-between border-b border-gray-200 py-3"><span class="text-sm font-semibold text-gray-800">Interior</span><span id="qspec-interior" class="text-sm text-gray-500"></span></div>
                <div class="flex justify-between border-b border-gray-200 py-3"><span class="text-sm font-semibold text-gray-800">Floor PET Colour</span><span id="qspec-floor" class="text-sm text-gray-500"></span></div>
                <div class="flex justify-between border-b border-gray-200 py-3"><span class="text-sm font-semibold text-gray-800">Door</span><span id="qspec-door" class="text-sm text-gray-500"></span></div>
                ${config.panels && config.panels.length ? `<div class="flex justify-between border-b border-gray-200 py-3"><span class="text-sm font-semibold text-gray-800">Back Panel</span><span id="qspec-panel" class="text-sm text-gray-500"></span></div>` : ""}
                ${deskItem ? `<div class="flex justify-between border-b border-gray-200 py-3"><span class="text-sm font-semibold text-gray-800">Tabletop Colour</span><span id="qspec-tabletop" class="text-sm text-gray-500"></span></div>` : ""}
                <!-- Optional accessories — each a direct grid row (so they flow/align with the
                     other fields), shown only when the customer has selected them. -->
                ${optionalAccessories.map(a => `<div class="flex justify-between border-b border-gray-200 py-3" data-qacc="${a.code}" style="display:none"><span class="text-sm font-semibold text-gray-800">${a.label}</span><span class="text-sm text-gray-500" data-qacc-val="${a.code}"></span></div>`).join("")}
                <div class="flex items-center justify-between py-3">
                  <span class="text-sm font-semibold text-gray-800">Quantity</span>
                  <div class="flex items-center rounded-lg ring-1 ring-gray-200 overflow-hidden">
                    <button id="qty-minus" type="button" class="px-3 py-1.5 text-gray-500 hover:bg-gray-50">&minus;</button>
                    <span id="qty-value" class="w-10 text-center text-sm font-medium text-gray-900">1</span>
                    <button id="qty-plus" type="button" class="px-3 py-1.5 text-gray-500 hover:bg-gray-50">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lead form -->
          <form id="quote-form" class="bg-gray-50 px-6 sm:px-10 py-8 mt-6 rounded-b-2xl">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input name="firstName" required placeholder="First Name *" class="qinput">
              <input name="lastName" required placeholder="Last Name *" class="qinput">
              <input name="email" type="email" required placeholder="Email *" class="qinput sm:col-span-2">
              <input name="phone" required placeholder="Phone *" class="qinput">
              <input name="country" required placeholder="Country *" class="qinput">
              <input name="address" required placeholder="Address *" class="qinput sm:col-span-2">
              <input name="company" required placeholder="Company *" class="qinput">
              <select name="companyType" required class="qinput qselect">
                <option value="" disabled selected>Company Type *</option>
                <option>Corporate / End User</option>
                <option>Reseller / Dealer</option>
                <option>Architect / Designer</option>
                <option>Other</option>
              </select>
              <textarea name="notes" rows="3" placeholder="Notes" class="qinput sm:col-span-2"></textarea>
            </div>
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <p class="text-xs text-gray-500">By submitting you agree to our <a href="#" class="underline font-medium text-gray-700">Privacy Policy</a>.</p>
              <button type="submit" class="inline-flex items-center gap-2 px-8 py-3 text-sm font-medium text-white rounded-full transition hover:opacity-90" style="background:#061629">
                Submit
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </div>
          </form>

          <!-- Success state — replaces the summary + form once a quote is submitted. -->
          <div id="quote-success" class="hidden px-6 sm:px-10 py-16 text-center">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/></svg>
            </div>
            <h3 class="mt-6 font-['Cal_Sans'] text-2xl md:text-3xl font-normal" style="color:#0a2240">Thank you!</h3>
            <p class="mt-3 font-['Noto_Sans'] font-light text-base text-gray-500 max-w-md mx-auto">Thank you for your interest in KOPLUS products. Your inquiry has been received successfully.<br /> Our sales team will get back to you with the relevant quotation details within 1&ndash;2 business days.</p>
            <button id="quote-done" type="button" class="mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium text-white rounded-full transition hover:opacity-90" style="background:#061629">Done</button>
          </div>

        </div>
      </div>
    </div>

    <!-- Floating close — top-right of the overlay, outside the panel. -->
    <button id="quote-close-x" type="button" aria-label="Close" class="absolute top-4 right-4 sm:top-5 sm:right-6 z-10 text-white/70 hover:text-white transition">
      <svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
    </button>
  </div>

  <style>
    .swatch, .acc-swatch { cursor:pointer; transition: transform 0.15s ease; }
    .swatch:hover, .acc-swatch:hover { transform: scale(1.08); }
    .swatch.on, .acc-swatch.on { box-shadow:0 0 0 2px #fff, 0 0 0 3px #061629; }
    /* Fabric swatch render: zoom the texture in place by sizing the background
       larger than the swatch and centering it. Same effect koplus.com uses. */
    .acc-swatch { background-size: 90px; background-position: 50%; background-repeat: no-repeat; }
    .desk-swatch, .floor-swatch { display:inline-block; cursor:not-allowed; }
    .desk-swatch.on, .floor-swatch.on { box-shadow:0 0 0 2px #fff, 0 0 0 3px #061629; }
    /* Non-selected locked swatches (tabletop + floor) are dimmed to show
       they're auto-derived and not individually selectable. */
    .desk-swatch:not(.on), .floor-swatch:not(.on) { opacity:.3; }
    .swatch.unavailable, .acc-swatch.unavailable {
      background: #d8d4cc !important;
      border-color: #bfb9ae !important;
      cursor: not-allowed;
      pointer-events: none;
      position: relative;
      overflow: hidden;
    }
    .swatch.unavailable img { display: none; }
    .swatch.unavailable::after, .acc-swatch.unavailable::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom right, transparent calc(50% - 1px), #8a8378 calc(50% - 1px), #8a8378 calc(50% + 1px), transparent calc(50% + 1px));
      border-radius: 50%;
    }
    .cfg-row-header:hover { background: #fafafa; }
    /* Smooth expand/collapse for option-card bodies. Default collapsed: zero
       max-height + zero vertical padding; .open transitions to full height. */
    .cfg-row-body {
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      padding-top: 0;
      padding-bottom: 0;
      transition: max-height .3s ease, opacity .25s ease, padding-top .3s ease, padding-bottom .3s ease;
    }
    .cfg-row-body.open {
      max-height: 800px;
      opacity: 1;
      padding-top: .5rem;
      padding-bottom: 1rem;
    }
    .cfg-section + .cfg-section { border-top: 1px solid #f3f4f6; padding-top: 1.25rem; }
    .section-chevron svg { transition: transform 0.2s ease; }
    /* Request-a-quote modal form controls */
    .qinput {
      width:100%; background:#fff; border:1px solid #e5e7eb; border-radius:0.75rem;
      padding:0.875rem 1rem; font-size:0.95rem; color:#111827; outline:none;
      transition:border-color .15s ease, box-shadow .15s ease;
    }
    .qinput::placeholder { color:#9ca3af; }
    .qinput:focus { border-color:#061629; box-shadow:0 0 0 3px rgba(6,22,41,0.08); }
    .qselect {
      appearance:none; -webkit-appearance:none; cursor:pointer; padding-right:2.5rem;
      background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%239ca3af' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19 9-7 7-7-7'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:right 1rem center; background-size:1.1rem;
    }
    #img-placeholder.hidden { display: flex !important; opacity: 0; pointer-events: none; }
  </style>`;
    }

    /* ── Render helpers ── */
    function renderSwatches(colours, defaultCode) {
      return colours.map(c => {
        const on = c.code === defaultCode ? " on" : "";
        const unavailable = c.unavailable ? " unavailable" : "";
        if (c.swatch && !c.unavailable) {
          return `<button data-code="${c.code}" data-name="${c.name}" class="swatch${on}${unavailable} h-9 w-9 rounded-full border-2 transition overflow-hidden" style="border-color:${c.border}">
            <img src="${c.swatch}" alt="${c.name}" class="h-full w-full object-cover rounded-full">
          </button>`;
        }
        return `<button data-code="${c.code}" data-name="${c.name}" class="swatch${on}${unavailable} h-9 w-9 rounded-full border-2 transition" style="background:${c.bg};border-color:${c.border}"></button>`;
      }).join("\n                  ");
    }

    // Standard desk-surface row (Single only). Surface colour is locked to the
    // exterior, so the swatches are display-only (non-interactive <span>s).
    function renderDeskRow() {
      if (!deskItem) return "";
      const active = deskColour();
      const swatches = (deskItem.colours || []).map(c => {
        const on = c.code === active ? " on" : "";
        return `<span data-code="${c.code}" title="${c.name}" class="desk-swatch${on} h-9 w-9 rounded-full border-2" style="background:${c.bg};border-color:${c.border || c.bg}"></span>`;
      }).join("\n                  ");
      return `
            <!-- Desk surface (standard; surface colour locked to exterior) -->
            <div class="cfg-row rounded-xl ring-1 ring-gray-200 overflow-hidden" data-row="desk">
              <button class="cfg-row-header w-full flex items-center justify-between px-4 py-3 text-left">
                <div>
                  <div class="text-sm font-semibold text-gray-900">Tabletop Colour</div>
                  <div class="row-value text-xs text-gray-500">${deskColourName(active)}</div>
                </div>
                <div class="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                  Auto ${ICON_LOCK}
                </div>
              </button>
              <div class="cfg-row-body px-4">
                <div class="flex flex-wrap gap-2.5 pt-2">
                  ${swatches}
                </div>
                <div class="text-xs text-gray-400 mt-2">Automatically matched to the exterior color — White exterior uses a white desk surface, all others use black.</div>
              </div>
            </div>`;
    }

    // Floor PET row (standard; colour locked to the interior). Display-only swatches.
    function renderFloorRow() {
      const active = floorColour();
      const swatches = ["LTG", "DKG"].map(code => {
        const c = interiorPalette.find(x => x.code === code);
        if (!c) return "";
        const on = code === active ? " on" : "";
        // Use the same felt-texture swatch image as the Interior PET row so the
        // two rows match exactly; fall back to the flat colour if no image.
        if (c.swatch) {
          return `<span data-code="${code}" title="${c.name}" class="floor-swatch${on} h-9 w-9 rounded-full border-2 overflow-hidden" style="border-color:${c.border || c.bg}"><img src="${c.swatch}" alt="${c.name}" class="h-full w-full object-cover rounded-full"></span>`;
        }
        return `<span data-code="${code}" title="${c.name}" class="floor-swatch${on} h-9 w-9 rounded-full border-2" style="background:${c.bg};border-color:${c.border || c.bg}"></span>`;
      }).join("\n                  ");
      return `
            <!-- Floor PET (standard; colour locked to interior) -->
            <div class="cfg-row rounded-xl ring-1 ring-gray-200 overflow-hidden" data-row="floor">
              <button class="cfg-row-header w-full flex items-center justify-between px-4 py-3 text-left">
                <div>
                  <div class="text-sm font-semibold text-gray-900">Floor PET Colour</div>
                  <div class="row-value text-xs text-gray-500">${floorColourName(active)}</div>
                </div>
                <div class="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                  Auto ${ICON_LOCK}
                </div>
              </button>
              <div class="cfg-row-body px-4">
                <div class="flex flex-wrap gap-2.5 pt-2">
                  ${swatches}
                </div>
                <div class="text-xs text-gray-400 mt-2">Automatically matched to the Interior PET — Blended White and Light Grey use Light Grey, all others use Dark Grey.</div>
              </div>
            </div>`;
    }

    // One optional-accessory row (toggle + colour swatches). Where it renders is
    // driven by the accessory's CMS `displaySection` — see accessoriesIn().
    function renderAccessoryRow(a) {
      return `
            <div class="cfg-row rounded-xl ring-1 ring-gray-200 overflow-hidden">
              <button data-acc="${a.code}" class="acc-toggle w-full flex items-center justify-between px-4 py-3 text-left transition hover:bg-gray-50">
                <div class="text-sm font-semibold text-gray-900">${a.label}</div>
                <div class="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <span class="acc-status">Add +</span>
                </div>
              </button>
              ${a.colours && a.colours.length ? `
              <div class="cfg-row-body acc-colours px-4" data-acc-colours="${a.code}">
                <div class="text-xs text-gray-500 mb-2">Colour: <span class="acc-colour-label">${(a.colours.find(c => c.code === (a.defaultColour || a.colours[0].code)) || a.colours[0]).name}</span></div>
                <div class="flex flex-wrap gap-2.5">
                  ${a.colours.map(c => {
                    const on = c.code === (a.defaultColour || a.colours[0].code) ? " on" : "";
                    const unavailable = c.unavailable ? " unavailable" : "";
                    if (c.swatch && !c.unavailable) {
                      return `<button data-code="${c.code}" data-name="${c.name}" title="${c.name}" aria-label="${c.name}" class="acc-swatch${on}${unavailable} h-8 w-8 rounded-full border-2 transition" style="border-color:${c.border || c.bg};background-image:url('${c.swatch}')"></button>`;
                    }
                    return `<button data-code="${c.code}" data-name="${c.name}" class="acc-swatch${on}${unavailable} h-8 w-8 rounded-full border-2 transition" style="background:${c.bg};border-color:${c.border || c.bg}"></button>`;
                  }).join("")}
                </div>
              </div>` : ''}
            </div>`;
    }

    // Optional accessories assigned to a given section (CMS displaySection).
    function accessoriesIn(section) {
      return optionalAccessories
        .filter(a => (a.displaySection || "accessory") === section)
        .map(renderAccessoryRow)
        .join("");
    }
  }
}