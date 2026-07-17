/**
 * Content script: applies/reverts bionic transformation on the current page
 * and keeps up with dynamically added content while enabled.
 *
 * Some sites (Reddit's collapsible sidebar rules, for instance) measure or
 * re-slice text with their own JS after we've already transformed it. We
 * can't predict every such case, so instead we watch for it: if something
 * other than us rewrites text inside a container we already transformed,
 * we revert that one container and permanently leave it alone.
 *
 * Whether we're enabled on this page comes from two settings: a global
 * default (on/off everywhere) and a per-site override map that wins when
 * present, so turning it on for reddit.com doesn't quietly turn it on
 * everywhere else too.
 */
(function () {
  const browserApi = typeof browser !== "undefined" ? browser : chrome;
  const MARK_ATTR = window.BionicReader.MARK_ATTR;
  const hostname = window.location.hostname;

  let enabled = false;
  let ratio = 0.5;
  let observer = null;

  function resolveEnabled(stored) {
    const overrides = stored.siteOverrides || {};
    if (Object.prototype.hasOwnProperty.call(overrides, hostname)) {
      return !!overrides[hostname];
    }
    return !!stored.globalEnabled;
  }

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

  function applySettings(stored) {
    ratio = stored.ratio ?? ratio;
    const nextEnabled = resolveEnabled(stored);
    if (nextEnabled && !enabled) {
      enable();
    } else if (!nextEnabled && enabled) {
      disable();
    } else if (nextEnabled && enabled) {
      disable();
      enable();
    }
  }

  browserApi.storage.local.get(["globalEnabled", "siteOverrides", "ratio"]).then(applySettings);

  browserApi.runtime.onMessage.addListener((message) => {
    if (message && message.type === "BIONIC_SETTINGS_CHANGED") {
      applySettings(message.settings);
    }
  });

  browserApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!("globalEnabled" in changes) && !("siteOverrides" in changes) && !("ratio" in changes)) return;
    browserApi.storage.local.get(["globalEnabled", "siteOverrides", "ratio"]).then(applySettings);
  });
})();
