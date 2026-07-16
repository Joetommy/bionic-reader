/**
 * Content script: applies/reverts bionic transformation on the current page
 * and keeps up with dynamically added content while enabled.
 *
 * Some sites (Reddit's collapsible sidebar rules, for instance) measure or
 * re-slice text with their own JS after we've already transformed it. We
 * can't predict every such case, so instead we watch for it: if something
 * other than us rewrites text inside a container we already transformed,
 * we revert that one container and permanently leave it alone.
 */
(function () {
  const browserApi = typeof browser !== "undefined" ? browser : chrome;
  const MARK_ATTR = window.BionicReader.MARK_ATTR;

  let enabled = false;
  let ratio = 0.5;
  let observer = null;

  function observeBody() {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function runWithoutObserving(fn) {
    if (observer) observer.disconnect();
    fn();
    if (observer) observeBody();
  }

  function handleMutations(mutations) {
    const toHeal = new Set();
    const freshTargets = new Set();

    for (const mutation of mutations) {
      const node = mutation.target;
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!el) continue;

      const bionicAncestor = el.closest(`[${MARK_ATTR}]`);
      if (bionicAncestor) {
        toHeal.add(bionicAncestor);
        continue;
      }

      mutation.addedNodes.forEach((added) => {
        const target = added.nodeType === Node.ELEMENT_NODE ? added : added.parentElement;
        if (target && !target.closest(`[${MARK_ATTR}]`)) freshTargets.add(target);
      });
    }

    if (!toHeal.size && !freshTargets.size) return;

    runWithoutObserving(() => {
      toHeal.forEach((el) => {
        window.BionicReader.revert(el);
        window.BionicReader.block(el);
      });
      freshTargets.forEach((el) => window.BionicReader.apply(el, { ratio }));
    });
  }

  function startObserving() {
    if (observer) return;
    observer = new MutationObserver(handleMutations);
    observeBody();
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
