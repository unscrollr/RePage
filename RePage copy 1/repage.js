(function () {
  "use strict";

  // =============================================
  // CONFIGURATION
  // =============================================
  var BASE_BAR_HEIGHT = 48;
  var CHECK_INTERVAL  = 2000;
  var FIXED_RESCAN_MS = 500;

  // =============================================
  // SKIP LIST
  // =============================================
  var DEFAULT_SKIP = [
    "docs.google.com",
    "sheets.google.com",
    "slides.google.com",
    "drive.google.com",
    "mail.google.com",
    "calendar.google.com",
    "meet.google.com",
    "maps.google.com",
    "figma.com",
    "codepen.io",
    "codesandbox.io"
  ];

  // =============================================
  // GENTLE MODE SITES
  // =============================================
  var GENTLE_SITES = [
    "youtube.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "tiktok.com",
    "linkedin.com"
  ];

  // =============================================
  // INNER-SCROLL SITES
  // Sites that use an internal scrollable container
  // rather than window scroll. We scroll that
  // container directly to keep IntersectionObserver
  // (infinite-scroll trigger) working correctly.
  // =============================================
  var INNER_SCROLL_SITES = [
    {
      host: "instagram.com",
      name: "instagram",
      selectors: [
        "main[role='main']",
        "section main",
        "main"
      ]
    }
  ];

  // =============================================
  // SOCIAL SITES
  // =============================================
  var SOCIAL_SITES = [
    "instagram.com", "facebook.com", "twitter.com",
    "x.com", "reddit.com", "tiktok.com", "linkedin.com",
    "pinterest.com", "tumblr.com", "snapchat.com"
  ];

  // =============================================
  // AI CHAT SITES
  // =============================================
  var AI_CHAT_SITES = [
    { host: "chat.openai.com",       name: "chatgpt"    },
    { host: "chatgpt.com",           name: "chatgpt"    },
    { host: "claude.ai",             name: "claude"     },
    { host: "gemini.google.com",     name: "gemini"     },
    { host: "bard.google.com",       name: "gemini"     },
    { host: "perplexity.ai",         name: "perplexity" },
    { host: "copilot.microsoft.com", name: "copilot"    },
    { host: "you.com",               name: "you"        },
    { host: "poe.com",               name: "poe"        },
    { host: "mistral.ai",            name: "mistral"    },
    { host: "character.ai",          name: "character"  },
    { host: "huggingface.co",        name: "hf"         }
  ];

  var AI_SCROLL_SELECTORS = {
    chatgpt:    [
      "div[class*='react-scroll-to-bottom']",
      "main .overflow-y-auto",
      "div[class*='overflow-y-auto']"
    ],
    claude:     [
      "div[class*='overflow-y-scroll']",
      "main div[class*='scroll']",
      "div[data-testid='conversation-content']"
    ],
    gemini:     [
      ".conversation-container",
      "infinite-scroller",
      "chat-history"
    ],
    perplexity: [
      "main div[class*='overflow']",
      ".prose-container",
      "div[class*='scroll']"
    ],
    copilot:    ["cib-chat-main", "div[class*='scroll']", "main"],
    you:        ["div[class*='overflow']", "main", "#search-results"],
    poe:        [
      "div[class*='InfiniteScroll']",
      "div[class*='chatMessage']",
      "section"
    ],
    mistral:    [
      "div[class*='overflow-y']",
      "main",
      "div[class*='scroll']"
    ],
    character:  [
      "div[class*='chat-messages']",
      "div[class*='overflow']",
      "main"
    ],
    hf:         ["div[class*='overflow-y']", "main", ".message-wrap"]
  };

  // =============================================
  // STATE
  // =============================================
  var currentPage       = 1;
  var totalPages        = 1;
  var stepHeight        = 0;
  var contentHeight     = 0;
  var isInitialized     = false;
  var wrapper           = null;
  var isGentleMode      = false;
  var isAIChat          = false;
  var isInnerScroll     = false;
  var innerScrollEl     = null;
  var innerScrollConfig = null;
  var isSocialSite      = false;
  var aiChatType        = null;
  var aiScrollEl        = null;

  var activeModal       = null;
  var modalPage         = 1;
  var modalTotalPages   = 1;
  var modalStepHeight   = 0;

  var fixedTopOffset    = 0;
  var fixedBottomOffset = 0;
  var fixedScanTimer    = null;

  // Bar update debounce
  var barUpdateTimer    = null;

  var settings = {
    darkMode:   true,
    muteNotifs: false,
    hideLikes:  false,
    greyscale:  false,
    textOnly:   false,
    noAutoplay: false
  };

  var subScrollers = [];

  // =============================================
  // THEME HELPERS — pure black / pure white
  // =============================================
  function barBg()     { return settings.darkMode ? "#0a0a0a" : "#ffffff"; }
  function barBorder() { return settings.darkMode ? "#2a2a2a" : "#cccccc"; }
  function btnBg()     { return settings.darkMode ? "#1a1a1a" : "#f0f0f0"; }
  function btnBgAct()  { return "#4361ee"; }
  function btnCol()    { return settings.darkMode ? "#e0e0e0" : "#111111"; }
  function btnColAct() { return "#ffffff"; }
  function btnBorder() { return settings.darkMode ? "#2a2a2a" : "#dddddd"; }
  function infoCol()   { return settings.darkMode ? "#666666" : "#888888"; }
  function dotsCol()   { return settings.darkMode ? "#444444" : "#aaaaaa"; }
  function hoverBg()   { return settings.darkMode ? "#2a2a3e" : "#e8ecff"; }

  // =============================================
  // SETTINGS: LOAD / APPLY
  // =============================================
  function loadSettings(callback) {
    chrome.storage.sync.get({
      darkMode:   true,
      muteNotifs: false,
      hideLikes:  false,
      greyscale:  false,
      textOnly:   false,
      noAutoplay: false
    }, function (stored) {
      settings = stored;
      applySettings();
      if (callback) { callback(); }
    });
  }

  function applySettings() {
    var html = document.documentElement;
    toggleClass(html, "repage-dark",        settings.darkMode);
    toggleClass(html, "repage-light",       !settings.darkMode);
    toggleClass(html, "repage-greyscale",   settings.greyscale);
    toggleClass(html, "repage-hide-likes",  settings.hideLikes);
    toggleClass(html, "repage-mute-notifs", settings.muteNotifs);
    toggleClass(html, "repage-text-only",   settings.textOnly && isSocialSite);

    if (settings.hideLikes)                { injectSiteLikeHideCSS(); }
    if (settings.muteNotifs)               { injectSiteMuteCSS(); }
    if (settings.textOnly && isSocialSite) { injectTextOnlyCSS(); }
    if (settings.noAutoplay)               { disableAutoplay(); }

    // Rebuild bar with new theme colours if already running
    if (isInitialized) { scheduleBarRebuild(); }
  }

  function toggleClass(el, cls, on) {
    if (on) { el.classList.add(cls); }
    else    { el.classList.remove(cls); }
  }

  // =============================================
  // SITE-SPECIFIC CSS INJECTORS
  // =============================================
  function injectSiteLikeHideCSS() {
    if (document.getElementById("repage-like-css")) { return; }
    var s = document.createElement("style");
    s.id  = "repage-like-css";
    s.textContent = [
      'html.repage-hide-likes [data-testid="like"]',
      '  span[data-testid="app-text-transition-container"],',
      'html.repage-hide-likes [data-testid="unlike"]',
      '  span[data-testid="app-text-transition-container"],',
      'html.repage-hide-likes [id^="vote-arrows"] .score,',
      'html.repage-hide-likes shreddit-post [score],',
      'html.repage-hide-likes section span[class*="like"],',
      'html.repage-hide-likes [aria-label*="reactions" i],',
      'html.repage-hide-likes .social-details-social-counts__reactions',
      '{ visibility:hidden !important;',
      '  width:0 !important;',
      '  overflow:hidden !important; }'
    ].join("\n");
    (document.head || document.documentElement).appendChild(s);
  }

  function injectSiteMuteCSS() {
    if (document.getElementById("repage-mute-css")) { return; }
    var s = document.createElement("style");
    s.id  = "repage-mute-css";
    s.textContent = [
      'html.repage-mute-notifs [data-testid="notifBadge"],',
      'html.repage-mute-notifs [class*="jewel" i],',
      'html.repage-mute-notifs [class*="inbox-count" i],',
      'html.repage-mute-notifs yt-icon-badge-shape,',
      'html.repage-mute-notifs .ytd-notification-topbar-button-renderer',
      '{ display:none !important; }'
    ].join("\n");
    (document.head || document.documentElement).appendChild(s);
  }

  function injectTextOnlyCSS() {
    if (document.getElementById("repage-textonly-css")) { return; }
    var s = document.createElement("style");
    s.id  = "repage-textonly-css";
    s.textContent = [
      /* LinkedIn — collapse layout completely */
      'html.repage-text-only .update-components-image,',
      'html.repage-text-only .update-components-image__image-link,',
      'html.repage-text-only .feed-shared-image,',
      'html.repage-text-only .feed-shared-image__container,',
      'html.repage-text-only .update-components-linkedin-video,',
      'html.repage-text-only .update-components-linkedin-video__content,',
      'html.repage-text-only .feed-shared-linkedin-video,',
      'html.repage-text-only [class*="update-components-image"],',
      'html.repage-text-only [class*="feed-shared-image"],',
      'html.repage-text-only [class*="update-components-linkedin-video"],',
      'html.repage-text-only .update-components-document,',
      /* Twitter/X */
      'html.repage-text-only [data-testid="tweetPhoto"],',
      'html.repage-text-only [data-testid="videoComponent"],',
      /* Instagram */
      'html.repage-text-only article img,',
      'html.repage-text-only article video,',
      /* Reddit */
      'html.repage-text-only [class*="media-element"],',
      'html.repage-text-only shreddit-player,',
      /* Generic */
      'html.repage-text-only video,',
      'html.repage-text-only iframe[src*="youtube"],',
      'html.repage-text-only iframe[src*="vimeo"]',
      '{',
      '  display:none !important;',
      '  width:0 !important;',
      '  height:0 !important;',
      '  overflow:hidden !important;',
      '  margin:0 !important;',
      '  padding:0 !important;',
      '  border:none !important;',
      '}'
    ].join("\n");
    (document.head || document.documentElement).appendChild(s);
  }

  // =============================================
  // AUTOPLAY DISABLER
  // =============================================
  function disableAutoplay() {
    function processVideo(v) {
      if (!v) { return; }
      v.autoplay = false;
      v.removeAttribute("autoplay");
      try { v.pause(); } catch (e) { }
    }
    var vids = document.querySelectorAll("video");
    for (var i = 0; i < vids.length; i++) { processVideo(vids[i]); }

    if (!window.__repageAutoplayObs) {
      window.__repageAutoplayObs = new MutationObserver(function (muts) {
        for (var m = 0; m < muts.length; m++) {
          var added = muts[m].addedNodes;
          for (var n = 0; n < added.length; n++) {
            var node = added[n];
            if (node.nodeType !== 1) { continue; }
            if (node.tagName === "VIDEO") {
              processVideo(node);
            } else if (node.querySelectorAll) {
              var vs = node.querySelectorAll("video");
              for (var v = 0; v < vs.length; v++) { processVideo(vs[v]); }
            }
          }
        }
      });
      window.__repageAutoplayObs.observe(document.documentElement, {
        childList: true,
        subtree:   true
      });
    }
  }

  // =============================================
  // MEASURE FIXED ELEMENTS
  // =============================================
  function measureFixedElements() {
    var topMax = 0, bottomMax = 0;
    var vh = window.innerHeight, vw = window.innerWidth;
    var ownIds = ["repage-bar", "repage-wrapper", "repage-modal-bar"];
    var all = document.querySelectorAll("*");

    for (var i = 0; i < all.length; i++) {
      var el   = all[i];
      var elId = el.id || "";
      var skip = false;
      for (var k = 0; k < ownIds.length; k++) {
        if (elId === ownIds[k]) { skip = true; break; }
      }
      if (skip) { continue; }

      var cs;
      try { cs = window.getComputedStyle(el); } catch (e) { continue; }
      if (cs.position !== "fixed" && cs.position !== "sticky") { continue; }
      if (cs.display === "none" || cs.visibility === "hidden")  { continue; }
      if (parseFloat(cs.opacity) < 0.05)                        { continue; }

      var rect = el.getBoundingClientRect();
      if (rect.width  < vw * 0.30) { continue; }
      if (rect.height < 10)        { continue; }

      if (rect.top < vh * 0.40 && rect.bottom <= vh * 0.55) {
        if (rect.bottom > topMax) { topMax = rect.bottom; }
      }
      if (rect.top >= vh * 0.55) {
        var fb = vh - rect.top;
        if (fb > bottomMax) { bottomMax = fb; }
      }
    }

    fixedTopOffset    = topMax    > 0 ? topMax    + 4 : 0;
    fixedBottomOffset = bottomMax > 0 ? bottomMax + 4 : 0;
  }

  function getEffectiveStepHeight() {
    var a = window.innerHeight
          - BASE_BAR_HEIGHT
          - fixedTopOffset
          - fixedBottomOffset;
    if (a < 100) { a = 100; }
    return Math.floor(a);
  }

  function scheduleFixedScan() {
    if (fixedScanTimer) { clearTimeout(fixedScanTimer); }
    fixedScanTimer = setTimeout(function () {
      measureFixedElements();
      calculatePages();
      scheduleBarRebuild();
    }, FIXED_RESCAN_MS);
  }

  // =============================================
  // BAR UPDATE SCHEDULING
  //
  // scheduleBarRebuild() — debounced, tears down
  //   and fully rebuilds the bar DOM. Used when
  //   page count changes or theme changes.
  //
  // scheduleBarPatch() — debounced via
  //   requestAnimationFrame. Only updates button
  //   colours/text in-place. Used on every
  //   page navigation to prevent flicker.
  // =============================================
  function scheduleBarRebuild() {
    // Cancel any pending patch — rebuild supersedes it
    if (barUpdateTimer) {
      cancelAnimationFrame(barUpdateTimer);
      barUpdateTimer = null;
    }
    // Small timeout so rapid successive calls collapse
    setTimeout(function () {
      buildBar();
    }, 16);
  }

  function scheduleBarPatch() {
    if (barUpdateTimer) { cancelAnimationFrame(barUpdateTimer); }
    barUpdateTimer = requestAnimationFrame(function () {
      barUpdateTimer = null;
      patchBarInPlace();
    });
  }

  // =============================================
  // SUB-SCROLL CONTAINER PAGINATION
  // =============================================
  function findSubScrollContainers() {
    var registeredEls = [];
    for (var r = 0; r < subScrollers.length; r++) {
      registeredEls.push(subScrollers[r].el);
    }

    var candidates = document.querySelectorAll(
      "div, section, aside, article, nav, ul, ol, main"
    );

    for (var i = 0; i < candidates.length; i++) {
      var el   = candidates[i];
      var elId = el.id || "";

      if (elId.indexOf("repage") === 0)                { continue; }
      if (el.closest && el.closest("#repage-bar"))     { continue; }
      if (el.closest && el.closest("#repage-modal-bar")){ continue; }
      if (isAIChat     && el === aiScrollEl)           { continue; }
      if (isInnerScroll && el === innerScrollEl)       { continue; }

      var alreadyDone = false;
      for (var j = 0; j < registeredEls.length; j++) {
        if (registeredEls[j] === el) { alreadyDone = true; break; }
      }
      if (alreadyDone) { continue; }

      if (el.scrollHeight <= el.clientHeight + 10) { continue; }

      var cs;
      try { cs = window.getComputedStyle(el); } catch (e) { continue; }
      var ov = cs.overflowY || cs.overflow;
      if (ov !== "auto" && ov !== "scroll" && ov !== "overlay") { continue; }

      var rect = el.getBoundingClientRect();
      if (rect.width  < 80) { continue; }
      if (rect.height < 80) { continue; }
      if (rect.height > window.innerHeight * 0.85) { continue; }

      attachSubScroller(el);
    }
  }

  function attachSubScroller(el) {
    el.classList.add("repage-subpaged");

    var state = { el: el, page: 1, totalPages: 1, stepH: 0, bar: null };

    function recalc() {
      state.stepH = el.clientHeight;
      if (state.stepH < 1) { state.stepH = 100; }
      state.totalPages = (el.scrollHeight <= state.stepH + 2)
        ? 1
        : Math.max(1, Math.ceil(el.scrollHeight / state.stepH));
      if (state.page > state.totalPages) { state.page = state.totalPages; }
    }

    function goTo(p) {
      p = Math.max(1, Math.min(p, state.totalPages));
      state.page = p;
      var offset    = (state.page - 1) * state.stepH;
      var maxOffset = el.scrollHeight - el.clientHeight;
      if (maxOffset < 0)      { maxOffset = 0; }
      if (offset > maxOffset) { offset = maxOffset; }
      try { el.scrollTo({ top: offset, behavior: "smooth" }); }
      catch (e2) { el.scrollTop = offset; }
      renderSubBar();
    }

    function renderSubBar() {
      var bar = state.bar;
      if (!bar) { return; }
      while (bar.firstChild) { bar.removeChild(bar.firstChild); }

      bar.style.background    = barBg();
      bar.style.borderTopColor = barBorder();

      if (state.totalPages <= 1) { bar.style.display = "none"; return; }
      bar.style.display = "flex";

      bar.appendChild(makeSubBtn("‹", state.page > 1, function () {
        goTo(state.page - 1);
      }, false));

      var nums = getPageNumbers(state.page, state.totalPages);
      for (var i = 0; i < nums.length; i++) {
        if (nums[i] === "dots") {
          var d = document.createElement("span");
          d.textContent = "…";
          d.style.cssText =
            "color:" + dotsCol() + ";padding:0 3px;font-size:12px;" +
            "display:flex;align-items:center;";
          bar.appendChild(d);
        } else {
          (function (pn) {
            bar.appendChild(makeSubBtn(String(pn), true, function () {
              goTo(pn);
            }, pn === state.page));
          })(nums[i]);
        }
      }

      bar.appendChild(makeSubBtn("›", state.page < state.totalPages, function () {
        goTo(state.page + 1);
      }, false));

      var info = document.createElement("span");
      info.textContent = state.page + "/" + state.totalPages;
      info.style.cssText =
        "color:" + infoCol() + ";font-size:10px;display:flex;" +
        "align-items:center;padding:0 6px;white-space:nowrap;";
      bar.appendChild(info);
    }

    var bar = document.createElement("div");
    bar.style.cssText =
      "position:sticky;bottom:0;left:0;width:100%;height:32px;" +
      "display:flex;flex-direction:row;justify-content:center;" +
      "align-items:stretch;background:" + barBg() + ";" +
      "border-top:1px solid " + barBorder() + ";" +
      "z-index:2147483646;pointer-events:auto;gap:0;flex-shrink:0;";
    state.bar = bar;
    el.appendChild(bar);

    el.addEventListener("wheel", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY > 0) { goTo(state.page + 1); }
      else              { goTo(state.page - 1); }
    }, { passive: false, capture: true });

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(function () {
        recalc();
        renderSubBar();
      }).observe(el);
    }

    recalc();
    renderSubBar();
    subScrollers.push(state);
  }

  function makeSubBtn(label, enabled, onClick, isActive) {
    var btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText =
      "display:flex;align-items:center;justify-content:center;" +
      "height:100%;padding:0 8px;border:none;" +
      "border-right:1px solid " + btnBorder() + ";" +
      "background:" + (isActive ? btnBgAct() : btnBg()) + ";" +
      "color:" + (isActive ? btnColAct() : btnCol()) + ";" +
      "font-size:13px;font-weight:" + (isActive ? "700" : "500") + ";" +
      "cursor:" + (enabled ? "pointer" : "not-allowed") + ";" +
      "opacity:" + (enabled ? "1" : "0.35") + ";" +
      "pointer-events:auto;position:static;" +
      "min-width:28px;box-sizing:border-box;border-radius:0;";
    if (enabled && onClick) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
    }
    return btn;
  }

  function startSubScrollWatcher() {
    setTimeout(findSubScrollContainers, 1500);
    setTimeout(findSubScrollContainers, 4000);
    var mo = new MutationObserver(function () {
      if (startSubScrollWatcher._t) { clearTimeout(startSubScrollWatcher._t); }
      startSubScrollWatcher._t = setTimeout(findSubScrollContainers, 800);
    });
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  // =============================================
  // INNER-SCROLL MODE (Instagram)
  // =============================================
  function detectInnerScroll() {
    var host = window.location.hostname.replace("www.", "");
    for (var i = 0; i < INNER_SCROLL_SITES.length; i++) {
      if (host.indexOf(INNER_SCROLL_SITES[i].host) !== -1) {
        isInnerScroll    = true;
        innerScrollConfig = INNER_SCROLL_SITES[i];
        return true;
      }
    }
    return false;
  }

  function findInnerScrollContainer() {
    if (!innerScrollConfig) { return null; }
    var selectors = innerScrollConfig.selectors || [];
    for (var i = 0; i < selectors.length; i++) {
      var el;
      try { el = document.querySelector(selectors[i]); } catch (e) { continue; }
      if (!el) { continue; }
      if (el.scrollHeight > window.innerHeight * 0.5) { return el; }
    }
    return findTallestScrollable();
  }

  function calculateInnerScrollPages() {
    if (!innerScrollEl) { return; }
    stepHeight    = getEffectiveStepHeight();
    contentHeight = innerScrollEl.scrollHeight;
    totalPages = contentHeight <= stepHeight
      ? 1
      : Math.ceil(contentHeight / stepHeight);
    if (totalPages < 1)           { totalPages  = 1; }
    if (currentPage > totalPages) { currentPage = totalPages; }
  }

  function goToPageInner(page) {
    if (!innerScrollEl) { return; }
    page        = Math.max(1, Math.min(page, totalPages));
    currentPage = page;

    var offset    = (currentPage - 1) * stepHeight;
    var maxOffset = innerScrollEl.scrollHeight - innerScrollEl.clientHeight;
    if (maxOffset < 0)      { maxOffset = 0; }
    if (offset > maxOffset) { offset    = maxOffset; }

    // Set scrollTop directly — avoids triggering Instagram's
    // scroll-event debounce while still moving the container
    innerScrollEl.scrollTop = offset;

    // Re-fire a scroll event so Instagram's IntersectionObserver
    // re-evaluates the loading spinner visibility
    try {
      innerScrollEl.dispatchEvent(new Event("scroll", { bubbles: true }));
    } catch (e) { }

    scheduleBarPatch();
  }

  function watchInnerScrollContainer() {
    if (!innerScrollEl) { return; }

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(function () {
        var old = totalPages;
        calculateInnerScrollPages();
        if (totalPages !== old) { scheduleBarRebuild(); }
      }).observe(innerScrollEl);
    }

    new MutationObserver(function () {
      var old = totalPages;
      calculateInnerScrollPages();
      if (totalPages !== old) { scheduleBarRebuild(); }
    }).observe(innerScrollEl, { childList: true, subtree: true });

    innerScrollEl.addEventListener("wheel", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY > 0) { goToPageInner(currentPage + 1); }
      else              { goToPageInner(currentPage - 1); }
    }, { passive: false, capture: true });

    innerScrollEl.addEventListener("touchmove", stopEvent,
      { passive: false, capture: true });
  }

  // =============================================
  // AI CHAT DETECTION
  // =============================================
  function detectAIChat() {
    var host = window.location.hostname.replace("www.", "");
    for (var i = 0; i < AI_CHAT_SITES.length; i++) {
      if (host.indexOf(AI_CHAT_SITES[i].host) !== -1) {
        isAIChat   = true;
        aiChatType = AI_CHAT_SITES[i].name;
        return true;
      }
    }
    return false;
  }

  function detectSocialSite() {
    var host = window.location.hostname.replace("www.", "");
    for (var i = 0; i < SOCIAL_SITES.length; i++) {
      if (host.indexOf(SOCIAL_SITES[i]) !== -1) {
        isSocialSite = true;
        return;
      }
    }
  }

  function findAIScrollContainer() {
    if (!aiChatType) { return null; }
    var selectors = AI_SCROLL_SELECTORS[aiChatType] || [];
    for (var i = 0; i < selectors.length; i++) {
      var el;
      try { el = document.querySelector(selectors[i]); } catch (e) { continue; }
      if (!el) { continue; }
      var cs = window.getComputedStyle(el);
      var ov = cs.overflowY || cs.overflow;
      if (el.scrollHeight > el.clientHeight ||
          ov === "auto" || ov === "scroll" || ov === "overlay") {
        return el;
      }
    }
    return findTallestScrollable();
  }

  function findTallestScrollable() {
    var best = null, bestRatio = 0;
    var divs = document.querySelectorAll("div, main, section, article");
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if (el.scrollHeight <= el.clientHeight) { continue; }
      var cs = window.getComputedStyle(el);
      var ov = cs.overflowY || cs.overflow;
      if (ov !== "auto" && ov !== "scroll" && ov !== "overlay") { continue; }
      var ratio = el.scrollHeight / Math.max(el.clientHeight, 1);
      if (ratio > bestRatio) { bestRatio = ratio; best = el; }
    }
    return best;
  }

  // =============================================
  // AI CHAT PAGINATION
  // =============================================
  function calculateAIPages() {
    if (!aiScrollEl) { aiScrollEl = findAIScrollContainer(); }
    if (!aiScrollEl) { totalPages = 1; return; }
    stepHeight    = getEffectiveStepHeight();
    contentHeight = aiScrollEl.scrollHeight;
    totalPages = contentHeight <= stepHeight
      ? 1
      : Math.ceil(contentHeight / stepHeight);
    if (totalPages < 1)           { totalPages  = 1; }
    if (currentPage > totalPages) { currentPage = totalPages; }
  }

  function goToPageAI(page) {
    if (!aiScrollEl) {
      aiScrollEl = findAIScrollContainer();
      if (!aiScrollEl) { return; }
    }
    page        = Math.max(1, Math.min(page, totalPages));
    currentPage = page;
    var offset    = (currentPage - 1) * stepHeight;
    var maxOffset = Math.max(0, aiScrollEl.scrollHeight - aiScrollEl.clientHeight);
    if (offset > maxOffset) { offset = maxOffset; }
    try {
      aiScrollEl.scrollTo({ top: offset, behavior: "smooth" });
    } catch (e) {
      aiScrollEl.scrollTop = offset;
    }
    scheduleBarPatch();
  }

  function watchAIScrollContainer() {
    if (!aiScrollEl) { return; }

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(function () {
        var old = totalPages;
        calculateAIPages();
        if (totalPages !== old) { scheduleBarRebuild(); }
        if (currentPage === old && old < totalPages) { goToPageAI(totalPages); }
      }).observe(aiScrollEl);
    }

    new MutationObserver(function () {
      var old = totalPages;
      calculateAIPages();
      if (totalPages !== old) {
        scheduleBarRebuild();
        if (currentPage === old && old < totalPages) { goToPageAI(totalPages); }
      }
    }).observe(aiScrollEl, { childList: true, subtree: true });

    aiScrollEl.addEventListener("wheel", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY > 0) { goToPageAI(currentPage + 1); }
      else              { goToPageAI(currentPage - 1); }
    }, { passive: false, capture: true });

    aiScrollEl.addEventListener("touchmove", stopEvent,
      { passive: false, capture: true });
  }

  // =============================================
  // SKIP LIST CHECK → START
  // =============================================
  function checkAndStart() {
    var host = (window.location.hostname || "").replace("www.", "");

    chrome.storage.sync.get({ skipSites: null }, function (data) {
      var skipList = data.skipSites === null ? DEFAULT_SKIP : data.skipSites;

      for (var i = 0; i < skipList.length; i++) {
        if (host.indexOf(skipList[i]) !== -1) { return; }
      }
      for (var j = 0; j < GENTLE_SITES.length; j++) {
        if (host.indexOf(GENTLE_SITES[j]) !== -1) {
          isGentleMode = true;
          break;
        }
      }

      detectAIChat();
      detectSocialSite();
      detectInnerScroll();

      loadSettings(startExtension);
    });
  }

  chrome.storage.onChanged.addListener(function (changes) {
    var skeys = [
      "darkMode","muteNotifs","hideLikes",
      "greyscale","textOnly","noAutoplay"
    ];
    var anySettings = false;
    for (var k = 0; k < skeys.length; k++) {
      if (changes[skeys[k]]) { anySettings = true; break; }
    }
    if (anySettings) { loadSettings(null); }

    if (changes.skipSites) {
      var host    = window.location.hostname.replace("www.", "");
      var newList = changes.skipSites.newValue || [];
      var oldList = changes.skipSites.oldValue || [];
      var nowS = false, wasS = false;
      for (var i = 0; i < newList.length; i++) {
        if (host.indexOf(newList[i]) !== -1) { nowS = true; break; }
      }
      for (var j = 0; j < oldList.length; j++) {
        if (host.indexOf(oldList[j]) !== -1) { wasS = true; break; }
      }
      if (nowS !== wasS) { window.location.reload(); }
    }
  });

  // =============================================
  // START EXTENSION
  // =============================================
  function startExtension() {
    if (document.documentElement) {
      document.documentElement.style.overflow = "hidden";
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(initialize, 500);
      });
    } else {
      setTimeout(initialize, 500);
    }
    window.addEventListener("load", function () {
      setTimeout(function () {
        if (!isInitialized) { initialize(); }
        setTimeout(function () {
          measureFixedElements();
          calculatePages();
          scheduleBarRebuild();
          if (settings.noAutoplay) { disableAutoplay(); }
        }, 600);
      }, 1000);
    });
  }

  // =============================================
  // WRAP CONTENT
  // =============================================
  function wrapContent() {
    if (isAIChat || isInnerScroll) { wrapper = null; return; }

    wrapper    = document.createElement("div");
    wrapper.id = "repage-wrapper";

    if (isGentleMode) {
      var main = findMainContent();
      if (main) {
        while (main.firstChild) { wrapper.appendChild(main.firstChild); }
        main.appendChild(wrapper);
        wrapper._parentEl = main;
      } else {
        appendWrapperToBody();
      }
    } else {
      appendWrapperToBody();
    }

    wrapper.style.cssText =
      "position:relative !important;" +
      "top:0px !important;" +
      "left:0 !important;" +
      "width:100% !important;" +
      "padding-top:"    + fixedTopOffset + "px !important;" +
      "padding-bottom:" + (BASE_BAR_HEIGHT + fixedBottomOffset) + "px !important;" +
      "box-sizing:border-box !important;";
  }

  function appendWrapperToBody() {
    var frag = document.createDocumentFragment();
    while (document.body.firstChild) {
      frag.appendChild(document.body.firstChild);
    }
    wrapper.appendChild(frag);
    document.body.appendChild(wrapper);
  }

  function findMainContent() {
    var sel = [
      "main", "[role='main']", "#main",
      "#content", ".main-content", "article"
    ];
    for (var i = 0; i < sel.length; i++) {
      var el = document.querySelector(sel[i]);
      if (el) { return el; }
    }
    return null;
  }

  // =============================================
  // KILL SCROLLING
  // =============================================
  function killScrolling() {
    document.documentElement.classList.add("repage-active");

    document.addEventListener("wheel", function (e) {
      if (e.target && e.target.closest) {
        if (e.target.closest("#repage-bar"))        { return; }
        if (e.target.closest("#repage-modal-bar"))  { return; }
        if (e.target.closest(".repage-subpaged"))   { return; }
      }
      if (isInnerScroll && innerScrollEl &&
          innerScrollEl.contains(e.target))         { return; }
      if (isAIChat) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      stopEvent(e);
    }, { passive: false, capture: true });

    document.addEventListener("touchmove", function (e) {
      if (e.target && e.target.closest) {
        if (e.target.closest("#repage-bar"))        { return; }
        if (e.target.closest("#repage-modal-bar"))  { return; }
        if (e.target.closest(".repage-subpaged"))   { return; }
      }
      if (isInnerScroll && innerScrollEl &&
          innerScrollEl.contains(e.target))         { return; }
      if (isAIChat && aiScrollEl &&
          aiScrollEl.contains(e.target))            { return; }
      stopEvent(e);
    }, { passive: false, capture: true });

    document.addEventListener("keydown", handleKeys, { capture: true });

    setInterval(function () {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    }, 50);

    window.addEventListener("scroll", function () {
      window.scrollTo(0, 0);
    }, { passive: true, capture: true });
  }

  function stopEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  // =============================================
  // KEYBOARD HANDLER
  // =============================================
  function handleKeys(e) {
    var tag = e.target && e.target.tagName
      ? e.target.tagName.toUpperCase() : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") { return; }
    if (e.target && e.target.isContentEditable) { return; }
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }

    var key = e.key || "";

    if (key === "x" || key === "X" ||
        key === "ArrowRight" || key === "PageDown" || key === " ") {
      e.preventDefault(); e.stopPropagation();
      navigateByOne(1);
      return;
    }
    if (key === "z" || key === "Z" ||
        key === "ArrowLeft" || key === "PageUp") {
      e.preventDefault(); e.stopPropagation();
      navigateByOne(-1);
      return;
    }
    if (key === "Home") {
      e.preventDefault(); e.stopPropagation();
      if (activeModal)       { navigateModal(1); }
      else if (isAIChat)     { goToPageAI(1); }
      else if (isInnerScroll){ goToPageInner(1); }
      else                   { goToPage(1); }
      return;
    }
    if (key === "End") {
      e.preventDefault(); e.stopPropagation();
      if (activeModal)       { navigateModal(modalTotalPages); }
      else if (isAIChat)     { goToPageAI(totalPages); }
      else if (isInnerScroll){ goToPageInner(totalPages); }
      else                   { goToPage(totalPages); }
      return;
    }
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function navigateByOne(dir) {
    if (activeModal)        { navigateModal(modalPage + dir);       }
    else if (isAIChat)      { goToPageAI(currentPage + dir);        }
    else if (isInnerScroll) { goToPageInner(currentPage + dir);     }
    else                    { goToPage(currentPage + dir);          }
  }

  // =============================================
  // MODAL WATCHER
  // =============================================
  function startModalWatcher() {
    var observer = new MutationObserver(function () {
      if (startModalWatcher._deb) { clearTimeout(startModalWatcher._deb); }
      startModalWatcher._deb = setTimeout(detectModal, 300);
    });
    if (document.body) {
      observer.observe(document.body, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ["style","class","aria-modal","role"]
      });
    }
    setTimeout(detectModal, 1000);
    setTimeout(detectModal, 3000);
  }

  function detectModal() {
    var candidates = document.querySelectorAll(
      '[role="dialog"],[role="alertdialog"],[aria-modal="true"],' +
      '.modal,.Modal,.overlay,.Overlay,.dialog,.Dialog,.popup,.Popup,' +
      '[class*="modal"],[class*="Modal"],[class*="dialog"],[class*="Dialog"],' +
      '[class*="cookie"],[class*="Cookie"],[class*="consent"],[class*="Consent"],' +
      '[class*="gdpr"],[class*="GDPR"]'
    );
    var bestModal = null, bestScore = 0;

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if ((el.id || "").indexOf("repage") === 0) { continue; }
      var cs;
      try { cs = window.getComputedStyle(el); } catch (err) { continue; }
      if (cs.display === "none" || cs.visibility === "hidden") { continue; }
      if (parseFloat(cs.opacity) < 0.1) { continue; }
      var pos = cs.position;
      if (pos !== "fixed" && pos !== "absolute") { continue; }
      var rect = el.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 50) { continue; }
      var score = rect.width * rect.height;
      if (pos === "fixed") { score *= 2; }
      var dist = Math.abs((rect.left + rect.width / 2)  - window.innerWidth  / 2) +
                 Math.abs((rect.top  + rect.height / 2) - window.innerHeight / 2);
      if (dist < 200) { score *= 1.5; }
      if (score > bestScore) { bestScore = score; bestModal = el; }
    }

    if (bestModal && bestModal !== activeModal) {
      activateModalPagination(bestModal);
    } else if (!bestModal && activeModal) {
      deactivateModalPagination();
    }
  }

  function activateModalPagination(modalEl) {
    activeModal = modalEl; modalPage = 1;
    if (modalEl.scrollHeight <= modalEl.clientHeight) {
      activeModal = null; return;
    }
    modalStepHeight  = modalEl.clientHeight;
    modalTotalPages  = Math.max(1,
      Math.ceil(modalEl.scrollHeight / modalStepHeight));
    modalEl.style.overflow = modalEl.style.overflowY = "hidden";
    buildModalControls(modalEl);
    navigateModal(1);
  }

  function deactivateModalPagination() {
    var ex = document.getElementById("repage-modal-bar");
    if (ex && ex.parentNode) { ex.parentNode.removeChild(ex); }
    if (activeModal) {
      try {
        activeModal.style.overflow  = "";
        activeModal.style.overflowY = "";
      } catch (e) { }
    }
    activeModal = null; modalPage = 1;
    modalTotalPages = 1; modalStepHeight = 0;
  }

  function navigateModal(page) {
    if (!activeModal) { return; }
    modalPage = Math.max(1, Math.min(page, modalTotalPages));
    var offset    = (modalPage - 1) * modalStepHeight;
    var maxOffset = activeModal.scrollHeight - activeModal.clientHeight;
    if (offset > maxOffset) { offset = maxOffset; }
    activeModal.scrollTop = offset;
    updateModalControls();
  }

  function buildModalControls(modalEl) {
    var ex = document.getElementById("repage-modal-bar");
    if (ex && ex.parentNode) { ex.parentNode.removeChild(ex); }
    var bar = document.createElement("div");
    bar.id  = "repage-modal-bar";
    bar.style.cssText =
      "position:sticky;bottom:0;left:0;width:100%;height:36px;" +
      "background:" + barBg() + ";" +
      "display:flex;justify-content:center;align-items:stretch;gap:0;" +
      "z-index:2147483647;border-top:1px solid " + barBorder() + ";" +
      "pointer-events:auto;box-sizing:border-box;";
    modalEl.appendChild(bar);
    updateModalControls();
  }

  function updateModalControls() {
    var bar = document.getElementById("repage-modal-bar");
    if (!bar) { return; }
    while (bar.firstChild) { bar.removeChild(bar.firstChild); }

    var prev = makeModalBtn("Prev", modalPage === 1);
    if (modalPage > 1) {
      prev.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        navigateModal(modalPage - 1);
      });
    }
    bar.appendChild(prev);

    var info = document.createElement("span");
    info.textContent = modalPage + " / " + modalTotalPages;
    info.style.cssText =
      "color:" + infoCol() + ";font-size:11px;" +
      "display:flex;align-items:center;padding:0 8px;";
    bar.appendChild(info);

    var next = makeModalBtn("Next", modalPage === modalTotalPages);
    if (modalPage < modalTotalPages) {
      next.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        navigateModal(modalPage + 1);
      });
    }
    bar.appendChild(next);
  }

  function makeModalBtn(text, isDisabled) {
    var btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText =
      "display:flex;align-items:center;justify-content:center;" +
      "height:100%;padding:0 14px;border:none;" +
      "border-right:1px solid " + btnBorder() + ";" +
      "background:" + btnBg() + ";color:" + btnCol() + ";" +
      "border-radius:0;" +
      "cursor:" + (isDisabled ? "not-allowed" : "pointer") + ";" +
      "font-size:12px;opacity:" + (isDisabled ? "0.3" : "1") + ";" +
      "pointer-events:auto;position:static;box-sizing:border-box;";
    return btn;
  }

  // =============================================
  // CALCULATE PAGES (standard mode)
  // =============================================
  function calculatePages() {
    if (isAIChat)      { calculateAIPages();          return; }
    if (isInnerScroll) { calculateInnerScrollPages(); return; }

    stepHeight = getEffectiveStepHeight();
    contentHeight = wrapper
      ? wrapper.scrollHeight
      : Math.max(
          document.body ? document.body.scrollHeight : 0,
          document.documentElement.scrollHeight || 0
        );

    if (stepHeight < 1) { stepHeight = window.innerHeight || 400; }

    totalPages = contentHeight <= stepHeight
      ? 1
      : Math.ceil(contentHeight / stepHeight);

    if (totalPages  < 1)          { totalPages  = 1; }
    if (currentPage > totalPages) { currentPage = totalPages; }
  }

  // =============================================
  // GO TO PAGE (standard mode)
  // =============================================
  function goToPage(page) {
    if (isAIChat)      { goToPageAI(page);    return; }
    if (isInnerScroll) { goToPageInner(page); return; }

    page        = Math.max(1, Math.min(page, totalPages));
    currentPage = page;

    if (wrapper) {
      var rawOffset = (currentPage - 1) * stepHeight - fixedTopOffset;
      if (rawOffset < 0) { rawOffset = 0; }
      var maxOffset = contentHeight - stepHeight;
      if (maxOffset < 0)          { maxOffset = 0; }
      if (rawOffset > maxOffset)  { rawOffset = maxOffset; }
      wrapper.style.top = "-" + rawOffset + "px";
    }

    window.scrollTo(0, 0);
    scheduleBarPatch();
  }

  // =============================================
  // PAGE NUMBER SEQUENCE
  // =============================================
  function getPageNumbers(current, total) {
    var pages = [], i;
    if (total <= 9) {
      for (i = 1; i <= total; i++) { pages.push(i); }
      return pages;
    }
    pages.push(1);
    if (current > 4) { pages.push("dots"); }
    var start = Math.max(2, current - 2);
    var end   = Math.min(total - 1, current + 2);
    for (i = start; i <= end; i++) { pages.push(i); }
    if (current < total - 3) { pages.push("dots"); }
    pages.push(total);
    return pages;
  }

  // =============================================
  // MAIN PAGINATION BAR
  //
  // buildBar()      — full DOM build. Called once
  //                   at init, on theme change,
  //                   and when page count changes.
  // patchBarInPlace() — zero DOM changes, only
  //                   updates styles/text on
  //                   existing nodes. Called on
  //                   every page navigation.
  //                   Eliminates flicker entirely.
  // =============================================

  // Stable references to every interactive node in the bar.
  // Populated by buildBar(), read by patchBarInPlace().
  var barRefs = {
    el:    null,   // the bar div itself
    first: null,
    prev:  null,
    nums:  [],     // [{el, page}]  — page number buttons only
    dots:  [],     // dot spans (kept for colour updates)
    next:  null,
    last:  null,
    info:  null,
    badge: null
  };

  // The page-number window that was last rendered.
  // If getPageNumbers() returns a different-length
  // array we do a full rebuild instead of a patch.
  var barLastPages = [];

  function buildBar() {
    // ── Remove old bar ──────────────────────────
    var old = document.getElementById("repage-bar");
    if (old && old.parentNode) { old.parentNode.removeChild(old); }

    // Reset refs
    barRefs = {
      el: null, first: null, prev: null,
      nums: [], dots: [], next: null, last: null,
      info: null, badge: null
    };
    barLastPages = [];

    if (!document.body) { return; }

    // ── Create bar shell ────────────────────────
    var barEl = document.createElement("div");
    barEl.id  = "repage-bar";

    // All layout is done with inline styles that carry !important
    // so host-page CSS cannot interfere.
    barEl.setAttribute("style",
      "position:fixed !important;" +
      "bottom:0 !important;" +
      "left:0 !important;" +
      "width:100vw !important;" +
      "height:" + BASE_BAR_HEIGHT + "px !important;" +
      "min-height:" + BASE_BAR_HEIGHT + "px !important;" +
      "max-height:" + BASE_BAR_HEIGHT + "px !important;" +
      "display:flex !important;" +
      "flex-direction:row !important;" +
      "align-items:stretch !important;" +
      "justify-content:flex-start !important;" +
      "gap:0 !important;" +
      "z-index:2147483647 !important;" +
      "border-top:2px solid " + barBorder() + " !important;" +
      "background:" + barBg() + " !important;" +
      "padding:0 !important;" +
      "margin:0 !important;" +
      "overflow:hidden !important;" +
      "pointer-events:auto !important;" +
      "transform:translateZ(0) !important;" +
      "isolation:isolate !important;" +
      "box-sizing:border-box !important;" +
      "font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif !important;"
    );
    barRefs.el = barEl;

    // ── AI badge ────────────────────────────────
    if (isAIChat) {
      var badge = document.createElement("span");
      badge.setAttribute("style",
        "display:flex !important;align-items:center !important;" +
        "flex:0 0 auto !important;padding:0 8px !important;" +
        "font-size:10px !important;font-weight:700 !important;" +
        "color:#4cc9f0 !important;border-right:1px solid " + btnBorder() + " !important;" +
        "white-space:nowrap !important;letter-spacing:0.05em !important;" +
        "box-sizing:border-box !important;"
      );
      badge.textContent = "AI";
      barEl.appendChild(badge);
      barRefs.badge = badge;
    }

    // ── First button ────────────────────────────
    barRefs.first = createBarBtn("⏮", false);
    barEl.appendChild(barRefs.first);

    // ── Prev button ─────────────────────────────
    barRefs.prev = createBarBtn("◀ Prev", false);
    barEl.appendChild(barRefs.prev);

    // ── Page number buttons (flex:1 so they share remaining space) ──
    // We build the initial set here; patchBarInPlace() will
    // update text/state without touching the DOM unless the
    // count changes, which triggers a full rebuild.
    var pages = getPageNumbers(currentPage, totalPages);
    barLastPages = pages.slice();

    for (var i = 0; i < pages.length; i++) {
      if (pages[i] === "dots") {
        var d = createDotSpan();
        barEl.appendChild(d);
        barRefs.dots.push(d);
        barRefs.nums.push({ el: d, page: "dots" });
      } else {
        var nb = createBarBtn(String(pages[i]), true);
        barEl.appendChild(nb);
        barRefs.nums.push({ el: nb, page: pages[i] });
      }
    }

    // ── Next button ─────────────────────────────
    barRefs.next = createBarBtn("Next ▶", false);
    barEl.appendChild(barRefs.next);

    // ── Last button ─────────────────────────────
    barRefs.last = createBarBtn("⏭", false);
    barEl.appendChild(barRefs.last);

    // ── Info label ──────────────────────────────
    var info = document.createElement("span");
    info.setAttribute("style",
      "display:flex !important;align-items:center !important;" +
      "flex:0 0 auto !important;padding:0 12px !important;" +
      "font-size:11px !important;white-space:nowrap !important;" +
      "color:" + infoCol() + " !important;" +
      "border-left:1px solid " + btnBorder() + " !important;" +
      "box-sizing:border-box !important;" +
      "margin-left:auto !important;"
    );
    barEl.appendChild(info);
    barRefs.info = info;

    document.body.appendChild(barEl);

    // Now apply all state (active page, disabled states, colours)
    // using the same patch path used during navigation — single
    // code path means no divergence bugs.
    patchBarInPlace();
  }

  // ── Creates a navigation/page-number button ──
  // isPageNum = true  → flex:1 (expands to fill space)
  // isPageNum = false → flex:0 (fixed-width nav button)
  function createBarBtn(label, isPageNum) {
    var btn = document.createElement("button");
    btn.textContent = label;
    btn.setAttribute("style",
      "display:flex !important;" +
      "align-items:center !important;" +
      "justify-content:center !important;" +
      "height:100% !important;" +
      (isPageNum
        ? "flex:1 1 0% !important;min-width:0 !important;"
        : "flex:0 0 auto !important;min-width:52px !important;") +
      "padding:0 6px !important;" +
      "margin:0 !important;" +
      "border:none !important;" +
      "border-right:1px solid " + btnBorder() + " !important;" +
      "background:" + btnBg() + " !important;" +
      "color:" + btnCol() + " !important;" +
      "border-radius:0 !important;" +
      "cursor:pointer !important;" +
      "font-size:13px !important;" +
      "font-weight:500 !important;" +
      "opacity:1 !important;" +
      "pointer-events:auto !important;" +
      "position:static !important;" +
      "text-decoration:none !important;" +
      "float:none !important;" +
      "box-sizing:border-box !important;" +
      "white-space:nowrap !important;" +
      "overflow:hidden !important;" +
      "font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif !important;" +
      "transition:background 0.1s ease, color 0.1s ease !important;"
    );

    // Hover highlight — mouseenter/leave so theme colours
    // are always read from current settings, not a stale closure
    btn.addEventListener("mouseenter", function () {
      if (btn.dataset.active !== "1" && btn.dataset.disabled !== "1") {
        btn.style.setProperty("background", hoverBg(), "important");
      }
    });
    btn.addEventListener("mouseleave", function () {
      if (btn.dataset.active !== "1" && btn.dataset.disabled !== "1") {
        btn.style.setProperty("background", btnBg(), "important");
      }
    });

    return btn;
  }

  // ── Creates an ellipsis span for the page window ──
  function createDotSpan() {
    var d = document.createElement("span");
    d.textContent = "…";
    d.setAttribute("style",
      "display:flex !important;align-items:center !important;" +
      "justify-content:center !important;" +
      "flex:1 1 0% !important;min-width:0 !important;" +
      "padding:0 !important;" +
      "font-size:16px !important;" +
      "color:" + dotsCol() + " !important;" +
      "background:" + barBg() + " !important;" +
      "box-sizing:border-box !important;" +
      "pointer-events:none !important;"
    );
    return d;
  }

  // ── Patch all button states without touching the DOM ──
  // This is the hot path called on every page turn.
  // No elements are created or destroyed here unless
  // the page-number window changes shape (rare).
  function patchBarInPlace() {
    if (!barRefs.el) { return; }

    var pages = getPageNumbers(currentPage, totalPages);

    // If the page-number window changed shape, do a full rebuild
    // (this happens when total pages changes, e.g. lazy-loaded content)
    if (pages.length !== barLastPages.length) {
      buildBar();
      return;
    }

    // ── Bar background / border colour ──────────
    barRefs.el.style.setProperty("background",   barBg(),     "important");
    barRefs.el.style.setProperty("border-color", barBorder(), "important");

    // ── First ───────────────────────────────────
    applyBtnState(barRefs.first, false, currentPage === 1, function () {
      dispatch(1);
    });

    // ── Prev ────────────────────────────────────
    applyBtnState(barRefs.prev, false, currentPage === 1, function () {
      dispatch(currentPage - 1);
    });

    // ── Page number slots ────────────────────────
    for (var i = 0; i < barRefs.nums.length; i++) {
      var ref = barRefs.nums[i];
      var pg  = pages[i];

      if (pg === "dots") {
        // Dot span — just refresh colour
        ref.el.style.setProperty("color",      dotsCol(), "important");
        ref.el.style.setProperty("background", barBg(),   "important");
        ref.page = "dots";
        continue;
      }

      // Update label and stored page number
      ref.el.textContent = String(pg);
      ref.page           = pg;
      barLastPages[i]    = pg;

      var isActive = (pg === currentPage);
      // Capture pg in closure correctly
      (function (targetPage, isAct) {
        applyBtnState(ref.el, isAct, false, function () {
          dispatch(targetPage);
        });
      })(pg, isActive);
    }

    // ── Next ────────────────────────────────────
    applyBtnState(barRefs.next, false, currentPage === totalPages, function () {
      dispatch(currentPage + 1);
    });

    // ── Last ────────────────────────────────────
    applyBtnState(barRefs.last, false, currentPage === totalPages, function () {
      dispatch(totalPages);
    });

    // ── Info label ───────────────────────────────
    if (barRefs.info) {
      barRefs.info.textContent = "Page " + currentPage + " / " + totalPages;
      barRefs.info.style.setProperty("color",        infoCol(),   "important");
      barRefs.info.style.setProperty("border-color", btnBorder(), "important");
    }
  }

  // ── Apply visual + behavioural state to one button ──
  // onClick is a plain function — stored as btn.onclick
  // so re-calling applyBtnState replaces the handler
  // cleanly without listener accumulation.
  function applyBtnState(btn, isActive, isDisabled, onClick) {
    if (!btn) { return; }

    btn.dataset.active   = isActive   ? "1" : "0";
    btn.dataset.disabled = isDisabled ? "1" : "0";

    var bg  = isActive   ? btnBgAct() : btnBg();
    var col = isActive   ? btnColAct() : btnCol();

    btn.style.setProperty("background",  bg,                               "important");
    btn.style.setProperty("color",       col,                              "important");
    btn.style.setProperty("font-weight", isActive   ? "700"    : "500",   "important");
    btn.style.setProperty("opacity",     isDisabled ? "0.35"   : "1",     "important");
    btn.style.setProperty("cursor",      isDisabled ? "not-allowed" : "pointer", "important");
    btn.style.setProperty("border-right-color", btnBorder(),              "important");

    // Replace click handler atomically — no listener stacking
    btn.onclick = isDisabled ? null : function (e) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    };
  }

  // ── Route a page number to the right navigation function ──
  function dispatch(page) {
    if (isAIChat)       { goToPageAI(page);    }
    else if (isInnerScroll) { goToPageInner(page); }
    else                { goToPage(page);      }
  }

  // =============================================
  // STARTUP NOTIFICATION TOAST
  // =============================================
  function showNotice() {
    var modeLabel = isAIChat
      ? "AI Chat mode"
      : (isInnerScroll
          ? "Feed mode"
          : (isGentleMode ? "Gentle mode" : "Active"));

    var logoSrc = "";
    try {
      logoSrc = chrome.runtime.getURL("repage.png");
    } catch (e) { }

    var n = document.createElement("div");
    n.setAttribute("style",
      "position:fixed !important;top:16px !important;right:16px !important;" +
      "background:" + barBg() + " !important;" +
      "color:" + btnCol() + " !important;" +
      "padding:12px 18px !important;border-radius:8px !important;" +
      "border:1px solid " + barBorder() + " !important;" +
      "z-index:2147483647 !important;" +
      "font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif !important;" +
      "font-size:13px !important;line-height:1.6 !important;" +
      "box-shadow:0 4px 20px rgba(0,0,0,0.4) !important;" +
      "max-width:280px !important;pointer-events:none !important;" +
      "opacity:1 !important;transition:opacity 0.5s ease !important;" +
      "isolation:isolate !important;"
    );
    n.innerHTML =
      (logoSrc
        ? "<img src='" + logoSrc + "' style='height:16px;vertical-align:middle;" +
          "margin-right:6px;border-radius:3px;display:inline-block'>"
        : "") +
      "<strong style='color:#4361ee'>RePage</strong> — " + modeLabel + ".<br>" +
      "<span style='color:#888;font-size:11px'>" +
      "Z / ← prev &nbsp;|&nbsp; X / → next" +
      "</span>";

    document.body.appendChild(n);
    setTimeout(function () {
      n.style.opacity = "0";
      setTimeout(function () {
        if (n.parentNode) { n.parentNode.removeChild(n); }
      }, 600);
    }, 3500);
  }

  // =============================================
  // CONTENT MONITOR
  // =============================================
  function startMonitor() {
    // Polling fallback — catches lazy-load etc.
    setInterval(function () {
      var old = totalPages;
      measureFixedElements();
      calculatePages();
      if (totalPages !== old) { scheduleBarRebuild(); }
    }, CHECK_INTERVAL);

    // MutationObserver for instant response to DOM changes
    if (typeof MutationObserver !== "undefined") {
      var targetEl = wrapper || document.body;
      if (targetEl) {
        new MutationObserver(function () {
          var old = totalPages;
          calculatePages();
          if (totalPages !== old) { scheduleBarRebuild(); }
        }).observe(targetEl, { childList: true, subtree: true });
      }

      // Watch for new fixed elements appearing late
      if (document.body) {
        new MutationObserver(scheduleFixedScan)
          .observe(document.body, {
            childList: true, subtree: true,
            attributes: true,
            attributeFilter: ["style", "class"]
          });
      }
    }
  }

  // =============================================
  // INJECT GLOBAL CSS
  // =============================================
  function injectGlobalCSS() {
    if (document.getElementById("repage-global-styles")) { return; }
    var style = document.createElement("style");
    style.id  = "repage-global-styles";
    style.textContent = [
      "html.repage-active, html.repage-active body {",
      "  overflow:hidden !important;",
      "  height:100vh !important;",
      "  max-height:100vh !important;",
      "  margin:0 !important;",
      "  padding:0 !important;",
      "  scroll-behavior:auto !important;",
      "}",
      "html.repage-greyscale {",
      "  filter:grayscale(100%) !important;",
      "}",
      "html.repage-greyscale #repage-bar {",
      "  filter:none !important;",
      "  isolation:isolate !important;",
      "}",
      "#repage-bar {",
      "  isolation:isolate !important;",
      "  filter:none !important;",
      "}",
      ".repage-subpaged {",
      "  overflow:hidden !important;",
      "  scrollbar-width:none !important;",
      "}",
      ".repage-subpaged::-webkit-scrollbar {",
      "  display:none !important;",
      "}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  // =============================================
  // INITIALIZE
  // =============================================
  function initialize() {
    if (isInitialized)  { return; }
    if (!document.body) { return; }
    isInitialized = true;

    measureFixedElements();
    wrapContent();
    killScrolling();

    if (isInnerScroll) {
      // ── Instagram / inner-scroll mode ───────────
      // Lock the window but leave the feed container
      // free so IntersectionObserver still fires.
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow            = "hidden";

      innerScrollEl = findInnerScrollContainer();

      if (!innerScrollEl) {
        var isRetries = 0;
        var isTimer   = setInterval(function () {
          innerScrollEl = findInnerScrollContainer();
          isRetries++;
          if (innerScrollEl || isRetries >= 20) {
            clearInterval(isTimer);
            if (innerScrollEl) {
              watchInnerScrollContainer();
              calculateInnerScrollPages();
              buildBar();
              goToPageInner(1);
            }
          }
        }, 500);
      } else {
        watchInnerScrollContainer();
        calculatePages();
        buildBar();
        goToPageInner(1);
      }

    } else if (isAIChat) {
      // ── AI chat mode ─────────────────────────────
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow            = "hidden";

      aiScrollEl = findAIScrollContainer();

      if (!aiScrollEl) {
        var aiRetries = 0;
        var aiTimer   = setInterval(function () {
          aiScrollEl = findAIScrollContainer();
          aiRetries++;
          if (aiScrollEl || aiRetries >= 20) {
            clearInterval(aiTimer);
            if (aiScrollEl) {
              watchAIScrollContainer();
              calculateAIPages();
              buildBar();
              goToPageAI(totalPages);
            }
          }
        }, 500);
      } else {
        watchAIScrollContainer();
        calculatePages();
        buildBar();
        goToPageAI(totalPages);
      }

    } else if (!isGentleMode) {
      // ── Full lock mode ───────────────────────────
      document.documentElement.style.cssText =
        "overflow:hidden !important;" +
        "height:100vh !important;" +
        "max-height:100vh !important;" +
        "margin:0 !important;" +
        "padding:0 !important;";

      document.body.style.cssText =
        "overflow:hidden !important;" +
        "height:100vh !important;" +
        "max-height:100vh !important;" +
        "margin:0 !important;" +
        "padding:0 !important;" +
        "position:relative !important;";

      calculatePages();
      buildBar();
      goToPage(1);

    } else {
      // ── Gentle mode ──────────────────────────────
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow            = "hidden";

      calculatePages();
      buildBar();
      goToPage(1);
    }

    showNotice();

    // ── Resize handler (debounced 120 ms) ────────
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) { clearTimeout(resizeTimer); }
      resizeTimer = setTimeout(function () {
        measureFixedElements();
        calculatePages();

        if (wrapper) {
          wrapper.style.paddingTop    = fixedTopOffset + "px";
          wrapper.style.paddingBottom = (BASE_BAR_HEIGHT + fixedBottomOffset) + "px";
        }

        if (isAIChat)       { goToPageAI(currentPage);    }
        else if (isInnerScroll) { goToPageInner(currentPage); }
        else                { goToPage(currentPage);      }

        // Force full rebuild so flex widths recalculate
        buildBar();
      }, 120);
    });

    startModalWatcher();
    startMonitor();
    startSubScrollWatcher();
  }

  // =============================================
  // ENTRY POINT
  // =============================================
  injectGlobalCSS();
  checkAndStart();


  // =============================================
  // SPA ROUTE CHANGE DETECTION
  // =============================================
  (function () {
    function onNav() {
      setTimeout(function () {
        if (typeof reInit === "function") { reInit(); }
      }, 500);
    }
    var _push = history.pushState.bind(history);
    var _replace = history.replaceState.bind(history);
    history.pushState = function () { _push.apply(history, arguments); onNav(); };
    history.replaceState = function () { _replace.apply(history, arguments); onNav(); };
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
  }());

})();
  