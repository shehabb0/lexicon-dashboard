# Lexicon × Notion — setup guide

This is the **live-synced** version of the Lexicon prototype. It reads your existing Notion vocabulary database, displays real statistics and a review queue, and writes these three actions back to Notion:

- **Mark Reviewed**: increment `Approved Reviews` (maximum 9); set `Last Reviewed` to now.
- **Forgot It**: set `Approved Reviews` to 0; set `Last Reviewed` to now.
- **Mastered!**: set `Difficulty` to `Learned`.

Your existing Notion **Class**, **Add how many Days?**, and **Next Review** formulas handle the schedule; the dashboard does not replace or alter them.

## Step 1 — Make a scoped Notion connection

1. Open Notion → **Settings** → **Developer Mode** and turn it on. Open the developer tools (**Connections / Internal connections**). Alternatively visit https://developers.notion.com/.
2. Create a new **internal connection** named `Lexicon`. Set capabilities **Read content** and **Update content**. No extra user-information permissions are needed.
3. In the connection's **Content access** tab, grant access to **only your vocabulary database**. Alternatively go to the database's original page → `•••` → `Connections` → `+ Add connection` → `Lexicon`.
4. On that database, copy the **data source ID** using the Notion Developer Mode developer bar or right-click → `Developer` → Copy data source ID. This is **not** your dashboard page ID and is not necessarily the database ID.
5. Copy the connection's **internal API token** from its Configuration tab. Keep it private—do not put it in Notion, an HTML file, a public Git repository, or a chat message.

Official docs: https://developers.notion.com/guides/get-started/internal-connections and https://www.notion.com/help/turn-on-developer-mode-to-use-developer-tools-in-notion

## Step 2 — Run the secure server (local option)

You need **Node.js 20 or later** installed on your computer.

On Windows PowerShell, open a terminal inside this extracted folder and run:

```powershell
$env:NOTION_TOKEN="YOUR_PRIVATE_NOTION_TOKEN"
$env:NOTION_DATA_SOURCE_ID="YOUR_DATA_SOURCE_ID"
$env:DASHBOARD_PASSWORD="A_LONG_UNIQUE_PASSWORD_YOU_CHOOSE"
npm start
```

Open **http://localhost:3000** in Chrome and enter the dashboard password. Do not share the token; these placeholders must be replaced locally.

**Important:** A local server only runs while your computer and terminal remain open. For a dashboard embedded in Notion and available anywhere, use the hosted option below.

## Step 3 — Host the dashboard (recommended for embedding)

1. Create a **private GitHub repository** containing `index.html`, `server.js` and `package.json` (you may upload `README.md` too). Never upload a real `.env` file or Notion token.
2. On a Node-capable HTTPS hosting service (for example, Render), create a **web service** from that repository. Use `npm start` as the start command; build step can be empty.
3. In the service's **Environment Variables / Secrets** configuration, set exactly:
   - `NOTION_TOKEN` = the private Lexicon integration token.
   - `NOTION_DATA_SOURCE_ID` = the vocabulary **data source ID**.
   - `DASHBOARD_PASSWORD` = a long unique password for the dashboard.
4. Deploy. Open the HTTPS address and enter your dashboard password. If you get a Notion 403/404 error, recheck both the data source ID and the connection's Content access.
5. In your Notion dashboard page, type `/embed` and paste the hosted dashboard's HTTPS URL. Resize the embed to fit the page. If Notion or your browser prevents the embedded login, open the dashboard in a separate browser tab instead.

Some hosting services have usage limits or charges; check the current plan before deploying.

## What sync means

- Opening the hosted page fetches **live vocabulary rows** from Notion.
- It **refreshes every 60 seconds** while the page is visible, and you can click `Refresh Notion` any time.
- Clicking a review button in Lexicon **updates your actual Notion row** and reloads the data.
- Clicking your existing **Notion** buttons still works; Lexicon will pick up the new state when it refreshes.
- This does **not** include a historical activity/streak chart because your current word database stores only the latest review date. A separate review-log database would be needed for accurate historical activity.

### Expected Notion properties

Required: `Difficulty` (Select with an option named `Learned`), `Approved Reviews` (Number), `Last Reviewed` (Date), `Class` (Formula), and `Next Review` (Formula), plus the vocabulary title property. The `Write Translation`/`Translation` text property and `Language` are optional but useful.

The data source must be accessible to the internal connection. The dashboard password is different from the Notion integration token. Keep both private, but only the dashboard password is entered into the browser.

### Security note

Anyone who knows the hosted dashboard URL **and** its password could read your vocabulary and click the review buttons. Use HTTPS, a strong unique password, and a private database-scoped integration token. Don't publish your Notion token in an HTML block, client-side code, browser configuration, screenshots, or public repositories. The dashboard password is retained only in the browser tab's session storage for convenience.

### Troubleshooting

- **401 Incorrect dashboard password:** The browser password must match `DASHBOARD_PASSWORD` on the host.
- **401 from Notion:** `NOTION_TOKEN` invalid or expired; recreate the token in the Notion developer portal.
- **403 or 404 from Notion:** Check Content access to the exact database, and ensure you're using the **data source ID** (not the page ID).
- **No words:** Check the data source ID and the title property. Notion API pagination is supported.
- **Missing translations:** Rename your text column to `Write Translation` or `Translation`, or update `mapPage` in `server.js` to match your actual property name.
- **Date after marking reviewed looks wrong:** Check the Notion formulas for `Class`, `Add how many Days?` and `Next Review` first; Lexicon only updates `Approved Reviews` and `Last Reviewed`.
- **Embedded dashboard blank:** Try the direct HTTPS link; embedding can be blocked by third-party browser policies or workspace settings.

_Notion API version used by this package: `2026-03-11`._
