/**
 * Content script – Grid Layout Inspector
 * Manages: column overlay, row overlay, row-check hover-inspect mode.
 */

const OVERLAY_ID     = "grid-layout-inspector-overlay";
const ROW_OVERLAY_ID = "grid-layout-inspector-rows";
const HIGHLIGHT_ID   = "grid-layout-inspector-highlight";
const STYLE_ID       = "grid-layout-inspector-style";

/* ─── Defaults (mirrors popup.js DEFAULT_SETTINGS) ───────────────────────── */
const CFG_DEFAULTS = {
  maxWidth:     1280,
  columns:      12,
  columnGutter: 24,
  rowGutter:    24,
  rowHeight:    80,
  color:        "#ff6b6b33",
  rowColorHex:  "#3b82f6",
  rowOpacity:   12,
  rowColor:     "#3b82f61e",
  hoverColorHex: "#f59e0b",
  hoverOpacity:  50,
  hoverColor:    "#f59e0b80"
};

/** Merge incoming config with defaults so missing fields are always safe. */
function normalise(cfg) {
  return Object.assign({}, CFG_DEFAULTS, cfg);
}

/* ─── CSS builders ────────────────────────────────────────────────────────── */

function buildGridCSS(raw) {
  const cfg = normalise(raw);
  const { columns, columnGutter, rowGutter, rowHeight, color, rowColor, maxWidth } = cfg;

  // Column overlay – centered, limited to maxWidth
  let css = `
    #${OVERLAY_ID} {
      position: fixed !important;
      top: 0 !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: ${maxWidth}px !important;
      max-width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      display: grid !important;
      grid-template-columns: repeat(${columns}, 1fr) !important;
      column-gap: ${columnGutter}px !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #${OVERLAY_ID} .gli-col {
      background-color: ${color} !important;
      height: 100% !important;
    }
  `;

  // Row overlay – full-width repeating horizontal bands
  if (rowHeight > 0) {
    const cycle = rowHeight + rowGutter;
    css += `
      #${ROW_OVERLAY_ID} {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483645 !important;
        background-image: repeating-linear-gradient(
          to bottom,
          ${rowColor}  0px,
          ${rowColor}  ${rowHeight}px,
          transparent  ${rowHeight}px,
          transparent  ${cycle}px
        ) !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `;
  }

  return css;
}

/* ─── Style injection ────────────────────────────────────────────────────── */

function injectStyle(css) {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = css;
}

function removeStyle() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

/* ─── Overlay DOM ────────────────────────────────────────────────────────── */

function buildColumnOverlay(raw) {
  const { columns } = normalise(raw);
  const wrapper = document.createElement("div");
  wrapper.id = OVERLAY_ID;
  for (let i = 0; i < columns; i++) {
    const col = document.createElement("div");
    col.className = "gli-col";
    wrapper.appendChild(col);
  }
  return wrapper;
}

/* ─── Show / hide grid ───────────────────────────────────────────────────── */

function showGrid(raw) {
  removeGrid();
  const cfg  = normalise(raw);
  const root = document.body || document.documentElement;

  injectStyle(buildGridCSS(cfg));
  root.appendChild(buildColumnOverlay(cfg));

  if (cfg.rowHeight > 0) {
    const rowEl = document.createElement("div");
    rowEl.id = ROW_OVERLAY_ID;
    root.appendChild(rowEl);
  }
}

function removeGrid() {
  deactivateRowCheck();
  [OVERLAY_ID, ROW_OVERLAY_ID, HIGHLIGHT_ID].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  removeStyle();
}

/* ─── Row-check hover-inspect mode ──────────────────────────────────────── */

let _checkActive = false;
let _onMove      = null;
let _onClick     = null;

function activateRowCheck(raw) {
  deactivateRowCheck(); // clear any previous session

  const cfg = normalise(raw);
  const { rowHeight, rowGutter, hoverColor } = cfg;

  // Guard: row inspector only works when row grid is enabled
  if (rowHeight <= 0) return;

  _checkActive = true;

  const cycle = rowHeight + rowGutter;
  const root  = document.body || document.documentElement;

  // Build the hover-highlight element using the user-defined hoverColor
  const hl = document.createElement("div");
  hl.id = HIGHLIGHT_ID;
  hl.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    height: ${rowHeight}px;
    pointer-events: none;
    z-index: 2147483646;
    background-color: ${hoverColor};
    opacity: 0;
    transition: opacity 0.08s ease, top 0.04s ease;
  `;
  root.appendChild(hl);

  // Crosshair cursor to signal active mode
  document.documentElement.style.setProperty("cursor", "crosshair", "important");

  _onMove = (e) => {
    const y      = e.clientY;
    const idx    = Math.floor(y / cycle);
    const rowTop = idx * cycle;
    const inBand = (y - rowTop) < rowHeight;

    if (inBand) {
      hl.style.top     = rowTop + "px";
      hl.style.opacity = "1";
    } else {
      hl.style.opacity = "0";
    }
  };

  // Single click anywhere deactivates; use capture so page handlers don't block it
  _onClick = (e) => {
    e.stopPropagation();
    deactivateRowCheck();
    // Notify popup (may already be closed – ignore any error)
    chrome.runtime.sendMessage({ action: "rowCheckEnded" }).catch(() => {});
  };

  document.addEventListener("mousemove", _onMove);
  document.addEventListener("click", _onClick, { once: true, capture: true });
}

function deactivateRowCheck() {
  if (!_checkActive) return;
  _checkActive = false;

  if (_onMove) {
    document.removeEventListener("mousemove", _onMove);
    _onMove = null;
  }
  if (_onClick) {
    document.removeEventListener("click", _onClick, { capture: true });
    _onClick = null;
  }

  const hl = document.getElementById(HIGHLIGHT_ID);
  if (hl) hl.remove();

  document.documentElement.style.removeProperty("cursor");
}

/* ─── Message listener ───────────────────────────────────────────────────── */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.action) {
    case "showGrid":
      showGrid(message.config);
      sendResponse({ ok: true });
      break;

    case "hideGrid":
      removeGrid();
      sendResponse({ ok: true });
      break;

    case "enableRowCheck":
      activateRowCheck(message.config);
      sendResponse({ ok: true });
      break;

    case "disableRowCheck":
      deactivateRowCheck();
      sendResponse({ ok: true });
      break;

    case "ping":
      sendResponse({ ok: true });
      break;

    default:
      break;
  }
  return true;
});

/* ─── Auto-restore on page load ──────────────────────────────────────────── */

(async () => {
  const origin       = window.location.origin;
  const data         = await chrome.storage.local.get(["settings", "enabledSites"]);
  const enabledSites = data.enabledSites || {};
  const settings     = data.settings     || {};

  if (enabledSites[origin] && settings.enabled) {
    showGrid(settings);
  }
})();
