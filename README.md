<div align="center">
  <img src="./lexicon-logo.svg" width="104" height="104" alt="Lexicon official blue-and-coral L logo">
  <h1>Lexicon</h1>
  <p><strong>Your learning space.</strong></p>
  <p>Vocabulary, grammar, practice, and the everyday habits that make learning stick.</p>
  <p><a href="https://shehabb0.github.io/lexicon-dashboard/">Open Lexicon</a></p>
</div>

---

## What Lexicon does

Lexicon is a personal learning dashboard connected to **Notion**. The dashboard and its two workspaces are separate:

**Vocabulary workspace**

- Study words and phrases using a real Notion vocabulary data source.
- Work through your **review queue**, with continuous sessions and next-card progression after successful Notion saves.
- Practice **conjugation**, test translations, and explore grammar lessons stored in Notion.
- Mark a word **Reviewed**, **Forgot**, or **Mastered**.
- See vocabulary analytics, review activity, and a study streak using **Lexicon Review History**, when enabled.

**Monthly Tracker workspace**

- Browse monthly pages from a parent tracker page in Notion (for example, *Italian Tracker*).
- View and update **Month Priorities** and the daily habit checklist.
- Add habits, goals, and entries under **Film**, **Romanzi**, and **Parlare**.
- Newly created months can be discovered with **Refresh Tracker**.

**Important:** Create new months using your **original Notion template/button** to preserve custom colors, page formatting, and uploaded icons. Lexicon deliberately does **not** create or duplicate monthly pages.

## Get started

1. Open **[Lexicon](https://shehabb0.github.io/lexicon-dashboard/)**.
2. Create or choose a Notion internal integration that has access to your vocabulary data source.
3. In Lexicon's **Connect** dialog, enter its **Notion integration token** and your vocabulary **data source ID**.
4. Optionally enable **Lexicon Review History** to retain activity and streak records in Notion.
5. To connect a monthly tracker, open **Monthly Tracker** in the sidebar, share the parent tracker page and relevant monthly databases with the same integration, and paste its Notion page link.

Lexicon communicates directly with the Notion API from your browser, using Notion API version `2026-03-11`.

## Privacy and security

Lexicon is a **static, browser-based app**, not an authentication service or a hosted backend. The Notion token is entered in your browser and is sent directly to Notion. If you choose **Remember connection**, the token is stored in **browser local storage** on that device; otherwise it is used in the current session. Do not connect a broad-access integration on a shared or untrusted computer. Give the Notion integration access only to the pages and databases Lexicon needs.

Never paste a Notion secret into public GitHub files, GitHub issues, screenshots, or documentation.

## Brand identity

![Lexicon official logo](./lexicon-logo.svg)

The official Lexicon mark is a **rounded blue L with a coral circle on a soft white square**. It is used in the dashboard's sidebar, top-right emblem, browser tab, and web-app icon. The source file is [`lexicon-logo.svg`](./lexicon-logo.svg); colors and usage are defined in [`BRAND.md`](./BRAND.md).

**Colors:** Blue `#3B82F6` · Deep Blue `#2258C7` · Coral `#FF7A59` · Light Coral `#FFA88E` · Off White `#F8FAFC`.

---

*Lexicon — learn beautifully.*
