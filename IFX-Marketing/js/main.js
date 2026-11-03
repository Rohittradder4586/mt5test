/* ==========================================================================
   IFX MARKETING — Main interactions
   Vanilla JavaScript (ES5-compatible syntax, no dependencies, no frameworks)
   --------------------------------------------------------------------------
   Modules:
     1.  Config + helpers
     2.  Header / mobile navigation
     3.  Scroll reveal
     4.  Animated counters
     5.  Active nav link on scroll
     6.  FAQ accordion
     7.  Contact channel links (WhatsApp / Telegram)
     8.  VIDEO LEAD GATE  (validate -> submit -> confirm -> close -> play)
     9.  Toast + back-to-top
   ========================================================================== */
(function () {
  "use strict";

  /* ======================================================================
     1. CONFIG + HELPERS
     ====================================================================== */

  var CFG = window.IFX_CONFIG || {};
  var FORM_CFG = CFG.form || {};

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function isPlaceholder(value) {
    if (!value) return true;
    var v = String(value).trim();
    return (
      v === "" ||
      v.indexOf("PASTE_") === 0 ||
      v.indexOf("PASTE_") > -1 ||
      v.indexOf("YOUR_") > -1 ||
      v === "#"
    );
  }

  function safeUrl(value) {
    if (isPlaceholder(value)) return "";
    try {
      var u = new URL(value, window.location.href);
      if (u.protocol === "https:" || u.protocol === "http:") return u.href;
    } catch (e) {
      /* invalid URL */
    }
    return "";
  }

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ======================================================================
     2. HEADER / MOBILE NAVIGATION
     ====================================================================== */

  function initHeader() {
    var header = $(".site-header");
    var toggle = $(".nav-toggle");
    var menu = $("#mobile-menu");
    var lastScroll = 0;

    function onScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (header) {
        if (y > 12) header.classList.add("is-stuck");
        else header.classList.remove("is-stuck");
      }
      lastScroll = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (!toggle || !menu) return;

    function openMenu() {
      menu.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("is-locked");
      var first = $(".mobile-menu__link", menu);
      if (first) first.focus();
    }

    function closeMenu(returnFocus) {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      if (!document.querySelector(".gate.is-open")) {
        document.body.classList.remove("is-locked");
      }
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) closeMenu(true);
      else openMenu();
    });

    $$("a", menu).forEach(function (link) {
      link.addEventListener("click", function () { closeMenu(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu(true);
      }
    });

    // Close when resizing to desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 900 && menu.classList.contains("is-open")) {
        closeMenu(false);
      }
    });
  }

  /* ======================================================================
     3. SCROLL REVEAL
     ====================================================================== */

  function initReveal() {
    var items = $$(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    items.forEach(function (el) { io.observe(el); });
  }

  /* ======================================================================
     4. ANIMATED COUNTERS
     ====================================================================== */

  function initCounters() {
    var counters = $$("[data-count]");
    if (!counters.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      var decimals = (el.getAttribute("data-decimals") || "0") | 0;

      if (reduceMotion) {
        el.textContent = target.toFixed(decimals) + suffix;
        return;
      }

      var start = null;
      var duration = 1500;

      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    if (!("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            run(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ======================================================================
     5. ACTIVE NAV LINK
     ====================================================================== */

  function initActiveNav() {
    var links = $$(".nav__link[href^='#']");
    var sections = links
      .map(function (l) { return document.getElementById(l.getAttribute("href").slice(1)); })
      .filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (l) { l.classList.remove("is-active"); });
          var active = links.filter(function (l) {
            return l.getAttribute("href") === "#" + entry.target.id;
          })[0];
          if (active) active.classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ======================================================================
     6. FAQ ACCORDION
     ====================================================================== */

  function initFaq() {
    var items = $$(".faq-item");
    if (!items.length) return;

    items.forEach(function (item, index) {
      var btn = $(".faq-q", item);
      var panel = $(".faq-a", item);
      if (!btn || !panel) return;

      var panelId = "faq-panel-" + index;
      var btnId = "faq-btn-" + index;
      panel.id = panelId;
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", btnId);
      btn.id = btnId;
      btn.setAttribute("aria-controls", panelId);
      btn.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");

      btn.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");
        // Accordion behaviour: one open at a time
        items.forEach(function (other) {
          other.classList.remove("is-open");
          var ob = $(".faq-q", other);
          if (ob) ob.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ======================================================================
     7. CONTACT CHANNELS
     ====================================================================== */

  function initChannels() {
    var channels = $$("[data-channel]");

    channels.forEach(function (el) {
      var kind = el.getAttribute("data-channel");
      var url = "";

      if (kind === "whatsapp") url = safeUrl(CFG.whatsappUrl);
      if (kind === "telegram") url = safeUrl(CFG.telegramUrl);

      if (kind === "email") {
        var mail = CFG.email || "connect.ifx@gmail.com";
        el.setAttribute("href", "mailto:" + mail);
        return;
      }

      if (url) {
        el.setAttribute("href", url);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
        el.removeAttribute("aria-disabled");
      } else {
        // Placeholder not configured yet — never a broken link.
        el.setAttribute("href", "#contact");
        el.setAttribute("data-unconfigured", "true");
        el.setAttribute("aria-disabled", "true");
        el.addEventListener("click", function (e) {
          e.preventDefault();
          var label = kind === "whatsapp" ? "WhatsApp" : "Telegram";
          showToast(
            label + " link is not configured yet. Add it in js/config.js — meanwhile, email " +
              (CFG.email || "connect.ifx@gmail.com") + "."
          );
        });
      }
    });

    // Footer / inline links that mirror the channels
    $$("[data-email]").forEach(function (el) {
      var mail = CFG.email || "connect.ifx@gmail.com";
      el.textContent = mail;
      el.setAttribute("href", "mailto:" + mail);
    });
  }

  /* ======================================================================
     8. VIDEO LEAD GATE
     ====================================================================== */

  var Gate = (function () {
    var els = {};
    var lastFocused = null;
    var submitting = false;
    var isOpen = false;
    var successTimer = null;

    function cache() {
      els.gate = $("#gate");
      els.dialog = $("#gate-dialog");
      els.form = $("#gate-form");
      els.formView = $("#gate-form-view");
      els.success = $("#gate-success");
      els.name = $("#lead-name");
      els.phone = $("#lead-whatsapp");
      els.submit = $("#gate-submit");
      els.alert = $("#gate-alert");
      els.alertText = $("#gate-alert-text");
      els.close = $("#gate-close");
      els.thumb = $("#video-thumb");
      els.frame = $("#video-frame");
      els.player = $("#video-player");
      els.hint = $("#video-hint");
    }

    var FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    function focusables() {
      if (!els.dialog) return [];
      return $$(FOCUSABLE, els.dialog).filter(function (el) {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
      });
    }

    function open() {
      if (!els.gate || isOpen) return;
      lastFocused = document.activeElement;
      isOpen = true;
      els.gate.hidden = false;
      els.gate.classList.add("is-open");
      els.gate.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      resetForm();
      window.setTimeout(function () {
        if (els.name) els.name.focus();
      }, 120);
    }

    function close(returnFocus) {
      if (!els.gate) return;
      isOpen = false;
      els.gate.classList.remove("is-open");
      els.gate.setAttribute("aria-hidden", "true");
      if (!document.querySelector(".mobile-menu.is-open")) {
        document.body.classList.remove("is-locked");
      }
      if (successTimer) { window.clearTimeout(successTimer); successTimer = null; }
      window.setTimeout(function () {
        if (!isOpen) els.gate.hidden = true;
      }, 300);
      if (returnFocus !== false && lastFocused && lastFocused.focus) {
        lastFocused.focus();
      }
    }

    function resetForm() {
      if (els.form) {
        els.form.reset();
        els.form.hidden = false;
      }
      if (els.success) els.success.classList.remove("is-visible");
      if (els.formView) els.formView.hidden = false;
      hideAlert();
      clearFieldError(els.name);
      clearFieldError(els.phone);
      setLoading(false);
      submitting = false;
    }

    function setLoading(state) {
      submitting = state;
      if (!els.submit) return;
      els.submit.classList.toggle("is-loading", state);
      els.submit.disabled = state;
      els.submit.setAttribute("aria-busy", state ? "true" : "false");
      var label = $(".btn__label", els.submit);
      if (label) label.textContent = state ? "Submitting…" : "Watch the video";
    }

    function showAlert(message) {
      if (!els.alert) return;
      if (els.alertText) els.alertText.textContent = message;
      els.alert.classList.add("is-visible");
    }

    function hideAlert() {
      if (els.alert) els.alert.classList.remove("is-visible");
    }

    function fieldWrap(input) {
      return input ? input.closest(".field") : null;
    }

    function setFieldError(input, message) {
      var wrap = fieldWrap(input);
      if (!wrap) return;
      wrap.classList.add("has-error");
      input.setAttribute("aria-invalid", "true");
      var err = $(".field__error", wrap);
      if (err) err.textContent = message;
    }

    function clearFieldError(input) {
      var wrap = fieldWrap(input);
      if (!wrap) return;
      wrap.classList.remove("has-error");
      if (input) input.removeAttribute("aria-invalid");
    }

    /* ---------- validation ---------- */

    function validateName(value) {
      var v = (value || "").trim().replace(/\s+/g, " ");
      var min = FORM_CFG.minNameLength || 2;
      if (!v) return "Please enter your full name.";
      if (v.length < min) return "Name must be at least " + min + " characters.";
      if (!/^[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F .'\-]+$/.test(v)) {
        return "Please use letters only.";
      }
      return "";
    }

    function normalizePhone(value) {
      return String(value || "").replace(/[^\d]/g, "");
    }

    function validatePhone(value) {
      var digits = normalizePhone(value);
      var min = FORM_CFG.minPhoneDigits || 7;
      var max = FORM_CFG.maxPhoneDigits || 15;
      if (!digits) return "Please enter your WhatsApp number.";
      if (digits.length < min) return "Number is too short (min " + min + " digits).";
      if (digits.length > max) return "Number is too long (max " + max + " digits).";
      if (/^0+$/.test(digits)) return "Please enter a valid number.";
      return "";
    }

    function validate() {
      var ok = true;
      var firstBad = null;

      clearFieldError(els.name);
      clearFieldError(els.phone);

      var nameErr = validateName(els.name ? els.name.value : "");
      if (nameErr) {
        setFieldError(els.name, nameErr);
        ok = false;
        firstBad = firstBad || els.name;
      }

      var phoneErr = validatePhone(els.phone ? els.phone.value : "");
      if (phoneErr) {
        setFieldError(els.phone, phoneErr);
        ok = false;
        firstBad = firstBad || els.phone;
      }

      if (firstBad) firstBad.focus();
      return ok;
    }

    /* ---------- submission ---------- */

    function payload() {
      return {
        fullName: els.name.value.trim().replace(/\s+/g, " "),
        whatsapp: els.phone.value.trim(),
        whatsappDigits: normalizePhone(els.phone.value),
        page: window.location.href,
        source: "IFX Marketing — video gate",
        userAgent: navigator.userAgent,
        submittedAt: new Date().toISOString()
      };
    }

    function submit() {
      if (submitting) return;
      hideAlert();
      if (!validate()) return;

      var endpoint = CFG.appsScriptUrl;

      if (isPlaceholder(endpoint)) {
        showAlert(
          "Lead capture is not connected yet. Add your Google Apps Script Web App URL in js/config.js (appsScriptUrl) and try again."
        );
        return;
      }

      setLoading(true);

      var controller = null;
      var timeoutId = null;

      if (typeof AbortController !== "undefined") {
        controller = new AbortController();
        timeoutId = window.setTimeout(function () {
          controller.abort();
        }, FORM_CFG.timeoutMs || 15000);
      }

      var body = new URLSearchParams();
      body.append("fullName", payload().fullName);
      body.append("whatsapp", payload().whatsapp);
      body.append("whatsappDigits", payload().whatsappDigits);
      body.append("page", payload().page);
      body.append("source", payload().source);
      body.append("submittedAt", payload().submittedAt);

      /*
       * text/plain avoids the CORS preflight that Apps Script cannot answer.
       * Apps Script still reads everything from e.postData.contents.
       */
      fetch(endpoint, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        cache: "no-store",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload()),
        signal: controller ? controller.signal : undefined
      })
        .then(function (res) {
          return res.text().then(function (text) {
            return { ok: res.ok, status: res.status, text: text };
          });
        })
        .then(function (result) {
          if (timeoutId) window.clearTimeout(timeoutId);

          var data = null;
          try { data = JSON.parse(result.text); } catch (e) { data = null; }

          var succeeded =
            data &&
            (data.status === "success" || data.result === "success" || data.ok === true);

          if (!result.ok || !succeeded) {
            throw new Error(
              (data && data.message) ||
                "The server did not confirm your submission (status " + result.status + ")."
            );
          }

          onSuccess();
        })
        .catch(function (err) {
          if (timeoutId) window.clearTimeout(timeoutId);
          setLoading(false);

          var msg = "We could not save your details. Please check your connection and try again.";
          if (err && err.name === "AbortError") {
            msg = "The request timed out. Please check your connection and try again.";
          } else if (err && err.message && err.message.indexOf("Failed to fetch") === -1) {
            msg = err.message + " Please try again.";
          }
          showAlert(msg);
          // Form stays open with the entered values -> visitor can retry.
          if (els.submit) els.submit.focus();
        });
    }

    function onSuccess() {
      setLoading(false);

      // 5. Confirm successful submission
      if (els.success) els.success.classList.add("is-visible");
      if (els.formView) els.formView.hidden = true;
      var successTitle = $("#gate-success");
      if (successTitle) successTitle.focus && successTitle.focus();

      // 6 + 7. Close the form, then play the video in the same section
      successTimer = window.setTimeout(function () {
        close(false);
        playVideo();
      }, 1300);
    }

    function playVideo() {
      if (!els.frame) return;
      var id = CFG.youtubeVideoId || "cQq6iLF66Gc";

      /*
       * mute=1 guarantees the autoplay policy is satisfied. Once the player is
       * live we send the IFrame-API unMute command, so the sound comes on when
       * the browser permits it and the video always starts either way.
       */
      var src =
        "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(id) +
        "?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&color=white&enablejsapi=1&origin=" +
        encodeURIComponent(window.location.origin || "");

      // Build the iframe only now — the video cannot load before the gate passes.
      var player = document.createElement("iframe");
      player.id = "yt-player";
      player.src = src;
      player.title = "IFX Marketing — MT5 infrastructure overview";
      player.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      );
      player.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      player.setAttribute("allowfullscreen", "");
      player.setAttribute("loading", "eager");

      if (els.thumb) {
        els.thumb.hidden = true;
        els.thumb.setAttribute("aria-hidden", "true");
      }

      els.frame.appendChild(player);
      if (els.hint) {
        els.hint.textContent =
          "Now playing — IFX Marketing MT5 infrastructure overview. If audio is off, tap the player to unmute.";
      }

      var playerEl = $("#yt-player");
      if (playerEl) {
        playerEl.addEventListener("load", function () {
          window.setTimeout(function () {
            try {
              playerEl.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: "unMute", args: [] }),
                "*"
              );
            } catch (e) {
              /* autoplay stays muted — still playing */
            }
          }, 1200);
        });
      }

      var heading = $("#video-heading");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }

    /* ---------- wiring ---------- */

    function trap(e) {
      if (!isOpen || e.key !== "Tab") return;
      var list = focusables();
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function onKeydown(e) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
      if (e.key === "Tab") trap(e);
    }

    function init() {
      cache();
      if (!els.gate) return;

      if (els.thumb) {
        els.thumb.addEventListener("click", function (e) {
          e.preventDefault();
          open();
        });
      }

      $$("[data-open-gate]").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          open();
        });
      });

      if (els.close) {
        els.close.addEventListener("click", function () { close(true); });
      }

      var backdrop = $(".gate__backdrop");
      if (backdrop) backdrop.addEventListener("click", function () { close(true); });

      if (els.form) {
        els.form.addEventListener("submit", function (e) {
          e.preventDefault();
          submit();
        });

        // Live-clear errors when the visitor fixes a field
        [els.name, els.phone].forEach(function (input) {
          if (!input) return;
          input.addEventListener("input", function () {
            clearFieldError(input);
            hideAlert();
          });
          input.addEventListener("blur", function () {
            if (!input.value.trim()) return;
            if (input === els.name && validateName(input.value)) {
              setFieldError(input, validateName(input.value));
            }
            if (input === els.phone && validatePhone(input.value)) {
              setFieldError(input, validatePhone(input.value));
            }
          });
        });

        if (els.phone) {
          els.phone.addEventListener("input", function () {
            var cleaned = els.phone.value.replace(/[^\d+\s()-]/g, "");
            if (cleaned !== els.phone.value) els.phone.value = cleaned;
          });
        }
      }

      document.addEventListener("keydown", onKeydown);
    }

    return { init: init, open: open, close: close, playVideo: playVideo };
  })();

  /* ======================================================================
     9. TOAST + BACK TO TOP
     ====================================================================== */

  var toastTimer = null;
  function showToast(message) {
    var toast = $("#toast");
    if (!toast) return;
    var text = $("#toast-text", toast);
    if (text) text.textContent = message;
    toast.classList.add("is-visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 4200);
  }

  function initToTop() {
    var btn = $("#to-top");
    if (!btn) return;

    window.addEventListener(
      "scroll",
      function () {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        btn.classList.toggle("is-visible", y > 620);
      },
      { passive: true }
    );

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var brand = $(".brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  function initYear() {
    $$("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ======================================================================
     BOOT
     ====================================================================== */

  ready(function () {
    initHeader();
    initReveal();
    initCounters();
    initActiveNav();
    initFaq();
    initChannels();
    Gate.init();
    initToTop();
    initYear();

    // Expose for debugging / manual triggering
    window.IFX = {
      openGate: Gate.open,
      closeGate: Gate.close,
      playVideo: Gate.playVideo,
      toast: showToast,
      config: CFG
    };
  });
})();
