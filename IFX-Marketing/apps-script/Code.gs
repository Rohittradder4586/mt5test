/**
 * ============================================================================
 * IFX MARKETING — Google Sheets Lead Capture (Google Apps Script)
 * ============================================================================
 * WHAT THIS DOES
 *   1. Receives the lead-gate POST from the website (Full Name + WhatsApp).
 *   2. Validates and de-duplicates it server-side.
 *   3. Appends a row to the connected Google Sheet.
 *   4. Returns JSON: {"status":"success", ...} ONLY after the row is written,
 *      so the website can truthfully confirm a successful submission.
 *
 * SETUP (5 minutes)
 *   1. Create a Google Sheet. Name it e.g. "IFX Marketing Leads".
 *   2. Extensions > Apps Script. Delete the placeholder code.
 *   3. Paste this entire file. Save (Ctrl/Cmd + S).
 *   4. Click Deploy > New deployment.
 *        Type ................ Web app
 *        Description ......... IFX lead capture v1
 *        Execute as .......... Me
 *        Who has access ...... Anyone
 *      Click Deploy, authorise the scopes, and copy the Web app URL
 *      (it ends in /exec).
 *   5. Paste that URL into js/config.js -> appsScriptUrl.
 *
 * NOTES
 *   - The website posts Content-Type: text/plain to avoid a CORS preflight.
 *     This script parses both JSON and form-encoded bodies, so either works.
 *   - Rows are written to the sheet this script is bound to (first sheet) or to
 *     a sheet named by SHEET_NAME below.
 *   - Use doGet to verify the deployment in a browser: it returns a status page.
 * ============================================================================
 */

/* ----------------------------- CONFIGURATION ----------------------------- */

/** Sheet tab that receives the leads. Created automatically if missing. */
var SHEET_NAME = 'Leads';

/** Column headers, in this exact order. */
var HEADERS = [
  'Timestamp',
  'Full Name',
  'WhatsApp Number',
  'WhatsApp (digits)',
  'Source',
  'Page URL',
  'User Agent'
];

/** Set to true to log duplicate submissions in the sheet instead of skipping. */
var LOG_DUPLICATES = false;

/** Duplicate window in minutes (same number within this window is skipped). */
var DUPLICATE_WINDOW_MINUTES = 2;

/** Optional: email yourself each new lead. Leave '' to disable. */
var NOTIFY_EMAIL = '';

/** Minimum / maximum digits accepted for a phone number. */
var MIN_PHONE_DIGITS = 7;
var MAX_PHONE_DIGITS = 15;

/* -------------------------------- ROUTES -------------------------------- */

/**
 * GET — health check / deployment verification.
 * Open the /exec URL in a browser to confirm the deployment is live.
 */
function doGet(e) {
  try {
    var sheet = getSheet_();
    return json_({
      status: 'success',
      service: 'IFX Marketing lead capture',
      message: 'Endpoint is live. POST fullName + whatsapp to record a lead.',
      sheet: sheet.getName(),
      rows: Math.max(sheet.getLastRow() - 1, 0),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  }
}

/**
 * POST — record a lead.
 */
function doPost(e) {
  try {
    var data = parseBody_(e);

    var fullName = clean_(data.fullName || data.name || '');
    var whatsapp = clean_(data.whatsapp || data.phone || data.whatsappNumber || '');
    var digits = String(data.whatsappDigits || whatsapp).replace(/\D/g, '');

    /* ---- server-side validation (never trust the client) ---- */
    if (fullName.length < 2) {
      return json_({ status: 'error', message: 'Full name is required.' });
    }
    if (/[<>{}$%]/.test(fullName)) {
      return json_({ status: 'error', message: 'Full name contains invalid characters.' });
    }
    if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
      return json_({ status: 'error', message: 'WhatsApp number is not valid.' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(20000); // serialise writes so concurrent leads never clash

    try {
      var sheet = getSheet_();
      ensureHeaders_(sheet);

      if (!LOG_DUPLICATES && isRecentDuplicate_(sheet, digits)) {
        // Treat as success so the visitor is not blocked, but do not duplicate.
        return json_({
          status: 'success',
          message: 'Already received — thank you.',
          duplicate: true
        });
      }

      var row = [
        new Date(),
        fullName,
        formatPhone_(whatsapp, digits),
        "'" + digits,
        clean_(data.source || 'Website'),
        clean_(data.page || ''),
        clean_(data.userAgent || '')
      ];

      sheet.appendRow(row);
      SpreadsheetApp.flush(); // guarantee the row is committed before replying

      var lastRow = sheet.getLastRow();
      var written = sheet.getRange(lastRow, 2).getValue();

      // If the write did not land, fail loudly instead of confirming.
      if (String(written) !== fullName) {
        return json_({ status: 'error', message: 'Could not write to the sheet.' });
      }

      sendNotification_(fullName, formatPhone_(whatsapp, digits), data);

      return json_({
        status: 'success',
        message: 'Lead saved.',
        row: lastRow,
        timestamp: new Date().toISOString()
      });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({
      status: 'error',
      message: 'Server error: ' + (err && err.message ? err.message : String(err))
    });
  }
}

/* ------------------------------- HELPERS -------------------------------- */

/**
 * Reads a JSON body (text/plain) or a form-encoded body.
 */
function parseBody_(e) {
  if (!e) return {};

  if (e.postData && e.postData.contents) {
    var raw = e.postData.contents;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (ignore) {
      // not JSON — fall through to form decoding
    }
    var out = {};
    raw.split('&').forEach(function (pair) {
      if (!pair) return;
      var idx = pair.indexOf('=');
      var k = idx > -1 ? pair.slice(0, idx) : pair;
      var v = idx > -1 ? pair.slice(idx + 1) : '';
      out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
    });
    return out;
  }

  return (e.parameter || {});
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Script must be bound to a spreadsheet (Extensions > Apps Script).');

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    ensureHeaders_(sheet);
  }
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0a1a33')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 165);
    sheet.setColumnWidth(2, 190);
    sheet.setColumnWidth(3, 170);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(5, 210);
    sheet.setColumnWidth(6, 260);
    sheet.setColumnWidth(7, 260);
    return;
  }

  // Self-heal a header row that was renamed or cleared
  var first = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (!String(first[0]).trim() || !String(first[1]).trim()) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  }
}

function isRecentDuplicate_(sheet, digits) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);
  var rowsToScan = Math.min(40, lastRow - 1);
  var startRow = lastRow - rowsToScan + 1;

  var values = sheet.getRange(startRow, 1, rowsToScan, 4).getValues();

  for (var i = values.length - 1; i >= 0; i--) {
    var stamp = values[i][0];
    var rowDigits = String(values[i][3] || values[i][2] || '').replace(/\D/g, '');
    if (rowDigits !== digits) continue;
    if (stamp instanceof Date && stamp < windowStart) continue;
    return true;
  }
  return false;
}

function formatPhone_(raw, digits) {
  if (raw && raw.charAt(0) === '+') return raw.replace(/\s+/g, ' ');
  return '+' + digits;
}

function sendNotification_(fullName, phone, data) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'New IFX lead: ' + fullName,
      body: [
        'New website lead',
        '-----------------',
        'Name: ' + fullName,
        'WhatsApp: ' + phone,
        'Page: ' + (data.page || ''),
        'Time: ' + new Date().toString()
      ].join('\n')
    });
  } catch (ignore) {
    // Never fail a saved lead because email failed.
  }
}

function clean_(value) {
  return String(value == null ? '' : value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 300);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------- OPTIONAL: one-click self test -------------------- */

/**
 * Run this once from the editor to confirm writing works.
 * Creates the sheet + headers if needed and appends a TEST row.
 */
function testWrite() {
  var sheet = getSheet_();
  ensureHeaders_(sheet);
  sheet.appendRow([
    new Date(),
    'TEST Lead',
    '+10000000000',
    "'10000000000",
    'Script self-test',
    'n/a',
    'n/a'
  ]);
  SpreadsheetApp.flush();
  Logger.log('OK — sheet "%s" now has %s data rows.', sheet.getName(), sheet.getLastRow() - 1);
}
