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

  const MAX_BOLD_CHARS = 5;

  // Apostrophes ("What's", "you're") shouldn't count toward a word's length —
  // otherwise contractions get bolded further than a plain word of the same
  // visible length, which is what made bolding look inconsistent.
  function coreLength(word) {
    let count = 0;
    for (const ch of word) if (ch !== "'") count++;
    return count;
  }

  // Maps a target count of "real" (non-apostrophe) characters back to an
  // index into the original word, so slicing still lands in the right spot.
  function coreSliceIndex(word, coreCount) {
    let count = 0;
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== "'") count++;
      if (count >= coreCount) return i + 1;
    }
    return word.length;
  }

  function fixationLength(word, ratio) {
    const len = coreLength(word);
    if (len <= 1) return word.length;
    if (len <= 3) return coreSliceIndex(word, 1);
    const boldCore = Math.min(Math.ceil(len * ratio), MAX_BOLD_CHARS, len - 1);
    return coreSliceIndex(word, Math.max(1, boldCore));
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

  // Sites truncate long text with CSS (line-clamp, text-overflow: ellipsis)
  // and recalculate the visible slice from the live DOM. Splitting that text
  // into extra <b> elements throws off their measurement and produces
  // garbled leftovers, so we leave truncated containers alone entirely.
  const TRUNCATION_CHECK_DEPTH = 6;

  function isTruncated(el) {
    const view = el.ownerDocument && el.ownerDocument.defaultView;
    if (!view || !view.getComputedStyle) return false;
    let node = el;
    for (let i = 0; node && i < TRUNCATION_CHECK_DEPTH; i++, node = node.parentElement) {
      const style = view.getComputedStyle(node);
      if (!style) continue;
      const lineClamp = style.webkitLineClamp || style.getPropertyValue("-webkit-line-clamp");
      if (lineClamp && lineClamp !== "none") return true;
      if (style.textOverflow === "ellipsis" && style.overflow !== "visible") return true;
    }
    return false;
  }

  // Permanently opted out after we caught the page's own script rewriting
  // text we'd already transformed (see content.js's mutation handling).
  const BLOCK_ATTR = "data-bionic-skip";

  function shouldSkipElement(el) {
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest(`[${MARK_ATTR}]`)) return true;
    if (el.closest && el.closest(`[${BLOCK_ATTR}]`)) return true;
    if (isTruncated(el)) return true;
    return false;
  }

  function transformTextNode(textNode, ratio, doc) {
    const text = textNode.nodeValue;
    if (!text || !text.trim()) return false;

    const parent = textNode.parentElement;
    if (shouldSkipElement(parent)) return false;

    const wordPattern = /[A-Za-z0-9À-ɏЀ-ӿ']+|[^A-Za-z0-9À-ɏЀ-ӿ']+/g;
    const parts = text.match(wordPattern);
    if (!parts) return false;

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
    return changed;
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

  // Marks are applied per-parent, only after a whole pass finishes (not as
  // we go), so sibling text nodes under the same parent don't get skipped
  // mid-pass, and so we can tell "already transformed" containers apart from
  // brand-new ones when watching for future mutations.
  function apply(root, options) {
    const doc = root.ownerDocument || root;
    const ratio = (options && options.ratio) || 0.5;
    const nodes = collectTextNodes(root, doc);
    const touchedParents = new Set();
    for (const node of nodes) {
      const parent = node.parentElement;
      if (transformTextNode(node, ratio, doc) && parent) touchedParents.add(parent);
    }
    touchedParents.forEach((el) => el.setAttribute(MARK_ATTR, "c"));
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

  function block(el) {
    if (el && el.setAttribute) el.setAttribute(BLOCK_ATTR, "true");
  }

  global.BionicReader = { apply, revert, block, MARK_ATTR };
})(typeof window !== "undefined" ? window : globalThis);
