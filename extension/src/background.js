const browserApi = typeof browser !== "undefined" ? browser : chrome;

browserApi.runtime.onInstalled.addListener(async () => {
  const stored = await browserApi.storage.sync.get(["globalEnabled", "siteOverrides", "ratio"]);
  if (stored.globalEnabled === undefined) await browserApi.storage.sync.set({ globalEnabled: false });
  if (stored.siteOverrides === undefined) await browserApi.storage.sync.set({ siteOverrides: {} });
  if (stored.ratio === undefined) await browserApi.storage.sync.set({ ratio: 0.5 });
});
