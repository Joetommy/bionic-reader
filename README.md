# Bionic Reader

An open-source tool that transforms on-screen text into ["bionic reading"](https://bionic-reading.com/) format — bolding the leading portion of each word so your eyes anchor faster, boosting reading speed and comprehension.

**Goal:** transform text wherever you read it — starting with a browser extension (Chrome + Firefox), eventually extending to any on-screen text — without altering the original design, layout, or source content.

## Status

🚧 v0.1 — browser extension MVP. Toggle bionic reading on any webpage, adjust fixation strength, works with dynamically loaded content.

## Project layout

```
extension/          Web extension (Manifest V3, Chrome + Firefox)
  manifest.json
  src/
    bionic.js        Core word-transformation engine (DOM-agnostic-ish)
    content.js        Applies/reverts transformation on the active page
    background.js      Sets extension defaults
    popup.html/js/css  Toggle + fixation-strength UI
  icons/
docs/                Design notes, future-platform research
```

## How it works

`bionic.js` walks the page's text nodes with a `TreeWalker`, splits each into words, and wraps the leading N% of each word (fixation ratio, adjustable 30–70%) in a `<b>` tag marked with `data-bionic="b"`. Reverting removes only those marked tags, restoring the page exactly as it was — no other markup or styling is touched. Code, inputs, editable regions, and non-text elements are skipped.

## Loading the extension locally

### Chrome / Chromium / Edge / Brave
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` folder

### Firefox
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on…"
3. Select `extension/manifest.json`

## Roadmap

- [x] Core bionic transformation engine
- [x] Chrome/Firefox extension with popup toggle + intensity control
- [ ] Per-site enable/disable and allow/block lists
- [ ] Keyboard shortcut to toggle
- [ ] Safari extension (via Xcode web extension converter)
- [ ] System-wide text transformation (OS-level accessibility APIs / overlay rendering) for native apps beyond the browser
- [ ] Packaging + store listings (Chrome Web Store, Firefox Add-ons)

## Contributing

Issues and PRs welcome. Keep the core transformation engine (`bionic.js`) framework-free so it can be reused outside the extension (e.g. a future desktop overlay).

## License

MIT — see [LICENSE](LICENSE).
