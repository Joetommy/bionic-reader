const browserApi = typeof browser !== "undefined" ? browser : chrome;

browserApi.runtime.onInstalled.addListener(async () => {
  const stored = await browserApi.storage.sync.get(["enabled", "ratio"]);
  if (stored.enabled === undefined) await browserApi.storage.sync.set({ enabled: false });
  if (stored.ratio === undefined) await browserApi.storage.sync.set({ ratio: 0.5 });
});
