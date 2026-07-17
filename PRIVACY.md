# Privacy

Bionic Reader doesn't collect, store, or transmit any data about you or your browsing.

## What the extension does on your machine

- All text transformation happens locally in the page you're viewing. Nothing you read is sent anywhere.
- Your settings (whether it's on globally, which sites you've turned it on or off for, and your fixation strength) are saved with the browser's local extension storage (`chrome.storage.local` / `browser.storage.local`). That data stays on your device. It's not synced to a Google or Mozilla account, and there's no server on the other end to send it to, because there is no server.
- There's no analytics, telemetry, crash reporting, or third-party script of any kind in this extension. You can confirm this yourself: the entire source is in [extension/src](extension/src), and there isn't a single network request (`fetch`, `XMLHttpRequest`, or otherwise) anywhere in it.

## Why the permissions it asks for are there

- **storage** — to remember your on/off and fixation-strength settings locally, as described above.
- **activeTab** — to know which tab's popup you're looking at, so the per-site toggle can show and apply to the right site.
- **host permissions on all sites** — the whole point of the extension is transforming text on any page you visit, so it needs to be able to run on any page. It doesn't request or use this to read, log, or send anything back; it only rewrites the DOM of the page you're already on.

## If you don't trust an extension's word for it

Fair. That's exactly why this is open source under the [MIT license](LICENSE) — read [extension/src](extension/src) yourself, or load it unpacked and watch its network tab. It'll stay empty.
