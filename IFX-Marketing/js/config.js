/* ==========================================================================
   IFX MARKETING — Site configuration
   --------------------------------------------------------------------------
   EDIT THIS FILE ONLY. No other file needs to change for deployment.
   1. Paste your deployed Google Apps Script Web App URL below.
   2. Paste your WhatsApp and Telegram links below.
   Anything left as a PASTE_... placeholder is automatically disabled on the
   page (the UI shows a neutral notice instead of a broken link), so the site
   can never ship with dead links.
   ========================================================================== */

window.IFX_CONFIG = {
  /* ---------------------------------------------------------------------
     1) GOOGLE SHEETS — LEAD CAPTURE ENDPOINT
     ---------------------------------------------------------------------
     Deploy apps-script/Code.gs as a Web App:
       Execute as: Me
       Who has access: Anyone
     Then paste the /exec URL here. It looks like:
       https://script.google.com/macros/s/AKfycb......................../exec
  --------------------------------------------------------------------- */
  appsScriptUrl: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",

  /* ---------------------------------------------------------------------
     2) DIRECT CONTACT LINKS
     ---------------------------------------------------------------------
     WhatsApp (international format, no + and no spaces):
       https://wa.me/971500000000
     Telegram:
       https://t.me/your_username
  --------------------------------------------------------------------- */
  whatsappUrl: "PASTE_YOUR_WHATSAPP_URL_HERE",
  telegramUrl: "PASTE_YOUR_TELEGRAM_URL_HERE",

  /* ---------------------------------------------------------------------
     3) BRAND / CONTENT
  --------------------------------------------------------------------- */
  brand: "IFX Marketing",
  email: "connect.ifx@gmail.com",
  youtubeVideoId: "cQq6iLF66Gc",

  /* Optional: a privacy-policy URL. Leave empty to hide the footer link. */
  privacyUrl: "",

  /* Form behaviour */
  form: {
    // Minimum characters for a name
    minNameLength: 2,
    // WhatsApp digits allowed (international numbers, excluding +, spaces, dashes)
    minPhoneDigits: 7,
    maxPhoneDigits: 15,
    // If the endpoint does not answer within this time, the form shows a retry
    timeoutMs: 15000
  }
};
