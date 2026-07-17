# Bionic Reader

An open-source tool that transforms on-screen text into ["bionic reading"](https://bionic-reading.com/) format. It bolds the leading portion of each word so your eyes anchor faster, which speeds up reading and comprehension.

The goal is to transform text wherever you read it. We're starting with a browser extension for Chrome and Firefox, and the plan is to eventually extend this to any on-screen text, without altering the original design, layout, or source content.

## Status

v0.2, browser extension. You can toggle bionic reading per site or turn it on everywhere by default, adjust the fixation strength, and it keeps working as new content loads in. It's also been hardened against a few real-world layout edge cases (CSS truncation, flex/grid containers, pages that rewrite their own text after we've touched it).

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

`bionic.js` walks the page's text nodes with a `TreeWalker`, splits each into words, and wraps the leading portion of each word (the fixation ratio, adjustable from 30% to 70%) in a `<b>` tag marked with `data-bionic="b"`. Reverting removes only those marked tags and restores the page exactly as it was, without touching any other markup or styling. Code, inputs, editable regions, and non-text elements are skipped entirely.

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
- [x] Chrome/Firefox extension with popup toggle and intensity control
- [x] Per-site toggle alongside a global default
- [ ] Real toolbar/store icons (current ones are flat placeholders)
- [ ] Keyboard shortcut to toggle
- [ ] Safari extension (via Xcode web extension converter)
- [ ] System-wide text transformation (OS-level accessibility APIs or overlay rendering) for native apps beyond the browser
- [ ] Packaging and store listings (Chrome Web Store, Firefox Add-ons)

## Contributing

Issues and PRs welcome. Keep the core transformation engine (`bionic.js`) framework-free so it can be reused outside the extension, for example in a future desktop overlay.

## License

MIT. See [LICENSE](LICENSE).
