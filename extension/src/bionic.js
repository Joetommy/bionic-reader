/**
 * Core bionic-text transformation.
 * Wraps the leading "fixation" portion of each word in a <b> tag so the eye
 * anchors on it, leaving the rest of the word and all surrounding markup untouched.
 */
(function (global) {
  const BOLD_TAG = "b";
  const MARK_ATTR = "data-bionic";
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT",
    "OPTION", "CODE", "PRE", "SVG", "CANVAS", "IFRAME", BOLD_TAG.toUpperCase(),
  ]);

  function fixationLength(word, ratio) {
    const len = word.length;
    if (len <= 1) return len;
    if (len <= 3) return 1;
    return Math.max(1, Math.round(len * ratio));
  }

  function bionicFragmentFromWord(word, ratio, doc) {
    const boldLen = fixationLength(word, ratio);
    const frag = doc.createDocumentFragment();
    const strong = doc.createElement(BOLD_TAG);
    strong.setAttribute(MARK_ATTR, "b");
    strong.textContent = word.slice(0, boldLen);
    frag.appendChild(strong);
    if (boldLen < word.length) {
      frag.appendChild(doc.createTextNode(word.slice(boldLen)));
    }
    return frag;
  }

  function shouldSkipElement(el) {
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest(`[${MARK_ATTR}]`)) return true;
    return false;
  }

  function transformTextNode(textNode, ratio, doc) {
    const text = textNode.nodeValue;
    if (!text || !text.trim()) return;

    const parent = textNode.parentElement;
    if (shouldSkipElement(parent)) return;

    const wordPattern = /[A-Za-z0-9À-ɏЀ-ӿ']+|[^A-Za-z0-9À-ɏЀ-ӿ']+/g;
    const parts = text.match(wordPattern);
    if (!parts) return;

    const wrapper = doc.createDocumentFragment();
    let changed = false;
    for (const part of parts) {
      if (/[A-Za-z0-9À-ɏЀ-ӿ]/.test(part)) {
        wrapper.appendChild(bionicFragmentFromWord(part, ratio, doc));
        changed = true;
      } else {
        wrapper.appendChild(doc.createTextNode(part));
      }
    }
    if (changed) {
      textNode.parentNode.replaceChild(wrapper, textNode);
    }
  }

  function collectTextNodes(root, doc) {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkipElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  function apply(root, options) {
    const doc = root.ownerDocument || root;
    const ratio = (options && options.ratio) || 0.5;
    const nodes = collectTextNodes(root, doc);
    for (const node of nodes) transformTextNode(node, ratio, doc);
    if (root.nodeType === Node.ELEMENT_NODE) {
      root.setAttribute(MARK_ATTR, "root");
    }
  }

  function revert(root) {
    const doc = root.ownerDocument || root;
    const bolds = root.querySelectorAll ? root.querySelectorAll(`${BOLD_TAG}[${MARK_ATTR}="b"]`) : [];
    bolds.forEach((b) => {
      const parent = b.parentNode;
      if (!parent) return;
      parent.replaceChild(doc.createTextNode(b.textContent), b);
      parent.normalize();
    });

    if (root.nodeType === Node.ELEMENT_NODE && root.hasAttribute(MARK_ATTR)) {
      root.removeAttribute(MARK_ATTR);
    }
    const marked = root.querySelectorAll ? root.querySelectorAll(`[${MARK_ATTR}]`) : [];
    marked.forEach((el) => el.removeAttribute(MARK_ATTR));
  }

  global.BionicReader = { apply, revert };
})(typeof window !== "undefined" ? window : globalThis);
