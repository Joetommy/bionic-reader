/**
 * Content script: applies/reverts bionic transformation on the current page
 * and keeps up with dynamically added content while enabled.
 */
(function () {
  const browserApi = typeof browser !== "undefined" ? browser : chrome;

  let enabled = false;
  let ratio = 0.5;
  let observer = null;

  function startObserving() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            window.BionicReader.apply(node.parentElement || document.body, { ratio });
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function enable() {
    enabled = true;
    window.BionicReader.apply(document.body, { ratio });
    startObserving();
  }

  function disable() {
    enabled = false;
    stopObserving();
    window.BionicReader.revert(document.body);
  }

  function applySettings(settings) {
    ratio = settings.ratio ?? ratio;
    if (settings.enabled && !enabled) {
      enable();
    } else if (!settings.enabled && enabled) {
      disable();
    } else if (settings.enabled && enabled) {
      disable();
      enable();
    }
  }

  browserApi.storage.sync.get(["enabled", "ratio"]).then((stored) => {
    applySettings({ enabled: !!stored.enabled, ratio: stored.ratio ?? 0.5 });
  });

  browserApi.runtime.onMessage.addListener((message) => {
    if (message && message.type === "BIONIC_SETTINGS_CHANGED") {
      applySettings(message.settings);
    }
  });

  browserApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const next = {};
    if ("enabled" in changes) next.enabled = changes.enabled.newValue;
    if ("ratio" in changes) next.ratio = changes.ratio.newValue;
    if (Object.keys(next).length) {
      applySettings({ enabled: "enabled" in next ? next.enabled : enabled, ratio: next.ratio ?? ratio });
    }
  });
})();
