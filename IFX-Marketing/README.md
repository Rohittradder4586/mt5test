# IFX Marketing — MT5 Technology & Brokerage Infrastructure

Production-ready, mobile-first lead generation website for **IFX Marketing**.
Static HTML5 / CSS3 / vanilla JavaScript front end + Google Apps Script → Google Sheets lead capture.

---

## 1. Project structure

```
IFX-Marketing/
├── index.html            ← the whole site (all sections, gate modal, markup)
├── css/
│   └── style.css         ← all styling (design tokens, responsive, animations)
├── js/
│   ├── config.js         ← ★ EDIT THIS: WhatsApp, Telegram, Apps Script URL
│   └── main.js           ← navigation, reveal, counters, FAQ, video lead gate
├── apps-script/
│   └── Code.gs           ← Google Sheets backend (paste into Apps Script)
├── robots.txt
├── sitemap.xml
└── README.md
```

`index.html` is the single entry point. It links `css/style.css`, `js/config.js`
and `js/main.js` with relative paths — no build step, no frameworks, no CDN
dependency for functionality (web fonts degrade gracefully to system fonts).

---

## 2. Open it locally

Double-click `index.html`, or serve it (recommended, so `fetch` behaves exactly
as in production):

```bash
# from inside the IFX-Marketing folder
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## 3. Connect Google Sheets (required for the video gate)

The video **cannot** play until a submission is confirmed by the backend.

### 3.1  Create the backend
1. Go to <https://sheets.google.com> → **Blank spreadsheet** → name it e.g. `IFX Marketing Leads`.
2. **Extensions → Apps Script**.
3. Delete the placeholder code, paste the full contents of `apps-script/Code.gs`.
4. **Save** (Ctrl/Cmd + S).
5. **Deploy → New deployment**
   - Type: **Web app**
   - Description: `IFX lead capture v1`
   - **Execute as: Me**
   - **Who has access: Anyone**
6. **Deploy** → authorise the permissions → copy the **Web app URL** (ends in `/exec`).

### 3.2  Verify the endpoint
Paste the `/exec` URL into a browser. You should see JSON like:

```json
{"status":"success","service":"IFX Marketing lead capture","sheet":"Leads","rows":0}
```

### 3.3  Point the website at it
Open `js/config.js` and replace the placeholder:

```js
appsScriptUrl: "https://script.google.com/macros/s/AKfycb....../exec",
```

### 3.4  Test end to end
1. Reload the site, click the video thumbnail.
2. Enter a name and a WhatsApp number → **Watch the video**.
3. The sheet gains a row (Timestamp, Full Name, WhatsApp Number, digits, Source, Page URL, User Agent) **before** the success screen appears.
4. After ~1.3 s the popup closes and the YouTube video `cQq6iLF66Gc` starts in the same video section.
5. If the endpoint is not configured, or the request fails/times out, an inline error appears, the form stays open with your values intact and you can retry. **The video stays locked.**

> The row is written with `SpreadsheetApp.flush()` and re-read before the script
> replies, so `{"status":"success"}` is only returned when the data really landed.

---

## 4. WhatsApp, Telegram and email

In `js/config.js`:

```js
whatsappUrl: "https://wa.me/971500000000",   // international, no + or spaces
telegramUrl: "https://t.me/your_username",
```

Behaviour if left as `PASTE_...`:
- The link is **not** emitted as a broken URL — clicking shows a neutral toast explaining it is not configured yet and shows the email address.
- Nothing ships with a dead link.

Email `connect.ifx@gmail.com` is hard-wired in `index.html` and mirrored from
config at runtime (all `[data-email]` elements).

---

## 5. Video configuration

`js/config.js` → `youtubeVideoId: "cQq6iLF66Gc"`.

- Thumbnail: `https://i.ytimg.com/vi/cQq6iLF66Gc/maxresdefault.jpg` (inline SVG fallback if unavailable).
- Player: `youtube-nocookie.com/embed/...?autoplay=1&rel=0&modestbranding=1&playsinline=1`
- The `<iframe>` is **created by JavaScript only after** a verified success response. Before that, no player exists in the DOM, so the video cannot be watched or scraped by loading the page.

⚠️ Autoplay policy: most browsers allow unmuted autoplay here because the visitor
just clicked **Submit**. If a browser blocks it, YouTube shows its own play button —
the video is already loaded and one click starts it.

---

## 6. Customising content

| What | Where |
|------|-------|
| Services, copy, FAQ | `index.html` (plain semantic markup) |
| Colours, spacing, radii | `css/style.css` → `:root` design tokens |
| Fonts | `index.html` `<head>` + `--font-display` / `--font-body` |
| Email address | `js/config.js` → `email`, and `mailto:` links in `index.html` |
| Validation limits | `js/config.js` → `form.*` |
| Domain in SEO tags | `index.html` (`canonical`, Open Graph) + `sitemap.xml` + `robots.txt` |

---

## 7. Deployment

Any static host works — no server-side runtime required.

- **Netlify**: drag the `IFX-Marketing` folder onto app.netlify.com
- **Vercel**: `vercel --prod` in the folder
- **GitHub Pages**: push, then Settings → Pages → branch `main` / root
- **cPanel / shared hosting**: upload the folder contents to `public_html`
- **Cloudflare Pages**: connect the repo, build command none, output `/`

Then:
1. Replace `https://www.ifxmarketing.com/` in `index.html`, `sitemap.xml`, `robots.txt` with your real domain.
2. Serve over **HTTPS** (required for clipboard, and expected for a fintech brand).
3. Submit `sitemap.xml` in Google Search Console.

---

## 8. Accessibility & performance notes

- Skip link, landmark regions, single `h1`, ordered headings.
- Gate modal: `role="dialog"`, `aria-modal="true"`, labelled + described, focus moved to the first field, **focus trap**, `Esc` closes, focus restored on close, body scroll locked.
- Form: real `<label>`s, `aria-required`, `aria-describedby` error links, `role="alert"` errors, `aria-live` success state, `aria-busy` while submitting.
- Respects `prefers-reduced-motion` (reveals, counters, chart draw).
- Zero JS libraries; CSS + JS are the only assets. Images: one lazy YouTube thumbnail; all other visuals are inline SVG (no HTTP requests).
- Print stylesheet included.

---

## 9. Security

- No API keys or secrets in the front end — the Apps Script URL is the only endpoint, and it can only append a validated row.
- The script validates server-side (`name >= 2 chars`, `7–15` digits), sanitises control characters, caps field length at 300, and serialises writes with `LockService` so concurrent leads never collide.
- Duplicate submissions from the same number inside a 2-minute window are ignored.
- Optional email alert: set `NOTIFY_EMAIL` in `Code.gs`.
- Prepared for consent text under the form — replace with your reviewed wording if you operate in a regulated jurisdiction.

---

## 10. Browser support

Chrome / Edge / Firefox / Safari (current + previous), iOS Safari 15+, Android Chrome.
Uses `IntersectionObserver`, `fetch`, `URLSearchParams`, CSS Grid — all with graceful degradation.

---

© IFX Marketing · MT5 technology & brokerage infrastructure · connect.ifx@gmail.com
