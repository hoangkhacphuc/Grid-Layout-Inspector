/**
 * popup.js – Grid Layout Inspector
 * Handles settings persistence, UI state, and communication with the content script.
 */

/* ─── Defaults ───────────────────────────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  enabled:      true,
  maxWidth:     1280,
  columns:      12,
  columnGutter: 24,
  rowGutter:    24,
  rowHeight:    80,
  // Column color
  colorHex:     "#ff6b6b",
  opacity:      20,
  color:        "#ff6b6b33",
  // Row color
  rowColorHex:  "#3b82f6",
  rowOpacity:   12,
  rowColor:     "#3b82f61e",
  // Hover highlight color (Row Inspector mode)
  hoverColorHex: "#f59e0b",
  hoverOpacity:  50,
  hoverColor:    "#f59e0b80"
};

/* ─── DOM refs ───────────────────────────────────────────────────────────── */
const elSwitch           = document.getElementById("switch-enabled");
const elMaxWidth         = document.getElementById("input-max-width");
const elColumns          = document.getElementById("input-columns");
const elColGutter        = document.getElementById("input-col-gutter");
const elRowGutter        = document.getElementById("input-row-gutter");
const elRowHeight        = document.getElementById("input-row-height");
// Column color
const elColorPicker      = document.getElementById("input-color-picker");
const elColorText        = document.getElementById("input-color");
const elColorPreview     = document.getElementById("color-preview");
const elOpacity          = document.getElementById("input-opacity");
const elOpacityValue     = document.getElementById("opacity-value");
// Row color
const elRowColorPicker   = document.getElementById("input-row-color-picker");
const elRowColorText     = document.getElementById("input-row-color");
const elRowColorPreview  = document.getElementById("row-color-preview");
const elRowOpacity       = document.getElementById("input-row-opacity");
const elRowOpacityValue  = document.getElementById("row-opacity-value");
// Hover color
const elHoverColorPicker  = document.getElementById("input-hover-color-picker");
const elHoverColorText    = document.getElementById("input-hover-color");
const elHoverColorPreview = document.getElementById("hover-color-preview");
const elHoverOpacity      = document.getElementById("input-hover-opacity");
const elHoverOpacityValue = document.getElementById("hover-opacity-value");
// Actions
const elOrigin           = document.getElementById("current-origin");
const elBtnSave          = document.getElementById("btn-save");
const elBtnRowCheck      = document.getElementById("btn-row-check");
const elBtnApply         = document.getElementById("btn-apply");
const elBtnRemove        = document.getElementById("btn-remove");
const elToast            = document.getElementById("toast");

// Log any missing elements (useful for debugging in extension console)
const _DOM_MAP = {
  "switch-enabled":       elSwitch,
  "input-max-width":      elMaxWidth,
  "input-columns":        elColumns,
  "input-col-gutter":     elColGutter,
  "input-row-gutter":     elRowGutter,
  "input-row-height":     elRowHeight,
  "input-color-picker":   elColorPicker,
  "input-color":          elColorText,
  "color-preview":        elColorPreview,
  "input-opacity":        elOpacity,
  "opacity-value":        elOpacityValue,
  "input-row-color-picker": elRowColorPicker,
  "input-row-color":      elRowColorText,
  "row-color-preview":    elRowColorPreview,
  "input-row-opacity":    elRowOpacity,
  "row-opacity-value":    elRowOpacityValue,
  "input-hover-color-picker": elHoverColorPicker,
  "input-hover-color":    elHoverColorText,
  "hover-color-preview":  elHoverColorPreview,
  "input-hover-opacity":  elHoverOpacity,
  "hover-opacity-value":  elHoverOpacityValue,
  "current-origin":       elOrigin,
  "btn-save":             elBtnSave,
  "btn-row-check":        elBtnRowCheck,
  "btn-apply":            elBtnApply,
  "btn-remove":           elBtnRemove,
  "toast":                elToast
};
Object.entries(_DOM_MAP).forEach(([id, el]) => {
  if (!el) console.error(`[GridInspector] Missing element: #${id}`);
});

let currentTabId   = null;
let currentOrigin  = null;
let toastTimer     = null;
let rowCheckActive = false;   // Tracks whether row-inspect mode is active

/* ─── Color helpers ──────────────────────────────────────────────────────── */

function buildColorWithOpacity(hex, opacity) {
  const alpha = Math.round((opacity / 100) * 255).toString(16).padStart(2, "0");
  return hex + alpha;
}

function parseColorString(str) {
  if (!str) return { hex: DEFAULT_SETTINGS.colorHex, opacity: DEFAULT_SETTINGS.opacity };
  str = str.trim();
  const hex     = str.slice(0, 7) || DEFAULT_SETTINGS.colorHex;
  const alphaHx = str.slice(7, 9);
  const opacity = alphaHx ? Math.round((parseInt(alphaHx, 16) / 255) * 100) : DEFAULT_SETTINGS.opacity;
  return { hex, opacity };
}

function isValidHexColor(str) {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(str.trim());
}

function updateColorPreview(el, colorWithAlpha) {
  if (el) el.style.setProperty("--preview-color", colorWithAlpha);
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */

function showToast(msg, type = "success") {
  if (!elToast) return;
  clearTimeout(toastTimer);
  elToast.textContent = msg;
  elToast.className = `toast toast--${type} toast--visible`;
  toastTimer = setTimeout(() => { elToast.className = "toast"; }, 2200);
}

/* ─── Form helpers ───────────────────────────────────────────────────────── */

function readFormValues() {
  const colorHex    = elColorPicker    ? elColorPicker.value    : DEFAULT_SETTINGS.colorHex;
  const opacity     = elOpacity        ? parseInt(elOpacity.value, 10) : DEFAULT_SETTINGS.opacity;
  const color       = buildColorWithOpacity(colorHex, opacity);

  const rowColorHex = elRowColorPicker ? elRowColorPicker.value : DEFAULT_SETTINGS.rowColorHex;
  const rowOpacity  = elRowOpacity     ? parseInt(elRowOpacity.value, 10) : DEFAULT_SETTINGS.rowOpacity;
  const rowColor    = buildColorWithOpacity(rowColorHex, rowOpacity);

  const hoverColorHex = elHoverColorPicker ? elHoverColorPicker.value : DEFAULT_SETTINGS.hoverColorHex;
  const hoverOpacity  = elHoverOpacity     ? parseInt(elHoverOpacity.value, 10) : DEFAULT_SETTINGS.hoverOpacity;
  const hoverColor    = buildColorWithOpacity(hoverColorHex, hoverOpacity);

  return {
    enabled:      elSwitch    ? elSwitch.checked                                     : DEFAULT_SETTINGS.enabled,
    maxWidth:     elMaxWidth  ? Math.max(320, parseInt(elMaxWidth.value, 10) || 1280): DEFAULT_SETTINGS.maxWidth,
    columns:      elColumns   ? Math.max(1, parseInt(elColumns.value, 10) || 12)     : DEFAULT_SETTINGS.columns,
    columnGutter: elColGutter ? Math.max(0, parseInt(elColGutter.value, 10) || 0)   : DEFAULT_SETTINGS.columnGutter,
    rowGutter:    elRowGutter ? Math.max(0, parseInt(elRowGutter.value, 10) || 0)   : DEFAULT_SETTINGS.rowGutter,
    rowHeight:    elRowHeight ? Math.max(0, parseInt(elRowHeight.value, 10) || 0)   : DEFAULT_SETTINGS.rowHeight,
    colorHex, opacity, color,
    rowColorHex, rowOpacity, rowColor,
    hoverColorHex, hoverOpacity, hoverColor
  };
}

function applySettingsToForm(s) {
  if (elSwitch)          elSwitch.checked           = s.enabled;
  if (elMaxWidth)        elMaxWidth.value            = s.maxWidth;
  if (elColumns)         elColumns.value             = s.columns;
  if (elColGutter)       elColGutter.value           = s.columnGutter;
  if (elRowGutter)       elRowGutter.value           = s.rowGutter;
  if (elRowHeight)       elRowHeight.value           = s.rowHeight ?? DEFAULT_SETTINGS.rowHeight;
  // Column color
  if (elColorPicker)     elColorPicker.value         = s.colorHex  ?? DEFAULT_SETTINGS.colorHex;
  if (elOpacity)         elOpacity.value             = s.opacity   ?? DEFAULT_SETTINGS.opacity;
  if (elOpacityValue)    elOpacityValue.textContent  = (s.opacity ?? DEFAULT_SETTINGS.opacity) + "%";
  if (elColorText)       elColorText.value           = s.color     ?? DEFAULT_SETTINGS.color;
  updateColorPreview(elColorPreview, s.color ?? DEFAULT_SETTINGS.color);
  // Row color
  if (elRowColorPicker)  elRowColorPicker.value      = s.rowColorHex ?? DEFAULT_SETTINGS.rowColorHex;
  if (elRowOpacity)      elRowOpacity.value          = s.rowOpacity  ?? DEFAULT_SETTINGS.rowOpacity;
  if (elRowOpacityValue) elRowOpacityValue.textContent = (s.rowOpacity ?? DEFAULT_SETTINGS.rowOpacity) + "%";
  if (elRowColorText)    elRowColorText.value        = s.rowColor    ?? DEFAULT_SETTINGS.rowColor;
  updateColorPreview(elRowColorPreview, s.rowColor ?? DEFAULT_SETTINGS.rowColor);
  // Hover color
  if (elHoverColorPicker)  elHoverColorPicker.value      = s.hoverColorHex ?? DEFAULT_SETTINGS.hoverColorHex;
  if (elHoverOpacity)      elHoverOpacity.value          = s.hoverOpacity  ?? DEFAULT_SETTINGS.hoverOpacity;
  if (elHoverOpacityValue) elHoverOpacityValue.textContent = (s.hoverOpacity ?? DEFAULT_SETTINGS.hoverOpacity) + "%";
  if (elHoverColorText)    elHoverColorText.value        = s.hoverColor    ?? DEFAULT_SETTINGS.hoverColor;
  updateColorPreview(elHoverColorPreview, s.hoverColor ?? DEFAULT_SETTINGS.hoverColor);
}

/* ─── Chrome storage ─────────────────────────────────────────────────────── */

function loadData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["settings", "enabledSites"], (data) => {
      resolve({
        settings:     data.settings     || { ...DEFAULT_SETTINGS },
        enabledSites: data.enabledSites || {}
      });
    });
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, () => {
      if (chrome.runtime.lastError) console.error("[GridInspector]", chrome.runtime.lastError);
      resolve();
    });
  });
}

function saveEnabledSites(enabledSites) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ enabledSites }, resolve);
  });
}

/* ─── Tab messaging ──────────────────────────────────────────────────────── */

function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[GridInspector]", chrome.runtime.lastError.message);
        resolve({ ok: false });
      } else {
        resolve(response || { ok: false });
      }
    });
  });
}

async function refreshGridOnTab(settings) {
  if (!currentTabId) return;
  const action = settings.enabled ? "showGrid" : "hideGrid";
  await sendToTab(currentTabId, { action, config: settings });
}

/* ─── Site button states ─────────────────────────────────────────────────── */

function updateSiteButtonStates(enabledSites) {
  const applied = !!(currentOrigin && enabledSites[currentOrigin]);
  if (elBtnApply)  elBtnApply.style.opacity  = applied ? "0.45" : "1";
  if (elBtnRemove) elBtnRemove.style.opacity = applied ? "1"    : "0.45";
}

/* ─── Row-check button UI state ──────────────────────────────────────────── */

function setRowCheckUI(active) {
  rowCheckActive = active;
  if (!elBtnRowCheck) return;
  if (active) {
    elBtnRowCheck.classList.add("btn--check--active");
    elBtnRowCheck.title = "Click anywhere on the page to exit Row Inspector";
  } else {
    elBtnRowCheck.classList.remove("btn--check--active");
    elBtnRowCheck.title = "";
  }
}

/* ─── Init ───────────────────────────────────────────────────────────────── */

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    currentTabId = tab.id;
    try { currentOrigin = new URL(tab.url).origin; }
    catch { currentOrigin = tab.url; }
    if (elOrigin) elOrigin.textContent = currentOrigin || "—";
  }

  const { settings, enabledSites } = await loadData();
  applySettingsToForm({ ...DEFAULT_SETTINGS, ...settings });
  updateSiteButtonStates(enabledSites);
  setRowCheckUI(false); // always start inactive when popup opens
}

/* ─── Column color sync ──────────────────────────────────────────────────── */

if (elColorPicker) {
  elColorPicker.addEventListener("input", () => {
    const op    = elOpacity ? parseInt(elOpacity.value, 10) : DEFAULT_SETTINGS.opacity;
    const color = buildColorWithOpacity(elColorPicker.value, op);
    if (elColorText)   elColorText.value = color;
    updateColorPreview(elColorPreview, color);
  });
}

if (elColorText) {
  elColorText.addEventListener("input", () => {
    const val = elColorText.value.trim();
    if (isValidHexColor(val)) {
      const { hex, opacity } = parseColorString(val);
      if (elColorPicker)  elColorPicker.value = hex;
      if (elOpacity)      elOpacity.value     = opacity;
      if (elOpacityValue) elOpacityValue.textContent = opacity + "%";
      updateColorPreview(elColorPreview, val);
    }
  });
}

if (elOpacity) {
  elOpacity.addEventListener("input", () => {
    const op    = parseInt(elOpacity.value, 10);
    if (elOpacityValue) elOpacityValue.textContent = op + "%";
    const color = buildColorWithOpacity(elColorPicker ? elColorPicker.value : DEFAULT_SETTINGS.colorHex, op);
    if (elColorText) elColorText.value = color;
    updateColorPreview(elColorPreview, color);
  });
}

if (elColorPreview) {
  elColorPreview.addEventListener("click", () => { if (elColorPicker) elColorPicker.click(); });
}

/* ─── Row color sync ─────────────────────────────────────────────────────── */

if (elRowColorPicker) {
  elRowColorPicker.addEventListener("input", () => {
    const op    = elRowOpacity ? parseInt(elRowOpacity.value, 10) : DEFAULT_SETTINGS.rowOpacity;
    const color = buildColorWithOpacity(elRowColorPicker.value, op);
    if (elRowColorText) elRowColorText.value = color;
    updateColorPreview(elRowColorPreview, color);
  });
}

if (elRowColorText) {
  elRowColorText.addEventListener("input", () => {
    const val = elRowColorText.value.trim();
    if (isValidHexColor(val)) {
      const { hex, opacity } = parseColorString(val);
      if (elRowColorPicker)  elRowColorPicker.value = hex;
      if (elRowOpacity)      elRowOpacity.value     = opacity;
      if (elRowOpacityValue) elRowOpacityValue.textContent = opacity + "%";
      updateColorPreview(elRowColorPreview, val);
    }
  });
}

if (elRowOpacity) {
  elRowOpacity.addEventListener("input", () => {
    const op    = parseInt(elRowOpacity.value, 10);
    if (elRowOpacityValue) elRowOpacityValue.textContent = op + "%";
    const color = buildColorWithOpacity(elRowColorPicker ? elRowColorPicker.value : DEFAULT_SETTINGS.rowColorHex, op);
    if (elRowColorText) elRowColorText.value = color;
    updateColorPreview(elRowColorPreview, color);
  });
}

if (elRowColorPreview) {
  elRowColorPreview.addEventListener("click", () => { if (elRowColorPicker) elRowColorPicker.click(); });
}

/* ─── Hover color sync ───────────────────────────────────────────────────── */

if (elHoverColorPicker) {
  elHoverColorPicker.addEventListener("input", () => {
    const op    = elHoverOpacity ? parseInt(elHoverOpacity.value, 10) : DEFAULT_SETTINGS.hoverOpacity;
    const color = buildColorWithOpacity(elHoverColorPicker.value, op);
    if (elHoverColorText) elHoverColorText.value = color;
    updateColorPreview(elHoverColorPreview, color);
  });
}

if (elHoverColorText) {
  elHoverColorText.addEventListener("input", () => {
    const val = elHoverColorText.value.trim();
    if (isValidHexColor(val)) {
      const { hex, opacity } = parseColorString(val);
      if (elHoverColorPicker)  elHoverColorPicker.value = hex;
      if (elHoverOpacity)      elHoverOpacity.value     = opacity;
      if (elHoverOpacityValue) elHoverOpacityValue.textContent = opacity + "%";
      updateColorPreview(elHoverColorPreview, val);
    }
  });
}

if (elHoverOpacity) {
  elHoverOpacity.addEventListener("input", () => {
    const op    = parseInt(elHoverOpacity.value, 10);
    if (elHoverOpacityValue) elHoverOpacityValue.textContent = op + "%";
    const color = buildColorWithOpacity(elHoverColorPicker ? elHoverColorPicker.value : DEFAULT_SETTINGS.hoverColorHex, op);
    if (elHoverColorText) elHoverColorText.value = color;
    updateColorPreview(elHoverColorPreview, color);
  });
}

if (elHoverColorPreview) {
  elHoverColorPreview.addEventListener("click", () => { if (elHoverColorPicker) elHoverColorPicker.click(); });
}

/* ─── Save settings ──────────────────────────────────────────────────────── */

if (elBtnSave) {
  elBtnSave.addEventListener("click", async () => {
    const settings = readFormValues();
    await saveSettings(settings);
    const { enabledSites } = await loadData();
    if (currentOrigin && enabledSites[currentOrigin]) {
      await refreshGridOnTab(settings);
    }
    showToast("✓ Settings saved", "success");
  });
}

/* ─── Global toggle ──────────────────────────────────────────────────────── */

if (elSwitch) {
  elSwitch.addEventListener("change", async () => {
    const { enabledSites } = await loadData();
    if (!currentOrigin || !enabledSites[currentOrigin]) return;
    const settings = readFormValues();
    await saveSettings(settings);
    await refreshGridOnTab(settings);
  });
}

/* ─── Apply / Remove ─────────────────────────────────────────────────────── */

if (elBtnApply) {
  elBtnApply.addEventListener("click", async () => {
    if (!currentOrigin) { showToast("No active site", "error"); return; }
    const settings = readFormValues();
    await saveSettings(settings);
    const { enabledSites } = await loadData();
    enabledSites[currentOrigin] = true;
    await saveEnabledSites(enabledSites);
    await refreshGridOnTab(settings);
    updateSiteButtonStates(enabledSites);
    showToast("✓ Grid applied to this site", "success");
  });
}

if (elBtnRemove) {
  elBtnRemove.addEventListener("click", async () => {
    if (!currentOrigin) return;
    const { enabledSites } = await loadData();
    delete enabledSites[currentOrigin];
    await saveEnabledSites(enabledSites);
    if (currentTabId) await sendToTab(currentTabId, { action: "hideGrid" });
    updateSiteButtonStates(enabledSites);
    showToast("Grid removed from this site", "success");
  });
}

/* ─── Row Inspector (hover-check) ────────────────────────────────────────── */

if (elBtnRowCheck) {
  elBtnRowCheck.addEventListener("click", async () => {
    if (rowCheckActive) {
      // Deactivate
      await sendToTab(currentTabId, { action: "disableRowCheck" });
      setRowCheckUI(false);
    } else {
      // Activate – send current settings so content script knows rowHeight/rowColor
      const settings = readFormValues();
      await sendToTab(currentTabId, { action: "enableRowCheck", config: settings });
      setRowCheckUI(true);
      showToast("Row Inspector active · click page to exit", "success");
    }
  });
}

// Listen for content script notifying us that the user clicked (deactivated check mode)
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "rowCheckEnded") {
    setRowCheckUI(false);
  }
});

/* ─── Boot ───────────────────────────────────────────────────────────────── */
init();
