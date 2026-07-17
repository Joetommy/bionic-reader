const browserApi = typeof browser !== "undefined" ? browser : chrome;

browserApi.runtime.onInstalled.addListener(async () => {
  const stored = await browserApi.storage.local.get(["globalEnabled", "siteOverrides", "ratio"]);
  if (stored.globalEnabled === undefined) await browserApi.storage.local.set({ globalEnabled: false });
  if (stored.siteOverrides === undefined) await browserApi.storage.local.set({ siteOverrides: {} });
  if (stored.ratio === undefined) await browserApi.storage.local.set({ ratio: 0.5 });
});
