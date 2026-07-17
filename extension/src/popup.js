const browserApi = typeof browser !== "undefined" ? browser : chrome;

const siteLabel = document.getElementById("site-label");
const siteToggle = document.getElementById("site-toggle");
const resetSiteButton = document.getElementById("reset-site");
const globalToggle = document.getElementById("global-toggle");
const ratioSlider = document.getElementById("ratio-slider");

let hostname = null;
let activeTabId = null;

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function getStored() {
  return browserApi.storage.local.get(["globalEnabled", "siteOverrides", "ratio"]);
}

function renderSiteControls(stored) {
  const overrides = stored.siteOverrides || {};
  const hasOverride = hostname && Object.prototype.hasOwnProperty.call(overrides, hostname);

  if (!hostname) {
    siteLabel.textContent = "Not available on this page";
    siteToggle.disabled = true;
    resetSiteButton.hidden = true;
    return;
  }

  siteLabel.textContent = `Enabled on ${hostname}`;
  siteToggle.disabled = false;
  siteToggle.checked = hasOverride ? !!overrides[hostname] : !!stored.globalEnabled;
  resetSiteButton.hidden = !hasOverride;
}

async function loadSettings() {
  const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab && tab.id;
  hostname = tab ? getHostname(tab.url) : null;

  const stored = await getStored();
  renderSiteControls(stored);
  globalToggle.checked = !!stored.globalEnabled;
  ratioSlider.value = Math.round((stored.ratio ?? 0.5) * 100);
}

async function notifyActiveTab() {
  if (!activeTabId) return;
  const settings = await getStored();
  browserApi.tabs.sendMessage(activeTabId, { type: "BIONIC_SETTINGS_CHANGED", settings }).catch(() => {});
}

async function saveRatio() {
  await browserApi.storage.local.set({ ratio: Number(ratioSlider.value) / 100 });
  await notifyActiveTab();
}

async function saveGlobalEnabled() {
  await browserApi.storage.local.set({ globalEnabled: globalToggle.checked });
  const stored = await getStored();
  renderSiteControls(stored);
  await notifyActiveTab();
}

async function saveSiteOverride() {
  if (!hostname) return;
  const stored = await getStored();
  const overrides = { ...(stored.siteOverrides || {}) };
  overrides[hostname] = siteToggle.checked;
  await browserApi.storage.local.set({ siteOverrides: overrides });
  resetSiteButton.hidden = false;
  await notifyActiveTab();
}

async function resetSiteOverride() {
  if (!hostname) return;
  const stored = await getStored();
  const overrides = { ...(stored.siteOverrides || {}) };
  delete overrides[hostname];
  await browserApi.storage.local.set({ siteOverrides: overrides });
  const next = await getStored();
  renderSiteControls(next);
  await notifyActiveTab();
}

siteToggle.addEventListener("change", saveSiteOverride);
resetSiteButton.addEventListener("click", resetSiteOverride);
globalToggle.addEventListener("change", saveGlobalEnabled);
ratioSlider.addEventListener("change", saveRatio);

loadSettings();
