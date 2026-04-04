# Hacker News — Show HN post

# Account: repagedev (needs ~7 days of karma before Show HN is unlocked)

# Submit at: https://news.ycombinator.com/submit

## Title (≤80 chars)

Show HN: RePage – turn infinite scroll into numbered pages on any site

## URL

https://chromewebstore.google.com/detail/repage-unscroll-the-inter/bpenhlddapadgmhkijphelpokhaaianm

## Text

RePage is a Chrome MV3 content script that replaces infinite scroll with numbered pagination on any website — Reddit, Twitter, YouTube, Wikipedia, Gmail, ChatGPT, everything.

The motivation: when platforms switched from paginated feeds to infinite scroll, session metrics rose sharply — NBC +30% mobile pageviews, Quartz +50% stories/session, Time −15pp bounce rate (Roselli 2015, citing publisher data). Separately, a 2025 Marketing Theory study (Hoang & Lascaux) found infinite scroll drives "automated" consumption where deliberate use is displaced by reflex. The Next Page button wasn't removed because users preferred scrolling — it was removed because removing it is profitable. RePage reverses that.

Technical notes for HN:

- Closed Shadow DOM bar (invisible to page JS and site CSS)
- Patches history.pushState/replaceState for SPA re-init
- 15+ site-specific scroll container handlers (ytd-app, #scrollview, bodyScroll etc.)
- Sub-scroll detection with width-aware rendering (< 220px = arrows-only)
- Form-typing guard walks full DOM tree before intercepting Z/X shortcuts
- MutationObserver-based autoplay blocking

~2,650 lines, zero dependencies, Manifest V3. Source on GitHub: https://github.com/codycsmith41-a11y/repage

Also includes greyscale mode, disable autoplay, mute notification badges, hide like counts — all the levers that make the interface less engineered to hold attention.
