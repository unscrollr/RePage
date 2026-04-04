# Reddit Posts — Ready to Submit

---

## r/chrome

**Title:** RePage – Chrome extension that replaces infinite scroll with numbered pages on any website

Tired of infinite scroll? I built RePage — it adds numbered page navigation to every scrollable area on every website.

Install it and every feed looks like this:
`‹ 1 2 3 … 47 ›`

Works on Reddit, Twitter, YouTube, Wikipedia, Gmail, ChatGPT, Gemini, LinkedIn — everywhere.

Also includes: greyscale mode, disable autoplay, mute notification badges, hide like counts, text-only mode.

Keyboard shortcuts: **Z / X** (right-hand mouse friendly) or arrow keys.

Free and open source — no account, no tracking.

**Install:** https://chromewebstore.google.com/detail/repage-unscroll-the-inter/bpenhlddapadgmhkijphelpokhaaianm
**Source:** https://github.com/codycsmith41-a11y/repage

---

## r/nosurf

**Title:** Platforms removed the Next Page button because it costs them money — here's a tool that puts it back

When platforms switched to infinite scroll, session times went up — NBC saw 30% more mobile pageviews, Quartz saw 50% more stories per session. That's not accidental — it's how platforms extract more time than you'd otherwise give.

I built RePage, a Chrome extension that turns infinite scroll back into numbered pages on any website. Reddit, Twitter, YouTube, everything. When you reach the end of a page, there's a moment of decision — you choose to continue or stop. That's what infinite scroll removes.

It also blocks autoplay, mutes notification badges, optionally renders everything in greyscale (less stimulating), and strips social media images/videos if you want text-only feeds.

Research behind this:

- https://phys.org/news/2026-02-social-media-addictive-clicking.html
- https://adrianroselli.com/2015/05/for-infinite-scroll-bounce-rate-is.html
- https://www.uu.nl/en/news/researchers-advise-the-house-of-representatives-education-needed-on-safe-screen-use-for-children

Free, open source, no data collection.
**Chrome Web Store:** https://chromewebstore.google.com/detail/repage-unscroll-the-inter/bpenhlddapadgmhkijphelpokhaaianm

---

## r/productivity

**Title:** I replaced infinite scroll with numbered pages on every website — and it actually changed how I browse

The thing about infinite scroll is that it removes stopping points by design. There's never a natural moment to stop — the content just continues.

I built RePage, a Chrome extension that puts page numbers back on every website. Now when I'm on Reddit I'm on "page 3 of r/productivity." When I'm done with it I close it. That's it.

Features: numbered pagination everywhere, Z/X keyboard shortcuts, greyscale mode, disable autoplay, mute notification counts, hide like metrics, text-only feeds.

Free, open source.
**Chrome Web Store:** https://chromewebstore.google.com/detail/repage-unscroll-the-inter/bpenhlddapadgmhkijphelpokhaaianm
**GitHub:** https://github.com/codycsmith41-a11y/repage

---

## r/webdev

**Title:** Show r/webdev: Chrome MV3 extension that paginates any scrollable element on any page — technical writeup

Built a Chrome MV3 content script that replaces infinite scroll with numbered pagination on any page. Some notes on what made it interesting:

**Scroll container detection:** 15+ site-specific handlers for YouTube's `ytd-app` custom element, Facebook's `#scrollview`, Instagram's body-scroll, Reddit's virtual scroll list, AI chat managed scroll elements. Falls back to `window` scroll.

**SPA navigation:** Patches `history.pushState`/`replaceState` + `popstate` to re-init on every route change. Debounced to avoid thrashing.

**Shadow DOM bar:** Closed Shadow DOM so page JS can't query-select it and site CSS can't break it. Detects dark/light mode via `prefers-color-scheme` and also reads site-set `data-theme` attributes.

**Sub-scroll detection:** Second pass finds nested scrollable elements (sidebars, TOC panels, chat history lists). Width-aware: containers < 220px get arrows-only, wider get full numbered buttons.

**Form typing guard:** Walks full DOM tree for `contentEditable` + ARIA roles `textbox`/`searchbox`/`combobox` before intercepting keyboard shortcuts — so Z/X never fires in compose boxes or editors.

**Autoplay blocking:** `MutationObserver` on `document.body` catches dynamically-injected `<video>` elements, removes `autoplay` attr, calls `.pause()`.

~2,650 lines, no dependencies, Manifest V3.

Source: https://github.com/codycsmith41-a11y/repage
CWS: https://chromewebstore.google.com/detail/repage-unscroll-the-inter/bpenhlddapadgmhkijphelpokhaaianm
