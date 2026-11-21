
/* =========================================
   LEARN FORGE — MAIN APPLICATION
========================================= */

(() => {
  "use strict";

  /* CONFIGURATION */

  const CONFIG = window.SITE_CONFIG || {};

  // Starts from config.js, then follows the backend's capacity.
  let CAPACITY = Math.max(
    1,
    Number(CONFIG.capacity) || 40
  );

  const LINKS = CONFIG.links || {};

  if (CONFIG.features?.animations === false) {
    document.documentElement.classList.add("no-anim");
  }

  const API_URL = String(CONFIG.apiUrl || "").trim();

  const POLL_INTERVAL = 30000;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];


  /* APPLICATION STATE */

  const state = {
    count: null,
    source: "none",
    submitting: false,
    saved: false,
    polling: false,
    wasFull: false
  };

  const form = $("#regForm");
  const submitButton = $("#submitBtn");
  const formStatus = $("#formStatus");


  /* CONFIGURED LINKS */

  function isPlaceholder(url) {
    return !url || /REPLACE/i.test(String(url));
  }

  $$("[data-link]").forEach(element => {
    const key = element.dataset.link;
    const url = LINKS[key];

    if (url && !isPlaceholder(url)) {
      element.href = url;
    } else {
      element.hidden = true;
    }
  });

  if (CONFIG.contactEmail) {
    const contact = $("#contactMail");

    if (contact) {
      contact.textContent = CONFIG.contactEmail;
      contact.href = "mailto:" + CONFIG.contactEmail;
      contact.hidden = false;
    }
  }

  const yearElement = $("#yearNow");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }


  /* MOBILE NAVIGATION */

  const menuButton = $("#menuBtn");
  const navigation = $("#nav");

  if (menuButton && navigation) {

    function closeMenu() {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }

    menuButton.addEventListener("click", () => {
      const open = navigation.classList.toggle("open");

      menuButton.setAttribute(
        "aria-expanded",
        String(open)
      );
    });

    $$("a", navigation).forEach(link => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", event => {
      if (
        navigation.classList.contains("open") &&
        !navigation.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        closeMenu();
      }
    });
  }


  /* SEAT GRID */

  function buildSeatGrids() {

    $$("[data-grid]").forEach(grid => {

      const fragment = document.createDocumentFragment();

      for (let i = 0; i < CAPACITY; i++) {
        const seat = document.createElement("i");

        seat.setAttribute("aria-hidden", "true");

        fragment.appendChild(seat);
      }

      grid.replaceChildren(fragment);
    });
  }

  buildSeatGrids();

  /* Adopt the backend's capacity so it is defined in one place. */

  function applyCapacity(value) {

    const capacity = Math.floor(Number(value));

    if (
      !Number.isFinite(capacity) ||
      capacity < 1 ||
      capacity === CAPACITY
    ) {
      return;
    }

    CAPACITY = capacity;

    buildSeatGrids();
  }


  /* STATE HELPERS */

  function clampCount(value) {
    const count = Number(value);

    if (!Number.isFinite(count)) return null;

    return Math.min(
      CAPACITY,
      Math.max(0, Math.floor(count))
    );
  }

  function derivedState() {
    const known = Number.isInteger(state.count);

    return {
      known,
      count: state.count,

      remaining: known
        ? Math.max(0, CAPACITY - state.count)
        : null,

      full: known && state.count >= CAPACITY,

      percentage: known
        ? Math.min(
            100,
            Math.round((state.count / CAPACITY) * 100)
          )
        : 0
    };
  }


  /* NOTIFICATIONS */

  function showNotice(type, title, message) {

    if (!formStatus) return;

    const notice = document.createElement("div");

    notice.className = "notice " + type;

    notice.setAttribute(
      "role",
      type === "error" ? "alert" : "status"
    );

    const heading = document.createElement("strong");

    heading.textContent = title;

    const paragraph = document.createElement("p");

    paragraph.textContent = message;

    notice.append(heading, paragraph);

    formStatus.replaceChildren(notice);
  }


  /* RENDER SEAT COUNTER */

  function render() {

    const data = derivedState();

    $$("[data-bind='capacity']").forEach(element => {
      element.textContent = String(CAPACITY);
    });

    $$("[data-bind='count']").forEach(element => {
      element.textContent =
        data.known ? String(data.count) : "–";
    });

    $$("[data-bind='remaining']").forEach(element => {
      element.textContent =
        data.known ? String(data.remaining) : "–";
    });

    $$("[data-bind='status']").forEach(element => {

      element.textContent = data.full
        ? "Full"
        : data.known
          ? "Open"
          : "Checking";

      element.classList.toggle("is-full", data.full);

      element.classList.toggle(
        "is-unavailable",
        !data.known
      );
    });


    /* Seat indicators */

    $$("[data-grid]").forEach(grid => {

      $$("i", grid).forEach((seat, index) => {

        seat.classList.toggle(
          "on",
          data.known && index < data.count
        );

      });

      grid.setAttribute(
        "aria-label",
        data.known
          ? `${data.count} of ${CAPACITY} seats taken`
          : "Seat availability currently unavailable"
      );

    });


    /* Progress bar */

    const progress = $("#seatProgress");

    if (progress) {
      progress.style.width = data.percentage + "%";
    }


    /* Status information */

    let note = "Live seat availability is currently unavailable.";

    if (state.source === "live") {
      note = "Live count updated from registrations.";
    }

    if (state.source === "manual") {
      note = "Count updated by the organizers.";
    }

    $$("[data-bind='note']").forEach(element => {
      element.textContent = note;
    });


    /* Registration button */

    if (submitButton && !state.saved && !state.submitting) {

      submitButton.disabled = data.full;

      submitButton.textContent = data.full
        ? "Registration Closed"
        : "Submit Application ↗";
    }


    if (data.full && !state.wasFull && !state.saved) {

      showNotice(
        "warn",
        "Registration is full",
        "All available seats have been taken. Contact the organizers for future batch updates."
      );
    }

    state.wasFull = data.full;
  }


  /* FALLBACK COUNT */

  function fallbackCount() {

    const manual = clampCount(CONFIG.manualRegistered);

    if (manual !== null) {
      state.count = manual;
      state.source = "manual";
    } else {
      state.count = null;
      state.source = "none";
    }

    render();
  }


  /* API URL */

  function buildApiUrl(query) {

    const separator = API_URL.includes("?")
      ? "&"
      : "?";

    return API_URL + separator + query;
  }


  /* LOAD LIVE COUNT */

  async function loadCount() {

    if (CONFIG.features?.liveCounter === false) 
    {
      fallbackCount();
      return;
    }

    if (!API_URL) {
      fallbackCount();
      return;
    }

    if (state.polling) return;

    state.polling = true;

    try {

      const response = await fetch(
        buildApiUrl(
          "action=count&t=" + Date.now()
        ),
        {
          method: "GET",
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("Unable to load count");
      }

      const result = await response.json();

      if (result && result.ok) {
        applyCapacity(result.capacity);
      }

      const count = result && result.ok
        ? clampCount(result.count)
        : null;

      if (count !== null) {

        state.count = count;
        state.source = "live";

        render();

      } else if (state.source !== "live") {

        fallbackCount();
      }

    } catch (error) {

      console.error("Count error:", error);

      if (state.source !== "live") {
        fallbackCount();
      }

    } finally {

      state.polling = false;
    }
  }


  /* FORM VALIDATION */

  const validationRules = {

    name(value) {
      return value.trim().length >= 2
        ? ""
        : "Enter your full name.";
    },

    email(value) {
      const email = value.trim().toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
        /^[=+\-@]/.test(email)
      ) {
        return "Enter a valid email address.";
      }

      return "";
    },

    college(value) {
      return value.trim().length >= 3
        ? ""
        : "Enter your college name.";
    },

    year(value) {
      return value
        ? ""
        : "Select your year of study.";
    },

    branch(value) {
      return value.trim().length >= 2
        ? ""
        : "Enter your branch or department.";
    }

  };



  function getField(name) {
    return $("#f-" + name);
  }


  function validateField(name) {

    const field = getField(name);

    const error = $("#err-" + name);

    if (!field) return "Field unavailable.";

    const message = validationRules[name](field.value);

    if (error) {
      error.textContent = message;
    }

    field.setAttribute(
      "aria-invalid",
      String(Boolean(message))
    );

    return message;
  }


  function getInterests() {

    return $$(
      'input[name="interests"]:checked',
      form
    ).map(input => input.value);
  }


  function validateInterests() {

    const valid = getInterests().length > 0;

    const error = $("#err-interests");

    if (error) {
      error.textContent = valid
        ? ""
        : "Select at least one technical interest.";
    }

    return valid;
  }


  function validateForm() {

    let firstInvalid = null;

    Object.keys(validationRules).forEach(name => {

      if (validateField(name) && !firstInvalid) {
        firstInvalid = getField(name);
      }

    });

    if (!validateInterests() && !firstInvalid) {
      firstInvalid = $(
        'input[name="interests"]',
        form
      );
    }

    return firstInvalid;
  }


  /* LIVE FIELD VALIDATION */

  if (form) {

    Object.keys(validationRules).forEach(name => {

      const field = getField(name);

      field.addEventListener("blur", () => {
        validateField(name);
      });

      field.addEventListener("input", () => {

        if (field.getAttribute("aria-invalid") === "true") {
          validateField(name);
        }

      });

    });


    $$('input[name="interests"]', form).forEach(input => {

      input.addEventListener("change", () => {

        const error = $("#err-interests");

        if (error && error.textContent) {
          validateInterests();
        }

      });

    });

  }


  /* SAVE REGISTRATION */

  async function saveRegistration(data) {

    if (!API_URL) {
      return { status: "unsaved" };
    }

    try {

      const response = await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },

        body: JSON.stringify(data)

      });

      if (!response.ok) {
        throw new Error("Registration request failed");
      }

      return await response.json();

    } catch (error) {

      console.error("Registration error:", error);

      return { status: "error" };
    }
  }


  /* SUBMIT REGISTRATION */

  if (form) {

    form.addEventListener("submit", async event => {

      event.preventDefault();

      if (state.submitting || state.saved) return;

      /* Validate */

      const invalid = validateForm();

      if (invalid) {

        invalid.focus();

        showNotice(
          "error",
          "Check your information",
          "Please correct the highlighted fields."
        );

        return;
      }


      /* Capacity check */

      if (derivedState().full) {

        showNotice(
          "warn",
          "Registration is closed",
          "The first batch has reached its capacity."
        );

        return;
      }


      /* Bot protection */

      const honeypot = $("#f-website");

      if (honeypot?.value.trim()) return;


      /* Registration data */

      const data = {

        name: getField("name").value.trim(),

        email: getField("email").value
          .trim()
          .toLowerCase(),

        college: getField("college").value.trim(),

        year: getField("year").value,

        branch: getField("branch").value.trim(),

        interests: getInterests(),

        website: ""
      };


      /* Loading state */

      state.submitting = true;

      submitButton.disabled = true;

      submitButton.textContent = "Submitting...";

      form.setAttribute("aria-busy", "true");


      try {

        const result = await saveRegistration(data);

        const status = result?.status;

        if (result && result.capacity !== undefined) {
          applyCapacity(result.capacity);
        }

        const count = result && result.count !== undefined
          ? clampCount(result.count)
          : null;

        if (count !== null) {
          state.count = count;
          state.source = "live";
        }


        /* Successful registration */

        if (status === "saved" || status === "duplicate") {

          state.saved = true;

          state.source = "live";

          render();

          submitButton.disabled = true;

          submitButton.textContent =
            status === "saved"
              ? "Application Submitted ✓"
              : "Already Registered ✓";

          showNotice(
            "success",

            status === "saved"
              ? "Welcome to Learn Forge!"
              : "You are already registered.",

            status === "saved"
              ? "Your registration has been saved. Join the community chat for onboarding updates."
              : "This email already has a registration. Join the community chat for updates."
          );

          return;
        }


        /* Registration full */

        if (status === "full") {

          state.count = CAPACITY;

          state.source = "live";

          render();

          showNotice(
            "warn",
            "All seats are taken",
            `The first batch has reached its ${CAPACITY}-student capacity.`
          );

          return;
        }


        /* Spam */

        if (status === "spam") {

          showNotice(
            "error",
            "Unable to process application",
            "Please refresh the page and try again."
          );

          return;
        }


        /* Backend unavailable */

        if (status === "unsaved") {

          const backup = LINKS.form;

          if (backup && !isPlaceholder(backup)) {

            showNotice(
              "warn",
              "Registration link required",
              "The registration backend is not configured. Please use the backup form."
            );

            const link = document.createElement("a");

            link.href = backup;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "text-link";
            link.textContent = "Open backup registration form ↗";

            formStatus.querySelector(".notice")
              ?.appendChild(link);

          } else {

            showNotice(
              "error",
              "Registration is not configured",
              "Please contact the organizers."
            );
          }

          return;
        }


        /* General errors */

        if (status === "invalid") {

          showNotice(
            "error",
            "Check your information",
            "The server could not accept these details. Make sure your email address is valid and that every field is filled in."
          );

          return;
        }

        showNotice(
          "error",
          "Registration unsuccessful",
          "Please check your details and try again. If the problem continues, contact the organizers."
        );

      } finally {

        state.submitting = false;

        form.removeAttribute("aria-busy");

        if (!state.saved) {

          submitButton.disabled = false;

          submitButton.textContent = "Submit Application ↗";

          if (derivedState().full) {
            submitButton.disabled = true;
            submitButton.textContent = "Registration Closed";
          }
        }
      }

    });

  }


  /* THEME (LIGHT / DARK) */

  const THEME_KEY = "lf-theme";

  const THEME_COLORS = {
    dark: "#080808",
    light: "#faf8f3"
  };

  const themeButton = $("#themeBtn");

  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)");

  function getTheme() {
    return document.documentElement.dataset.theme === "light"
      ? "light"
      : "dark";
  }

  function paintTheme(theme) {

    document.documentElement.dataset.theme = theme;

    const meta = $('meta[name="theme-color"]');

    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);

    if (themeButton) {

      const label = theme === "dark"
        ? "Switch to light mode"
        : "Switch to dark mode";

      themeButton.setAttribute("aria-label", label);
      themeButton.setAttribute("title", label);
    }
  }

  paintTheme(getTheme());

  if (themeButton) {

    themeButton.addEventListener("click", () => {

      const next = getTheme() === "dark" ? "light" : "dark";

      const root = document.documentElement;

      const animate =
        CONFIG.features?.animations !== false &&
        !reduceMotion.matches;

      if (animate) {
        root.classList.add("theme-anim");

        window.setTimeout(() => {
          root.classList.remove("theme-anim");
        }, 450);
      }

      paintTheme(next);

      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        /* Storage unavailable: the theme still changes for this visit. */
      }
    });
  }


  /* INVERTING CURSOR
     A white dot and ring using mix-blend-mode: difference, so the
     cursor is always the opposite colour of whatever is under it. */

  function initCursor() {

    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    const root = document.documentElement;

    const dot = document.createElement("div");
    const ring = document.createElement("div");

    dot.className = "cursor-dot";
    ring.className = "cursor-ring";

    dot.setAttribute("aria-hidden", "true");
    ring.setAttribute("aria-hidden", "true");

    document.body.append(ring, dot);

    root.classList.add("has-cursor");

    const INTERACTIVE =
      'a, button, label, summary, [role="button"], input[type="checkbox"]';

    const TEXT_FIELD =
      'input:not([type="checkbox"]), textarea, select';

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    let frame = 0;

    function tick() {

      frame = 0;

      const ease = reduceMotion.matches ? 1 : 0.2;

      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;

      if (
        Math.abs(mouseX - ringX) < 0.1 &&
        Math.abs(mouseY - ringY) < 0.1
      ) {
        ringX = mouseX;
        ringY = mouseY;
      }

      dot.style.translate = `${mouseX}px ${mouseY}px`;
      ring.style.translate = `${ringX}px ${ringY}px`;

      if (ringX !== mouseX || ringY !== mouseY) {
        frame = requestAnimationFrame(tick);
      }
    }

    document.addEventListener("pointermove", event => {

      if (event.pointerType && event.pointerType !== "mouse") return;

      if (!root.classList.contains("cursor-visible")) {
        ringX = event.clientX;
        ringY = event.clientY;
        root.classList.add("cursor-visible");
      }

      mouseX = event.clientX;
      mouseY = event.clientY;

      const target = event.target instanceof Element
        ? event.target
        : null;

      const active = Boolean(target && target.closest(INTERACTIVE));
      const native = Boolean(target && target.closest(TEXT_FIELD));

      ring.classList.toggle("is-active", active && !native);
      dot.classList.toggle("is-active", active && !native);
      root.classList.toggle("cursor-native", native);

      if (!frame) frame = requestAnimationFrame(tick);

    }, { passive: true });

    document.addEventListener("pointerdown", () => {
      ring.classList.add("is-down");
    });

    document.addEventListener("pointerup", () => {
      ring.classList.remove("is-down");
    });

    root.addEventListener("mouseleave", () => {
      root.classList.remove("cursor-visible");
    });

    root.addEventListener("mouseenter", () => {
      root.classList.add("cursor-visible");
    });
  }

  initCursor();


  /* INITIALIZATION */

  render();

  loadCount();

  if (API_URL && CONFIG.features?.liveCounter !== false) {

    window.setInterval(() => {

      if (!document.hidden) {
        loadCount();
      }

    }, POLL_INTERVAL);

  }

})();
