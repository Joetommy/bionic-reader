const browserApi = typeof browser !== "undefined" ? browser : chrome;

const enabledToggle = document.getElementById("enabled-toggle");
const ratioSlider = document.getElementById("ratio-slider");

async function loadSettings() {
  const stored = await browserApi.storage.sync.get(["enabled", "ratio"]);
  enabledToggle.checked = !!stored.enabled;
  ratioSlider.value = Math.round((stored.ratio ?? 0.5) * 100);
}

async function saveSettings() {
  const settings = {
    enabled: enabledToggle.checked,
    ratio: Number(ratioSlider.value) / 100,
  };
  await browserApi.storage.sync.set(settings);

  const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    browserApi.tabs.sendMessage(tab.id, { type: "BIONIC_SETTINGS_CHANGED", settings }).catch(() => {});
  }
}

enabledToggle.addEventListener("change", saveSettings);
ratioSlider.addEventListener("change", saveSettings);

loadSettings();
