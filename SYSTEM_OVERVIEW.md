# Xpotential / RealEstate Easy CRM — System Overview

This document describes the repository as it exists on `main` (latest commit `c4a4a76`, 11 October 2026). It is a read-only record for the product owner. No application code was changed to produce it.

The product is a single-page, browser-only CRM aimed at a Dubai real estate desk. Agents keep lead lists in spreadsheet-style tables, see which follow-ups are due, and optionally push a reminder onto their own Google Calendar. There is no server in this repository. The browser talks directly to Supabase and to Google.

---

## 1. What the app does

An agent opens the site and lands on a branded sign-in screen (“RealEstate Easy CRM”, “Dubai Luxury Real Estate Edition”). They can sign in with Google, or with one shared admin username and password that is compiled into the page. After sign-in they get a navy-and-gold workspace titled **XPOTENTIAL / Real Estate Dubai · CRM**.

From a signed-in user’s point of view the product does the following.

**Today’s Action.** The home tab is a follow-up inbox. It shows four numbers: overdue follow-ups, due today, total open inquiries, and an “Active Pipeline” sum of AED amounts. Each due or overdue lead is a card with the client name, phone, status, notes, and budget. The agent can call (`tel:`), open WhatsApp with a pre-filled message, change the reminder time, push the reminder to Google Calendar, mark the call done, add a one-line note, snooze 1 day / 1 week / 4 months, mark the deal closed, or mark the lead not interested. A badge in the sidebar counts overdue plus due-today items and pulses red when anything is overdue.

**Custom tables.** The working surface is user-defined tables, not a fixed property database. “+ Add Table” (enabled only while a Google session is present) opens a form with a name, an optional description, column designer, status checklist, and three presets: Buyers & Sellers, VIP Investors, and Direct Units Inventory. Every new table is forced to keep First Contacted, Recent Contacted, Status, and Follow-up Date & Time. The agent picks which status labels exist (New, Active, Hot, Follow-up, Interested, Under Negotiation, Closed Won, Closed Lost, Closed, Not Interested, plus any custom label) and which AED column counts as the “lead value” used in the pipeline total.

**Spreadsheet editing.** A table is an inline grid: click a cell to edit, add a blank row, duplicate a row, delete a row, delete every row, or delete the table. Phone columns get a WhatsApp button. The follow-up date column has a time field and shortcuts (Today, +1 day, +3 days, +1 week, +4 months). Those shortcuts add onto the date already in the cell. Columns can be resized; widths are remembered in the browser. Long text (over 100 characters) edits in a textarea. Rows can be filtered by status and searched. The grid stays ordered by when the row was created. The sidebar can collapse so the grid uses the full width.

**Import and export.** “Bulk Import from Excel” accepts `.xlsx`, `.xls`, and `.csv`, or a paste from a spreadsheet. The importer guesses which file column maps to which table column and can download an `.xlsx` template that matches the table. Each custom table can download its own CSV. The header Export menu downloads “Today’s Actions” as CSV.

**Google Calendar.** A button on a lead card or a table row creates a 30-minute event on the signed-in user’s primary Google Calendar. The event title is “Follow-up: {client} - {table}”. Google is asked to pop up 15 minutes and 60 minutes before, and to email one day before. Nothing is sent automatically when a date is typed; the agent has to press the button.

**Demo controls that are still in the product.** The footer has “CEO Test Shortcuts” that insert fake rows (“Active Client Due Today”, “VIP Client (4-Mo Follow-up)”) into a custom table. The sidebar avatar is the fixed initials **ZO**.

What a user will not find, even though earlier screens were built for them:

- No separate screen for off-plan “project leads” or for secondary-market buyers and sellers. Those screens exist in the source and are not mounted.
- No property inventory as its own record type, beyond whatever columns an agent types into a custom table.
- No way to assign a lead to another agent, no shared team inbox, and no roles beyond “whoever is logged in is labeled Admin”.
- No in-app notification center, email, or SMS. Reminders are the on-screen list, a `tel:` link, a WhatsApp link, and an optional Google Calendar event.
- No public website, listing portal, or client-facing page. The only screen before login is the portal sign-in.

---

## 2. Tech stack, dependencies, and hosting

### Stack

| Layer | Choice |
| --- | --- |
| UI | React 19, rendered by Vite 6 from `src/main.tsx` |
| Language | TypeScript 5.8 (`tsc` is the `lint` script; Vite itself does not typecheck) |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite`, Plus Jakarta Sans and Outfit from Google Fonts |
| Icons | `lucide-react` |
| Spreadsheets | SheetJS `xlsx` 0.18.5 |
| Database | Supabase (hosted Postgres) through `@supabase/supabase-js` 2.x, using the anon/publishable key from the browser |
| Calendar / login | Google Identity Services (`https://accounts.google.com/gsi/client`) and the Calendar REST API |
| Routing | None. One HTML page; the visible screen is React state (`activeTab`) |
| Tests, lint config, CI | None in the repo |

`package.json` name is `react-example`, version `0.0.0`, `"private": true`. The product name lives in `metadata.json` and `index.html`: “Xpotential Real Estate CRM”.

### Dependencies that the running app does not import

These are installed because they are listed in `package.json`, and they are not imported by any file under `src/` or by the Vite config:

- `@google/genai` — no Gemini call exists. `metadata.json` still declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, which is a Google AI Studio project marker.
- `express`, `dotenv`, and devDependency `@types/express` — no `server.js`. The `clean` script deletes `dist` and `server.js`.
- `motion` — not imported.
- `tsx`, `esbuild`, and `autoprefixer` — not referenced by scripts. Vite brings its own esbuild. Tailwind 4 is applied by the Vite plugin.

`vite.config.ts` turns Hot Module Replacement off when `DISABLE_HMR=true`. The comment in that file says the switch exists for AI Studio agent edits. Combined with `metadata.json`, the project was scaffolded in Google AI Studio and then built out as this CRM.

### Hosting and backend config that exists

**Vercel (static site).** `vercel.json` contains one rewrite: every path serves `/index.html`. There is no `.vercel` directory, no project id, and no production URL in the repo. A commit on 24 September 2026 (“remove windows-specific oxide binary … for Vercel Linux support”) shows Vercel was the intended Linux build target. Deploying means connecting the Git repo to Vercel as a Vite project (`npm run build`, output directory `dist`) and providing the `VITE_*` variables if the hardcoded defaults should not be used. The hardcoded defaults already point the bundle at a specific Supabase project and Google OAuth client, so a Vercel project can build with an empty env.

**Supabase (database).** There is no Supabase CLI folder and no `config.toml`. Schema is the SQL file `supabase-schema.sql`, meant to be pasted into the Supabase SQL editor. The browser client is created in `src/lib/supabaseClient.ts`. Realtime is enabled in that SQL for all four tables. The app does not use Supabase Auth; the client is created with the anon key only.

**Firebase.** Not used. No `firebase.json`, no Firebase SDK.

**Google Cloud.** OAuth is a client-side token client (GIS), not an authorization-code flow and not a backend. The Calendar API is called from the browser. Setup that has to exist in Google Cloud, outside this repo: an OAuth client of type Web application, the JavaScript origins of whatever domain serves the app (and `http://localhost:3000` for local work), and the Calendar API enabled. The requested scopes are calendar, calendar.events, userinfo.email, and userinfo.profile.

**Google Apps Script.** `google-apps-script/Code.gs` is a second, unused backend: a web app over a Google Sheet plus CalendarApp. Nothing in `src/` fetches it. No deployed script URL is stored in the repo.

---

## 3. Architecture

### Folder structure

```
index.html                 HTML shell, title, fonts, Google Identity script
metadata.json              AI Studio name, description, unused Gemini capability flag
vercel.json                SPA rewrite
vite.config.ts             React + Tailwind plugins, @ alias, DISABLE_HMR
tsconfig.json              No strict mode, noEmit, bundler resolution
package.json               Scripts and dependencies
supabase-schema.sql        Postgres tables, open RLS, realtime publication
google-apps-script/Code.gs Unwired Sheets + Calendar web app
src/main.tsx               React root
src/App.tsx                Login gate and the signed-in shell (sidebar, tabs, demo footer)
src/index.css              Tailwind import and scrollbar styles
src/types.ts               Lead, table, and action-item types
src/context/CrmContext.tsx All CRM state, CRUD, follow-up actions, CSV export
src/lib/supabaseClient.ts  Supabase client and credential resolution
src/services/supabaseDataService.ts  Table CRUD, including the secondary_leads fallback
src/services/googleAuth.ts Google token client
src/services/googleCalendarApi.ts    Calendar event insert
src/utils/calendar.ts      Thin wrapper used by the views
src/utils/spreadsheetParser.ts       CSV/XLSX parse, template download, column guessing
src/utils/tableSorting.ts  Stable “order by created” comparator
src/data/mockData.ts       Date/AED/WhatsApp helpers, unused seed leads, Dubai lists, status colors
src/components/
  LoginPage.tsx            Google and admin sign-in
  HeaderNav.tsx            Search, Google button, import, export, add table, logout
  GoogleAuthButton.tsx     Header Google session chip
  AddTableModal.tsx        Table designer
  CustomTableView.tsx      The spreadsheet that users actually see
  DashboardView.tsx        Today’s Action
  EditableCell.tsx         Click-to-edit cell
  ExcelPasteDrawer.tsx     Import drawer
  ProjectLeadsView.tsx     Built, not mounted
  SecondaryLeadsView.tsx   Built, not mounted
  SupabaseConnectModal.tsx Built, not mounted
```

### Routing

There is no React Router and no URL per screen. `App` either renders `LoginPage` or `CrmProvider` + `CrmMainLayout`. Inside the shell, `activeTab` is `'dashboard'` or a custom table id. The sidebar sets that state. `vercel.json` still rewrites every path to `index.html`, so a host refresh on any path loads the app and then shows the dashboard (tab state is not in the URL and not in `localStorage`).

### Data flow

```
LoginPage
  Google GIS  --> localStorage token + profile, and crm_auth_user
  or admin password check (in the browser) --> crm_auth_user
        |
        v
App sees crm_auth_user and mounts CrmProvider
        |
        v
refreshFromDb()
  project_leads      --> React state (no screen reads it)
  secondary_leads    --> React state (no screen reads it)
  custom_tables      --> filtered to the Google email --> sidebar + grid
  custom_table_rows  --> filtered to the Google email --> grid and action feed
        |
        v
Edits update React state immediately, then call supabase-js.
A Realtime channel ('realtime-crm-leads') refetches a table on any change.
        |
        v
DashboardView derives action cards from custom-table rows only.
Calendar buttons call the Google Calendar REST API with the stored access token.
```

`CrmContext` is the only store. There is no Redux, no React Query, and no router loader. Toasts are a window event named `crm-show-toast`.

Lead rows for the original two tables are still fetched on every load and kept in memory. The dashboard’s action list is computed only from `customTables` and `customRows`.

---

## 4. Data model

There is no `users` table and no `properties` table. Identity is a string in the browser. A “property” is whatever text an agent types into a column (project name, community, unit, and so on).

Postgres tables, all in `public`, all created by `supabase-schema.sql`:

### `project_leads`

Off-plan / developer-project lead. Primary key `id` is client-generated text (`proj-…`), not a database identity.

| Column | Role |
| --- | --- |
| `id` | Text primary key |
| `projectName`, `developer`, `community`, `unitDetails` | Property description |
| `propertyType` | Default `Apartment`. Union in code: Apartment, Townhouse, Villa, Penthouse, Duplex |
| `handoverDetails` | Free text, often a quarter such as `Q4 2026` |
| `visitedDate` | Text date `YYYY-MM-DD` |
| `ownerName`, `contactNo` | Person and phone |
| `callStatus` | Text. Code union: New, Contacted, Hot, Follow-up, Under Negotiation, Closed Won, Closed Lost, Closed, Not Interested. Default in SQL: `New` |
| `followUpDate` | Text `YYYY-MM-DD` |
| `followUpTime` | Text, default `10:00` |
| `notes` | Text |
| `budgetAED` | Numeric, default 0 |
| `createdAt`, `updatedAt` | Timestamptz, default `now()` |

The mounted UI does not edit this table. `ProjectLeadsView.tsx` and the context helpers (`addBlankProjectLead`, `bulkAddProjectLeads`, and the rest) still target it. Seed rows in `INITIAL_PROJECT_LEADS` (`src/data/mockData.ts`) are never loaded; `resetToDemoData` only refetches Supabase.

### `secondary_leads`

Secondary-market buyer or seller. Same id style (`sec-…`).

| Column | Role |
| --- | --- |
| `id` | Text primary key |
| `name`, `mobile`, `property` | Person, phone, property description |
| `clientType` | Default `Buyer`. Also used as a storage tag: `CUSTOM_TABLE` or `CUSTOM_ROW` (see below) |
| `dateContacted` | Text date |
| `budget` | Numeric AED |
| `expectationRequirements` | Text. Also overloaded to hold JSON in the custom-table fallback |
| `remarksStatus` | Text. Code union includes New Lead, Active Follow-up, Hot, Viewing Scheduled, Offer Submitted, Under Negotiation, Closed Won, Closed Lost, Deal Closed, Not Interested, Lost. In the fallback, this column stores the owner email of a custom row |
| `followUpDate`, `followUpTime`, `notes` | Same idea as project leads |
| `createdAt`, `updatedAt` | Timestamptz |

`fetchSecondaryLeadsFromDb` excludes rows whose `clientType` is `CUSTOM_TABLE` or `CUSTOM_ROW`, so fallback records are not shown as normal secondary leads. Nothing in the mounted UI lists the real secondary leads either.

### `custom_tables`

| Column | Role |
| --- | --- |
| `id` | Text primary key, `table_{timestamp}_{random}` |
| `name` | Required |
| `description` | Text |
| `columns` | JSONB array of `{ id, key, name, type, options?, isLeadValue? }` |
| `userEmail` | Lowercased Google email of the creator. This is the only ownership field |
| `createdAt`, `updatedAt` | Timestamptz in SQL. The client often sends a date-only string (`YYYY-MM-DD`) |

Column `type` is one of `text`, `number`, `aed`, `date`, `tel`, `select`. `isLeadValue` marks the single AED column that the dashboard adds into Active Pipeline. `options` is the status list for select columns.

### `custom_table_rows`

| Column | Role |
| --- | --- |
| `id` | Text primary key, `row_…`, `row_dup_…`, or `row_bulk_…` |
| `tableId` | Text. No foreign key to `custom_tables` |
| `data` | JSONB object of column key to value. Follow-up time is stored beside the date as `{dateColumnKey}_time` |
| `userEmail` | Lowercased Google email |
| `createdAt`, `updatedAt` | Timestamptz. Bulk insert staggers `createdAt` by 10 ms so order is stable. Local updates sometimes write `updatedAt` as a date-only string; the database update path writes a full ISO timestamp |

Indexes: `userEmail` on both custom tables, and `tableId` on rows.

### Fallback inside `secondary_leads`

If a write or read against `custom_tables` / `custom_table_rows` returns an error, `supabaseDataService.ts` stores the same payload inside `secondary_leads`:

- A table is a row with `id` `__ctable_{tableId}`, `clientType` `CUSTOM_TABLE`, `property` set to the email, and `notes` set to the JSON payload.
- A row is a row with `id` `__crow_{rowId}`, `clientType` `CUSTOM_ROW`, `property` set to the table id, `remarksStatus` set to the email, and both `notes` and `expectationRequirements` holding JSON.

The SQL in the repo creates the dedicated tables, so a database that has had `supabase-schema.sql` applied uses the dedicated tables. The fallback remains in the client for older projects.

### Row Level Security

RLS is enabled on all four tables. Each policy is named “Public access on …” and is `FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`. With the anon key shipped in the frontend, those policies allow any holder of the key to select, insert, update, and delete every row. Filtering by `userEmail` happens in the browser after the rows are returned (and also as a `.eq('userEmail', email)` filter that a caller can omit).

### Local browser storage

| Key | Purpose |
| --- | --- |
| `crm_auth_user` | Login flag. `localStorage` if “Remember me”, otherwise `sessionStorage`. Any non-empty value skips the login screen |
| `crm_auth_provider` | `google` or `admin` |
| `crm_sidebar_collapsed` | Sidebar open or closed |
| `crm_col_widths_{tableId}` | Column pixel widths |
| `xpotential_google_access_token`, `xpotential_google_token_expiry`, `xpotential_google_user_profile` | Google session |
| `xpotential_supabase_url`, `xpotential_supabase_anon_key` | Optional override of the Supabase target. The UI that writes these (`SupabaseConnectModal`) is not mounted |
| `xpotential_crm_project_leads_v2`, `xpotential_crm_secondary_leads_v2` | Written only when clear helpers run. Never read on load |

The footer text “LocalStorage Synced” does not describe lead storage. Leads are written to Supabase.

### Mock data that never loads

`src/data/mockData.ts` contains eight project leads and seven secondary leads (fictional names, `+971` numbers, Dubai projects such as Burj Crown, DAMAC Lagoons, Palm Jumeirah). It also exports `DUBAI_DEVELOPERS` and `DUBAI_COMMUNITIES`, which only the unmounted `ProjectLeadsView` uses. The live app does not seed these people into the database.

---

## 5. Lead management

### How a lead is captured

In the product that actually renders, a lead is a row in a custom table:

1. The agent creates a table (requires a live Google token and a Google email).
2. They add a blank row, duplicate a row, paste a grid, or upload Excel/CSV.
3. Blank rows prefill every date column with today, every date’s time with `10:00`, and every select with `New` (or the first configured option on import).
4. The row is inserted into React state and then into `custom_table_rows` with `userEmail` set to the Google email. If that insert errors, the fallback writes a `CUSTOM_ROW` into `secondary_leads`.

There is no web form, no email inbox, no portal lead webhook, no Facebook/Google lead ad connection, and no round-robin assignment.

Import (`ExcelPasteDrawer` + `spreadsheetParser`) reads the first worksheet, treats the first row as a header when it looks like one, and fuzzy-matches headers (phone, name, budget, status, date, notes, developer, and similar words). Unmatched extra columns are skipped. Numbers and AED values are parsed by stripping non-numeric characters. The template download builds an `.xlsx` whose headers are the table’s column names.

The unmounted project and secondary screens would have captured leads as blank rows or bulk paste into `project_leads` and `secondary_leads`, with Dubai-specific defaults (developer “Emaar Properties”, community “Downtown Dubai”, handover “Q4 2026”, secondary budget 2,500,000). Those functions are still in `CrmContext` and are not called by `App`.

### Where it is stored

Custom-table rows live in Supabase `custom_table_rows.data` (JSON), scoped in the client by `userEmail`. Project and secondary tables remain in the schema and in the data service. This browser does not keep a lead cache that survives a refresh except by reading Supabase again.

### Status

Status is a string in the row JSON, not a workflow engine.

Default labels: New, Active, Hot, Follow-up, Interested, Under Negotiation, Closed Won, Closed Lost, Closed, Not Interested. The table designer can remove any label except the last one, and can add custom labels. Those labels are stored on the Status column’s `options`.

A second select column (the Buyers & Sellers preset adds “Client Type”) is also given that same status list, because column setup treats every `type: 'select'` as the status column.

Effects that are implemented:

| Action | What happens to a custom-table row |
| --- | --- |
| Mark Done | First matching date column moves forward 3 days. Status becomes `Follow-up`. A note is appended if a notes-like column exists |
| Deal Closed | Status becomes `Closed Won`. A note is appended. The follow-up date is left as-is |
| Not Interested, from the dashboard or from the status dropdown | The row is **deleted**, not archived |
| Snooze on the dashboard | The first matching date column is set to today+1 day, today+7 days, or today+4 months |
| +1d / +3d / +1w / +4m inside the follow-up cell | Added onto that cell’s current date (cumulative), not onto today |

Closed-style statuses (`Closed`, `Closed Won`, `Closed Lost`, `Deal Closed`, `Not Interested`, `Lost`) drop the row out of Today’s Action, out of the “upcoming 7 days” count, and out of Active Pipeline and Total Inquiries. `upcomingCount` is calculated and never shown.

The same helpers, if they were pointed at project or secondary leads, would set project status to `Follow-up` / `Closed` / `Not Interested` and secondary status to `Active Follow-up` / `Deal Closed` / `Not Interested`, and they would **keep** the row. Those branches are not used by the mounted screens. “Closed” versus “Closed Won” versus “Deal Closed” are three different strings for the same idea.

### Which date drives “due”

Action cards, Mark Done, dashboard snooze, and the row-level calendar button all pick a date column with:

`type === 'date'`, or the name contains `"follow"`, or the name contains `"date"`, **whichever column comes first**.

On a default table the first date column is **First Contacted**, then Recent Contacted, then Follow-up Date & Time. Today’s Action therefore keys off First Contacted. A lead whose first contact was any day before today stays in the overdue list until the status is a closed/lost value or the row is deleted. The time edited on the Follow-up column is stored under that column’s own `_time` key. The calendar helper reads `_time` from the first date column, so the time on the follow-up cell is not the time that gets sent to Google from the row action button.

The in-cell calendar icon on the follow-up column calls that same helper. It does not pass the follow-up column’s date.

### Assignment

There is no assignee, no agent directory, and no team. `userEmail` records which Google account created the table or row. The client refuses to create a table when that email is missing, and it only fetches tables and rows for that email. An admin password login (`zuber0902`, which is not an email address) does not satisfy `effectiveEmail`, so that session cannot create or load custom tables until Google is also connected. The header still labels every signed-in user “Admin”.

Isolation is not enforced by the database. The RLS policies above allow the anon key to read and write every user’s rows.

### Follow-up and notifications

What exists:

- **On-screen queue.** Rows whose chosen date is today (`daysDifference === 0`) or earlier, and whose status is not a closed/lost value, become action cards. Overdue cards sort first. The sidebar shows the counts.
- **Manual Google Calendar event.** `createDirectGoogleCalendarEvent` posts to `https://www.googleapis.com/calendar/v3/calendars/primary/events`. Duration 30 minutes. Time zone is the browser’s zone, with the string `Asia/Dubai` only if the browser reports none. Reminders on the event: popup at 15 minutes, popup at 60 minutes, email at 1440 minutes. If the token is missing, the user is prompted through Google. A 401 or 403 triggers one re-prompt. The event id is not written back onto the lead, so a second click creates a second event. Changing the date later does not update or delete the old event.
- **Click-to-contact.** `tel:` and `https://wa.me/{digits}?text=…`. The dashboard message says “this is Xpotential Real Estate following up regarding {property}”. The table-cell message says “Hello, reaching out regarding {table name}”. No WhatsApp Business API.
- **Toasts.** Success and error strings for calendar, import, and validation.

What does not exist:

- No scheduled job, no service worker, no push notification, no email sender, no SMS, no Slack.
- No reminder is created merely by saving a follow-up date.
- The Apps Script file would create a 10:00–10:30 calendar event with a 15-minute popup whenever a sheet upsert included `followUpDate`. The web app never calls that script, and the script hardcodes 10:00 rather than `followUpTime`.

`clearAllData` and `resetToDemoData` are on the context and are not wired to a button. `clearAllData` empties React state and the unused localStorage keys; it does not delete Supabase rows. `clearProjectLeads` (also unwired from the shell) deletes every `project_leads` row by filtering `id != '___non_existent___'`.

---

## 6. Auth, integrations, and environment variables

### Auth and roles

Two independent browser checks, and no server session.

**Admin password.** `LoginPage` compares the typed username and password to constants in the source. A match stores `crm_auth_user`. “Remember me” uses `localStorage`; otherwise `sessionStorage`. “Auto-Fill Admin” fills the form. The username is also printed on the login card. Logout removes `crm_auth_user` and does not revoke the Google token.

**Google.** `signInWithGoogle` uses Google Identity Services `initTokenClient` with `prompt: 'consent'`. The access token and expiry are stored in `localStorage`. Profile (`id`, `name`, `email`, `picture`) comes from `https://www.googleapis.com/oauth2/v3/userinfo`. Scopes include full calendar access (`auth/calendar`), not only “add an event”. Token expiry clears the token and leaves the stored profile in place. The app’s login flag (`crm_auth_user`) is separate and does not expire when the Google token does.

There are no roles, no permissions table, and no Supabase user. The word “Admin” in the header is a fixed label. Setting `localStorage.crm_auth_user` to any string in the browser console opens the shell without the password.

Signing out of the CRM does not sign out of Google. “Disconnect Google Account” in the header chip calls `google.accounts.oauth2.revoke` and clears the token keys.

### External integrations

| System | How it is used |
| --- | --- |
| Supabase Postgres + Realtime | All persisted CRM data. Host is hardcoded; see section 8 |
| Google Identity Services | Sign-in and Calendar consent |
| Google Calendar API v3 | `POST /calendars/primary/events` |
| Google OAuth userinfo | Email used as `userEmail` |
| WhatsApp | `https://wa.me/` links only |
| Google Fonts | Outfit and Plus Jakarta Sans |
| SheetJS | Parse and write xlsx in the browser |
| Google Apps Script | Source only, not called |
| Gemini | Dependency and metadata flag only, not called |

### Environment variables (names only)

| Name | Read by | Required? |
| --- | --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | `src/services/googleAuth.ts` | Optional. If unset, a client id baked into that file is used |
| `VITE_SUPABASE_URL` | `src/lib/supabaseClient.ts` | Optional. If unset, a URL baked into that file is used |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabaseClient.ts` | Optional. If unset, a key baked into that file is used |
| `DISABLE_HMR` | `vite.config.ts` | Dev only. `true` disables Vite HMR and file watching |

Vite only exposes variables whose names start with `VITE_` to the browser. `DISABLE_HMR` is read by the Node config, not by client code. No `.env` file is committed. `.env.example` is committed and is not a template of empty placeholders; it contains values. See section 8. Do not copy those values into tickets, chat, or new files.

---

## 7. Run, build, and deploy

Verified on 16 November 2026 in this environment: Node `v22.23.4`, npm `10.9.9`, Linux.

### Local run

1. Install Node 20 or 22 (the lockfile was installed with Node 22).
2. From the repo root, install exactly the lockfile:

   ```bash
   npm ci
   ```

   This completed here: 234 packages. One deprecation notice (`node-domexception`). No `.env` file is required, because URL, anon key, and Google client id have defaults in source.

3. Start the dev server (script binds `0.0.0.0:3000`):

   ```bash
   npm run dev
   ```

   Vite 6.4.3 reported ready in about 170 ms. `GET http://127.0.0.1:3000/` returned **200** and the HTML shell. `GET /src/main.tsx` and `GET /src/App.tsx` returned **200**. Headless Chrome rendered the login portal: “RealEstate Easy CRM”, “Portal Sign In”, “Sign In with Google”, the admin form, and the visible admin username.

4. Sign-in against the live Supabase project was **not** performed in this review, so the signed-in grid and Today’s Action were not clicked through. Doing so would read and could write the client’s real database.

### Typecheck, build, preview

| Command | Result |
| --- | --- |
| `npm run lint` (`tsc --noEmit`) | **Failed.** `src/components/ExcelPasteDrawer.tsx` lines 297 and 299: `Type 'unknown' cannot be used as an index type` (`rowData[targetColKey]`). Two errors, no others |
| `npm run build` (`vite build`) | **Succeeded** in about 3.2 s. Vite does not run `tsc`. Output: `dist/index.html` (1.07 kB), `dist/assets/index-Bc4WYiv_.css` (60.21 kB, gzip 10.53 kB), `dist/assets/index-Y4mQWvki.js` (1,042.63 kB, gzip 311.60 kB). Vite warned that the JS chunk is over 500 kB |
| `npx vite preview --host 127.0.0.1 --port 4173` | **Served.** `GET /` returned 200. The JS and CSS assets returned 200 |

`npm run preview` is the script form of that preview server (default Vite preview port 4173).

`npm audit` reported 5 advisories (4 high, 1 moderate). The ones that matter for this app are in `xlsx` (prototype pollution and a regular-expression denial of service in SheetJS), because the browser parses uploaded workbooks with that package. `vite` / `launch-editor` findings apply to the dev server. `body-parser` and `qs` come in through `express`, which the app does not run. This review did not attempt to exploit any of them.

### Deploy

There is no deploy script. The path the repo is set up for:

1. Apply `supabase-schema.sql` in the Supabase project’s SQL editor once. Re-running is guarded with `IF NOT EXISTS` and `DROP POLICY IF EXISTS`.
2. In Google Cloud, keep the OAuth client and add the production origin. Enable the Calendar API. Users will see a Google consent screen that asks for calendar access; if the client is in testing mode, only listed test users can consent (that setting is in Google Cloud, not in this repo).
3. Import the repo into Vercel. Framework preset Vite. Build command `npm run build`. Output directory `dist`. The SPA rewrite is already in `vercel.json`.
4. Environment variables are optional because of the hardcoded defaults. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GOOGLE_CLIENT_ID` if those defaults should be replaced, then redeploy. A change of Supabase key without a new frontend build does nothing while the defaults stay in `supabaseClient.ts`.
5. Confirm the production origin is allowed on the Google OAuth client, or “Sign in with Google” fails in the browser and custom tables stay disabled.

The Apps Script file is a separate manual deploy (Extensions → Apps Script → deploy as a web app, “execute as me”, “anyone”). Do not do that for the current web app: the site will not call it, and the script’s own comments tell the deployer to expose it to anyone.

---

## 8. Ownership, authorship, and control

### Git history

| Fact | Value |
| --- | --- |
| Commits | **9** |
| Author | **zp14037** `<yashrshinde03@gmail.com>` on every commit |
| First commit | 24 September 2026 — “Initial commit - Real Estate CRM with Supabase and Google Calendar” |
| Last commit | 11 October 2026 — column resize, text wrap, collapsible sidebar |
| Remote | `github.com/zp14037/RealEstate-Easy-CRM` |
| Other authors | None |

Commit subjects, oldest first:

1. Initial commit - Real Estate CRM with Supabase and Google Calendar
2. fix(deps): remove windows-specific oxide binary from package.json for Vercel Linux support
3. feat: directly connect Supabase project credentials with zero manual connect button
4. feat: add custom tables, bulk import from Excel with file upload, and delete all rows
5. feat: add luxury login portal and ensure Status and Follow-up Date default columns for Google Calendar sync
6. feat: dynamic custom table Excel template download & bulk upload, status options, cumulative date presets, and lead value enforcement
7. feat: compulsory status column with customizable status options on table creation and strict Google ID isolation
8. Fix table row ordering to stay strictly ordered by created on status change
9. Add column resizing, auto text wrapping for >100 chars, and collapsible sidebar for full-width table view

### License

No `LICENSE`, `COPYING`, or `NOTICE` file. `package.json` has no `"license"` field. Nothing in the repo grants the agency a license, and nothing asserts the developer’s retained rights. Copyright text in the login footer is “© 2026 RealEstate Easy CRM · Dubai Real Estate System · Cross-Device Sync Active”.

### Branding and hardcoded names

Two product names are used at once:

- **XPOTENTIAL** / “Xpotential Real Estate CRM” / “Xpotential Real Estate” — app shell, page title, CSV filenames, WhatsApp dashboard message, calendar event footer, SQL comments.
- **RealEstate Easy CRM** — login header, login footer, GitHub repository name.

Other hardcoded identity:

- Login username **`zuber0902`**, shown on the login card, in the username placeholder, in the Auto-Fill control, and as the default `currentUser` in `HeaderNav.tsx`. Sidebar initials are hardcoded **ZO** in `App.tsx` and do not follow the signed-in name.
- Git author **yashrshinde03@gmail.com**, GitHub user **zp14037**. Those do not appear inside the UI. The login identity and the git identity are different people or different accounts; the repo does not say which one is the agency.
- Dubai framing throughout: AED currency, `+971` placeholders, developer and community lists (Emaar, Nakheel, DAMAC, Sobha, Downtown Dubai, Palm Jumeirah, and others), page description “Dubai Real Estate CRM prototype for Xpotential agents”.
- Colors `#0B1B32` and `#D4AF37`.

### Third-party accounts the app is pinned to

These are compiled into the frontend, so the running site depends on whoever still controls them.

| What | Where | Notes |
| --- | --- | --- |
| Supabase project host `hhopbucqowbfsbsvgojx.supabase.co` | `src/lib/supabaseClient.ts` (`DEFAULT_SUPABASE_URL`), `.env.example` (`VITE_SUPABASE_URL`) | All lead data for a default install goes to this project. Pausing or deleting it turns persistence off. The host name is a project id on Supabase, not an agency domain |
| Supabase anon/publishable key | `src/lib/supabaseClient.ts` (`DEFAULT_SUPABASE_KEY`), `.env.example` (`VITE_SUPABASE_ANON_KEY`) | Value intentionally omitted from this document. It is a client key, and the RLS policies make it enough to read and write the whole database |
| Google OAuth web client id | `src/services/googleAuth.ts` (`GOOGLE_CLIENT_ID`), `.env.example` (`VITE_GOOGLE_CLIENT_ID`) | Value intentionally omitted. It identifies a Google Cloud project. Deleting or suspending that OAuth client stops Google sign-in and calendar sync, which also stops creation of custom tables |

No agency-owned domain (a `xpotential…` website) appears in the repo. No Firebase project, no Mapbox/Stripe/Twilio/SendGrid keys, no service-role Supabase key, and no Google OAuth client secret (the flow does not use one).

### Secrets committed (locations only — values are not repeated here)

Treat the following as credentials that are in git history, not as samples.

- `.env.example` — filled-in `VITE_GOOGLE_CLIENT_ID`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. `.gitignore` ignores `.env*` and then un-ignores `.env.example`, so this file is tracked on purpose. The values are live identifiers, not `your-key-here` placeholders.
- `src/lib/supabaseClient.ts` — `DEFAULT_SUPABASE_URL` and `DEFAULT_SUPABASE_KEY`.
- `src/services/googleAuth.ts` — fallback `GOOGLE_CLIENT_ID`.
- `src/components/LoginPage.tsx` — admin password, in the submit check (`handleSubmit`), in `handleFillDemo`, and therefore in the built JavaScript bundle. The username beside it is also shown in the UI; the password is not shown in the UI and is not printed in this document.

Anyone who can read the repository or the deployed JS can recover these. Rotating them requires a code change and a redeploy, because the defaults override an empty env.

### Kill switch, licensing, and access control

There is **no kill switch, license check, expiry date, phone-home, or remote feature flag** in the source. The app does not call the developer’s server. If the developer still owns the Supabase organization and the Google Cloud project, those consoles are the practical controls:

- Revoking or rotating the Supabase key, or pausing the project, stops the current build from reading and writing leads (the key is inside the JS).
- Disabling the Google OAuth client stops calendar sync and, with it, the “+ Add Table” button.
- Neither control is a license manager. A copy of the frontend pointed at a different Supabase project and a different OAuth client (via the `VITE_*` variables, or via the unused localStorage override for Supabase) runs without asking the original developer.

Access control inside the product is the login screen plus client-side email filters. It is not an authorization system. The database policies grant the anon role full access.

---

## 9. Completeness, gaps, and risks

### Finished enough to use, for one Google-signed-in agent

- Login screen (verified rendering in a browser).
- Custom tables with required status and date columns, presets, and per-table status labels.
- Inline grid: edit, add, duplicate, delete, delete-all, resize, wrap long text, search, status filter, created-order sort, CSV export.
- Excel/CSV import and template download (the UI is built; `tsc` reports two errors in the import mapping, and Vite still bundles it).
- Today’s Action counts, call and WhatsApp links, snooze, mark done, deal closed.
- Manual Google Calendar insert with reminder overrides.
- Supabase read/write and a Realtime refetch.
- Production build and static preview.

### Partial or leftover

- **Project leads and secondary leads** are a full data layer and two large views (`ProjectLeadsView.tsx` about 710 lines, `SecondaryLeadsView.tsx` about 630 lines) that `App.tsx` never imports. The dashboard ignores those tables. Agents cannot open them.
- **`SupabaseConnectModal`** is never imported. The “zero manual connect” commit hardcoded the project instead. Users cannot point the UI at another database without editing code or `localStorage`.
- **`INITIAL_PROJECT_LEADS` / `INITIAL_SECONDARY_LEADS`** are unused. `clearAllData`, `resetToDemoData`, and `upcomingCount` are unused by any view. Header export only calls `exportToCsv('actions')`; the project and secondary CSV branches are unreachable from the shell.
- **Apps Script** is a parallel design (Sheets as the database, calendar on every save) that the React app replaced and did not delete.
- **Gemini, Express, dotenv, motion** are unused dependencies from the AI Studio starter. `metadata.json` still advertises a server-side Gemini capability the app does not have.
- **Demo footer** (“CEO Test Shortcuts”) inserts fictional leads into real tables.
- **Copy** disagrees with behavior: “LocalStorage Synced”, “strict Google ID isolation”, “Supabase Synced” on the login card (the card is not checking the database), and the login brand versus the in-app XPOTENTIAL brand.
- **No tests, no CI workflow, no README, no ESLint config.** `npm run lint` fails, and `npm run build` still succeeds.

### Notable bugs

1. **Follow-ups attach to the wrong date.** The first date column on a default table is First Contacted. Today’s Action, Mark Done, dashboard snooze, and the calendar helper all use that column. Leads whose first-contact date is in the past stay overdue even when Follow-up Date & Time is in the future. The time saved on the follow-up cell is not the time the row-level calendar button sends.
2. **“Not Interested” deletes the custom-table row.** There is no archive. The same action on the unused project/secondary paths would only change status.
3. **Every select column receives the status option list**, including a “Client Type” column from the Buyers & Sellers preset. Buyer/Seller is not in that list.
4. **Calendar events are insert-only.** Repeat clicks duplicate events. Reschedule does not move the existing event. The event id is discarded.
5. **`updatedAt` / `createdAt` are sometimes date-only strings** from the client (`getTodayDateString()`), sometimes full ISO timestamps. Sorting papered over this for row ids that contain a millisecond timestamp; rows whose ids do not match that pattern depend on `createdAt`.
6. **Lost updates.** A cell save reads the current JSON and writes the merged object back. Two overlapping edits can drop one of the fields. Realtime then refetches and can replace in-progress local edits.
7. **Import date formats.** Dashboard math only understands `YYYY-MM-DD`. Spreadsheet dates that arrive as `DD/MM/YYYY` or locale strings will not count as due.
8. **Typecheck errors** in `ExcelPasteDrawer.tsx` (lines 297 and 299) mean `npm run lint` is red. The production bundle still includes that file.
9. **Admin login cannot see tables** until Google is connected, because table queries require an email. The UI does not explain that beyond a toast when they press “+ Add Table”.
10. **Realtime dependency.** The custom-table effect refetches rows using the `customTables` array in the closure. A burst of events can refetch with a stale table list.

### Security issues

1. **Open RLS plus a published anon key.** Policies are `USING (true)` for `anon`. The key and the project URL are in the JS. Anyone can read, change, or delete all leads, including other agents’ custom tables, without logging in. Client-side `userEmail` checks do not stop a direct call to the Supabase REST API.
2. **Admin password in the source and in the built bundle**, with a button that fills it in. One shared password, no hashing, no lockout, no second factor. The login gate is also bypassed by writing `crm_auth_user` in `localStorage`.
3. **Google access token in `localStorage`**, with the broad `auth/calendar` scope (read and write the user’s entire calendar, not only create events). Any script that runs on the origin can read it.
4. **No server-side authorization at all.** Supabase Auth is never called.
5. **`xlsx` 0.18.5** is what parses untrusted uploads, and `npm audit` rates it high for prototype pollution and ReDoS.
6. **Apps Script comments** tell a deployer to publish the web app as accessible to “Anyone”, which would be an unauthenticated read/write API for the sheet and a way to create calendar events. No URL for such a deployment is in the repo; treat the file as a footgun if someone follows the header comment.
7. **Mass delete** in `clearProjectLeads` removes every project lead and is only unused because that view is unmounted. It is still shipped in the bundle.

---

## Appendix: status vocabulary

**Custom tables (what users see):** New, Active, Hot, Follow-up, Interested, Under Negotiation, Closed Won, Closed Lost, Closed, Not Interested, plus custom labels. Not Interested removes the row.

**Project leads (stored, no screen):** New, Contacted, Hot, Follow-up, Under Negotiation, Closed Won, Closed Lost, Closed, Not Interested.

**Secondary leads (stored, no screen):** New Lead, Active Follow-up, Hot, Viewing Scheduled, Offer Submitted, Under Negotiation, Closed Won, Closed Lost, Deal Closed, Not Interested, Lost.

**Pipeline and action feed exclude:** Closed, Closed Won, Closed Lost, Deal Closed, Not Interested, Lost.
