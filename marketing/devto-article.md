---
title: Infinite scroll steals up to 30% of your time — so I built a Chrome extension to stop it
published: true
description: RePage replaces infinite scroll with numbered pagination on every website. Here's why infinite scroll is a dark pattern, who it hurts most, and how the extension works technically.
tags: chrome, productivity, opensource, digitalwellbeing
cover_image: https://raw.githubusercontent.com/codycsmith41-a11y/repage/main/screenshots/main-bar.png
---

When platforms switched from paginated feeds to infinite scroll, session times went up — in some cases dramatically. NBC reported 30% more mobile pageviews. Quartz saw 50% more stories read per session. Time.com saw bounce rate drop 15 percentage points. [These are real platform metrics.](https://adrianroselli.com/2015/05/for-infinite-scroll-bounce-rate-is.html)

That's not a coincidence. It's the point. More content consumed per session = more ad impressions = more revenue. The Next Page button wasn't removed because users preferred scrolling — it was removed because removing it is profitable.

This is a dark pattern — a deliberate design choice that benefits the platform at the user's expense. Most people don't know it's happening.

I built **RePage** to put that time back.

---

## What RePage does

Install it, and every infinitely-scrolling page gets a numbered nav bar at the bottom:

```
‹  1  2  3  …  47  ›
```

Use **Z** and **X** (optimised for right-hand mouse users) or **← →** arrows to flip pages. Sub-scroll containers — Wikipedia's TOC, ChatGPT's conversation sidebar, chat contact lists — get their own smaller nav bar that scales to the container width.

It runs on everything: Reddit, Twitter/X, YouTube, Wikipedia, Gmail, ChatGPT, Gemini, LinkedIn, Facebook, Instagram. Any website with a scrollable area.

**Features beyond pagination:**

- Greyscale mode — renders the entire page in black & white (makes interfaces less stimulating)
- Disable Autoplay — pauses all videos on page load
- Mute Notifications — hides unread badges and notification counts
- Hide Like Counts — removes social engagement metrics
- Text-Only mode — strips all photos and videos from social feeds

---

## Why scrolling itself is the problem

Scrolling isn't neutral. Research shows it mimics the continuous visual flow that evolved to signal movement through a physical environment — the same mechanism that motivated early humans to explore. Platforms exploit this at a neurological level.

Infinite scroll removes the one thing that interrupts that flow: **the end of the page**.

This disproportionately affects:

- **Neurodivergent people** — ADHD, autism, and impulsivity profiles are significantly more vulnerable to compulsive scroll behaviour
- **Children** — whose impulse regulation is still developing
- **Anyone in a low-willpower state** — tired, stressed, or bored

[Utrecht University researchers](https://www.uu.nl/en/news/researchers-advise-the-house-of-representatives-education-needed-on-safe-screen-use-for-children) have specifically advised parliament that education and design interventions are needed around screen use for children — with infinite scroll cited as a primary mechanism.

A [2025 study in _Marketing Theory_](https://phys.org/news/2026-02-social-media-addictive-clicking.html) (Hoang & Lascaux) found that features like infinite scroll and autoplay drive digital overconsumption through "automated mechanisms" — not content quality, not notifications, but the structural removal of stopping points. Users described opening apps "without a conscious thought," with deliberate action displaced by reflex.

---

## The extension is step one

The browser extension targets the web. But the pattern exists everywhere — mobile apps, OS interfaces, TVs. The goal is to unscroll all of tech, starting with putting the _page_ back in _webpage_.

RePage is free and open source. There's no business model that depends on you being on the site longer.

---

## How it works technically

RePage is a Manifest V3 content script (~2,650 lines, zero dependencies). Here's what makes it non-trivial:

**Scroll container detection.** Every site manages scroll differently. RePage detects whether the page uses `window` scroll, an inner scrollable container (YouTube's `ytd-app`, Facebook's `#scrollview`), or an AI chat's managed scroll element. It has explicit handling for 15+ major sites.

**SPA navigation.** Reddit, Twitter, YouTube replace page content without reloading. RePage patches `history.pushState` and `popstate` to re-initialise on every route change.

**Shadow DOM bar.** The nav bar lives in a closed Shadow DOM — page JavaScript can't query-select it, and site CSS can't accidentally break it.

**Sub-scroll detection.** A second pass finds nested scrollable elements (sidebars, TOC panels, chat histories) and attaches mini nav bars. The width-aware renderer switches to arrows-only mode for containers < 220px wide.

**Form-typing guard.** The keyboard shortcuts check walks the full DOM tree for `contentEditable`, `[role="textbox"]`, `[role="searchbox"]` — so typing in any editor, compose box, or search field never triggers a page turn.

**Autoplay blocking.** Uses a `MutationObserver` to catch dynamically-injected videos, removes the `autoplay` attribute, and calls `.pause()` immediately on load.

---

## Install

**[Chrome Web Store →](https://chromewebstore.google.com/detail/repage-unscroll-the-inter/bpenhlddapadgmhkijphelpokhaaianm)**

Free. No account. No data collection. Permissions: `activeTab` + `storage` only.

**[Source on GitHub →](https://github.com/codycsmith41-a11y/repage)**

If it breaks on a site you use — or misses a scrollable area — open an issue. Every site that works is one less dark pattern in someone's day.
