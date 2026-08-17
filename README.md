# Meridian

Meridian is Soham's local-first learning path: one useful action, an honest
proof, and a record that stays on this device. It combines the source
curriculum, guided sessions, daily rhythm, weekly review, journal, portfolio,
library, and safety net in a calmer evidence-driven workflow.

## Run it on Windows

The simplest option is to double-click `start.cmd`. It installs dependencies
if needed, starts Meridian, and opens the app in your browser.

To run it manually:

1. Install the current Node.js LTS from [nodejs.org](https://nodejs.org/).
2. Open **Command Prompt** in the Meridian folder.
3. Install dependencies:

   ```bat
   npm install
   ```

4. Start the development app:

   ```bat
   npm run dev
   ```

5. Open <http://localhost:3000>.

Stop the development server with `Ctrl+C`.

## Production build

From Command Prompt in the Meridian folder:

```bat
npm install
npm run build
npm start
```

Then open <http://localhost:3000>.

## Your data and backups

Meridian has no account or server. Progress is stored by your browser on this
device under the local-storage key `meridian.v1`. Use **Settings → Portable
state → Export JSON** regularly to save a complete backup somewhere safe.

To restore a Meridian backup, use **Settings → Import JSON** and choose the
backup file. The import validates the file and reports what was matched and
skipped.

You can also import backups from the two older apps:

- In Operations Cockpit, use its **Backup** button to export the
  `future.cockpit.v1` backup, then import that JSON in Meridian.
- In Northstar / Guided Learning, use its backup/export function, then import
  that JSON in Meridian.

Legacy imports are best effort. Meridian maps only fields and registered
identifiers that correspond; it does not guess unknown data.

## Keyboard shortcuts

- `Ctrl+K` on Windows or `Cmd+K` on macOS: open the command palette
- `Up` / `Down`: move through palette results
- `Enter`: open the selected result
- `Escape`: close the palette

The same shortcuts are listed in **Settings**.

## Offline and privacy

Meridian is local-only: there are no accounts, no application server, and no
runtime network calls. Curriculum data and both fonts are bundled in this
folder. Inter, JetBrains Mono, and all application assets load locally, so the
app continues to work without an internet connection after dependencies have
been installed.

The only network access involved in setup is `npm install`, which downloads
packages from npm. Running Meridian itself does not make outbound requests.
