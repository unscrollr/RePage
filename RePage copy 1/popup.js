(function () {
  "use strict";

  // =============================================
  // DEFAULTS
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

  var DEFAULT_SETTINGS = {
    darkMode:   true,
    muteNotifs: false,
    hideLikes:  false,
    greyscale:  false,
    textOnly:   false,
    noAutoplay: false
  };

  // =============================================
  // STATE
  // =============================================
  var skipList    = [];
  var currentHost = "";
  var settings    = {};

  // =============================================
  // GET ACTIVE TAB HOST
  // =============================================
  function getCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs[0] && tabs[0].url) {
        try {
          var url = new URL(tabs[0].url);
          callback(url.hostname.replace(/^www\./, ""));
        } catch (e) { callback(""); }
      } else {
        callback("");
      }
    });
  }

  // =============================================
  // SKIP LIST
  // =============================================
  function loadSkipList(callback) {
    chrome.storage.sync.get({ skipSites: null }, function (data) {
      if (data.skipSites === null) {
        skipList = DEFAULT_SKIP.slice();
        saveSkipList(callback);
      } else {
        skipList = data.skipSites;
        if (callback) { callback(); }
      }
    });
  }

  function saveSkipList(callback) {
    chrome.storage.sync.set({ skipSites: skipList }, function () {
      if (callback) { callback(); }
    });
  }

  function isSkipped(host) {
    if (!host) { return false; }
    for (var i = 0; i < skipList.length; i++) {
      if (host.indexOf(skipList[i]) !== -1) { return true; }
    }
    return false;
  }

  function renderSkipList() {
    var container = document.getElementById("skip-list");
    if (!container) { return; }
    container.innerHTML = "";

    if (skipList.length === 0) {
      var empty = document.createElement("div");
      empty.style.cssText =
        "color:var(--text-muted);font-size:11px;" +
        "padding:8px;text-align:center;";
      empty.textContent = "No disabled sites";
      container.appendChild(empty);
      return;
    }

    var sorted = skipList.slice().sort();
    for (var i = 0; i < sorted.length; i++) {
      (function (site) {
        var item = document.createElement("div");
        item.className = "skip-item";

        var name = document.createElement("span");
        name.className   = "skip-item-name";
        name.textContent = site;

        var btn = document.createElement("button");
        btn.className   = "remove-btn";
        btn.textContent = "✕";
        btn.title       = "Remove " + site;
        btn.addEventListener("click", function () {
          removeSite(site);
        });

        item.appendChild(name);
        item.appendChild(btn);
        container.appendChild(item);
      })(sorted[i]);
    }
  }

  function addSite(raw) {
    var site = (raw || "").trim().toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
    if (!site) { return; }
    for (var i = 0; i < skipList.length; i++) {
      if (skipList[i] === site) { return; }
    }
    skipList.push(site);
    saveSkipList(function () {
      renderSkipList();
      updateSiteStatus();
    });
  }

  function removeSite(site) {
    skipList = skipList.filter(function (s) { return s !== site; });
    saveSkipList(function () {
      renderSkipList();
      updateSiteStatus();
    });
  }

  // =============================================
  // SITE STATUS
  // =============================================
  function updateSiteStatus() {
    var statusEl = document.getElementById("site-status");
    var btnEl    = document.getElementById("toggle-site-btn");
    if (!statusEl || !btnEl) { return; }

    if (!currentHost) {
      statusEl.className   = "site-status site-active";
      statusEl.textContent = "Cannot detect current site";
      btnEl.style.display  = "none";
      return;
    }

    var skipped = isSkipped(currentHost);
    btnEl.style.display = "";

    if (skipped) {
      statusEl.className   = "site-status site-skipped";
      statusEl.textContent = "RePage is disabled on " + currentHost;
      btnEl.className      = "current-site-btn btn-enable";
      btnEl.textContent    = "Enable RePage on " + currentHost;
    } else {
      statusEl.className   = "site-status site-active";
      statusEl.textContent = "RePage is active on " + currentHost;
      btnEl.className      = "current-site-btn btn-disable";
      btnEl.textContent    = "Disable RePage on " + currentHost;
    }
  }

  function toggleCurrentSite() {
    if (!currentHost) { return; }
    if (isSkipped(currentHost)) {
      var match = null;
      for (var i = 0; i < skipList.length; i++) {
        if (currentHost.indexOf(skipList[i]) !== -1) {
          match = skipList[i];
          break;
        }
      }
      if (match) { removeSite(match); }
    } else {
      addSite(currentHost);
    }
  }

  // =============================================
  // SETTINGS
  // =============================================
  function loadSettings(callback) {
    chrome.storage.sync.get(DEFAULT_SETTINGS, function (stored) {
      settings = stored;
      renderAllToggles();
      applyThemeToPopup();
      if (callback) { callback(); }
    });
  }

  function saveSetting(key, value) {
    settings[key] = value;
    var patch = {};
    patch[key] = value;
    chrome.storage.sync.set(patch);
  }

  // Sync every toggle track element to the current settings object
  function renderAllToggles() {
    var keys = Object.keys(DEFAULT_SETTINGS);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key === "darkMode") { continue; } // handled by applyThemeToPopup
      var track = document.getElementById("toggle-" + key);
      if (track) { setTrack(track, !!settings[key]); }
    }
  }

  function setTrack(track, isOn) {
    if (isOn) { track.classList.add("on"); }
    else      { track.classList.remove("on"); }
  }

  // =============================================
  // THEME
  // =============================================
  function applyThemeToPopup() {
    if (settings.darkMode) {
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.add("light-mode");
    }
    var track = document.getElementById("theme-track");
    var label = document.getElementById("theme-label");
    if (track) { setTrack(track, !!settings.darkMode); }
    if (label) { label.textContent = settings.darkMode ? "Dark" : "Light"; }
  }

  // =============================================
  // EVENT WIRING
  // =============================================
  function setupEvents() {

    // Site toggle button
    var siteBtnEl = document.getElementById("toggle-site-btn");
    if (siteBtnEl) {
      siteBtnEl.addEventListener("click", toggleCurrentSite);
    }

    // Add-site
    var addInput = document.getElementById("add-site-input");
    var addBtn   = document.getElementById("add-site-btn");
    if (addInput && addBtn) {
      addBtn.addEventListener("click", function () {
        addSite(addInput.value);
        addInput.value = "";
      });
      addInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          addSite(this.value);
          this.value = "";
        }
      });
    }

    // Dark/Light toggle
    var themeTrack = document.getElementById("theme-track");
    if (themeTrack) {
      themeTrack.addEventListener("click", function () {
        saveSetting("darkMode", !settings.darkMode);
        applyThemeToPopup();
      });
    }

    // Feature toggles — single delegated listener on the section
    var featSection = document.getElementById("features-section");
    if (featSection) {
      featSection.addEventListener("click", function (e) {
        // Walk up from click target to find a data-key toggle-track
        var el = e.target;
        while (el && el !== featSection) {
          if (el.classList &&
              el.classList.contains("toggle-track") &&
              el.dataset &&
              el.dataset.key) {
            break;
          }
          el = el.parentElement;
        }
        if (!el || !el.dataset || !el.dataset.key) { return; }

        var key    = el.dataset.key;
        var newVal = !settings[key];
        saveSetting(key, newVal);
        setTrack(el, newVal);
      });
    }
  }

  // =============================================
  // INIT
  // =============================================
  function init() {
    setupEvents();

    getCurrentTab(function (host) {
      currentHost = host;

      // Load skip list and settings concurrently,
      // render UI only when both are ready
      var pending = 2;
      function onReady() {
        pending--;
        if (pending === 0) {
          renderSkipList();
          updateSiteStatus();
        }
      }

      loadSkipList(onReady);
      loadSettings(onReady);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();