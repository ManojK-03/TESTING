
/* =========================================
   LEARN FORGE — SITE CONFIGURATION
========================================= */

window.SITE_CONFIG = {
  // Initial value only. Once the backend responds, its capacity
  // (CONFIG.CAPACITY in code.gs) is used everywhere on the page.
  capacity: 40,

  // Paste your deployed Google Apps Script URL.
  apiUrl: "",

  // Used only when the backend is unavailable.
  manualRegistered: null,

  contactEmail: "abc@gmail.com",

  links: {
    form: "https://forms.gle/REPLACE-WITH-YOUR-FORM-ID",

    community:
      "https://chat.whatsapp.com/REPLACE-WITH-YOUR-INVITE",

    linkedin:
      "https://www.linkedin.com/company/REPLACE-WITH-YOUR-PAGE",

    github:
      "https://github.com/REPLACE-WITH-YOUR-ORG",

    microsoft:
      "https://learn.microsoft.com/en-us/training/",

    gsoc:
      "https://summerofcode.withgoogle.com/"
  },

  features: {
    liveCounter: true,
    registration: true,
    // false = turn off all page animations.
    animations: true
  }
};
