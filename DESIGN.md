# DESIGN — ClutterLess GUI

> Single source of truth for how the GUI looks, moves, and reads.
> If this file and your taste disagree, this file wins. If this file is silent, choose the quieter option.
> Tokens in section 4 are the contract: implement them as CSS custom properties, never hardcode hex values in components.

## 1. Intent

ClutterLess is a **quiet instrument**: a small, precise utility that sits in the background, does one job, and can prove what it did. The GUI should feel like a good system utility (think a well-made file manager sidebar, a terminal multiplexer, a version-control client), not like a SaaS dashboard.

Five principles, in priority order:

1. **Plan before action.** Anything that moves files shows a preview first. The preview is a first-class screen, not a modal afterthought.
2. **Reversible, visibly.** Every completed action shows an Undo affordance in place. The user should never wonder "can I get that back?".
3. **Density over decoration.** Lists, paths, and filenames are the content. Chrome stays out of the way.
4. **One accent, used sparingly.** Color means something (selection, focus, state). If removing a color changes nothing, remove it.
5. **Motion explains.** Animate only to show cause and effect (a file arriving, a row being removed). No ambient decoration. The one exception: a slow status pulse while watching.

Reference feel (for mood, not for copying): Linear's restraint, Raycast's keyboard-first calm, Things' typographic clarity, VS Code's information density. Windows-first, but not Windows-looking-by-accident: opaque surfaces, no Mica or acrylic.

## 2. Anti-slop rules (hard bans)

The most common failure of AI-generated UI is a generic "template" look. These are banned:

| Banned | Do instead |
|---|---|
| Gradients on backgrounds, buttons, text, or borders | Flat fills from tokens |
| Glassmorphism, backdrop blur, frosted panels | Opaque surfaces with 1px borders |
| Glows, neon shadows, colored drop shadows | No shadow on in-flow elements; one soft neutral shadow on popovers/dialogs only |
| Purple/indigo/blue-violet "AI" palette | The cyan accent in section 4, plus neutrals |
| Emoji or sparkle icons as UI | Lucide icons, functional only |
| Cards nested in cards nested in cards | Flat lists separated by 1px rules; panels at most one level deep |
| Same large radius on everything (rounded-2xl everywhere) | Radius scale in section 4; most things are 6px |
| Giant centered icon + headline + subtext empty states | Left-aligned text, one sentence, one action |
| Vanity stats ("98% efficiency", "12.4 GB saved!") and fake charts | Real counts the user can act on (files moved today, last run time) |
| Marketing copy, exclamation marks, "Welcome back!", "Oops!" | Plain, specific, sentence-case copy (section 8) |
| Tailwind default look (`rounded-2xl`, heavy drop shadows everywhere) or arbitrary values (`bg-[#...]`, `p-[...]`) | Tailwind v4 + **shadcn/ui ("New York" style)** with locked `@theme` (all defaults cleared with `initial`) restricted strictly to tokens from section 4; arbitrary values banned by ESLint |
| Pill-shaped everything | Pills only for badges that represent a state |
| Hover lift, scale-on-hover, bouncy springs | Background tint change, 100ms |
| Decorative illustrations, hero banners inside the app | None |
| Truncating paths at the end | Middle-ellipsis so both root and filename stay visible |

If you are about to add something "to make it look nicer" and it is not in this document, don't.

## 3. Platform and window

- Primary target: Windows 10/11 (WebView2). Must also run on Linux and macOS without layout breakage.
- Default window 1080x700, minimum 880x560. Layout must hold at minimum size without horizontal scroll.
- Native window frame in v1. Custom title bar is an optional late polish item, not a requirement.
- Follow the OS theme by default (`prefers-color-scheme`); user can override to Light or Dark in Settings. Both themes are first-class: every screen must be checked in both.
- Respect OS text scaling and `prefers-reduced-motion`.

## 4. Design tokens

Implement in `frontend/src/styles/tokens.css` as CSS custom properties and configure in Tailwind v4 `@theme` (with all default color, radius, shadow, font-size, and spacing utilities cleared via `initial`). Dark theme is the default `:root`; light overrides under `[data-theme="light"]`. Components consume tokens only (either as CSS variables or as utility classes generated from the locked `@theme`). Arbitrary values (`bg-[#...]`, `p-[...]`) are strictly forbidden and enforced by ESLint.

### 4.1 Color

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg-app` | `#0b0d10` | `#f7f8f9` | Window background |
| `--bg-sidebar` | `#0f1215` | `#eff1f3` | Sidebar |
| `--bg-surface` | `#14181c` | `#ffffff` | Panels, table body, inputs |
| `--bg-raised` | `#1a1f25` | `#f3f5f7` | Hover rows, segmented control track |
| `--bg-selected` | `#12262b` | `#e1f3f7` | Selected row/nav item (accent tinted) |
| `--border-subtle` | `#1c2127` | `#e6e9ed` | Row dividers |
| `--border` | `#2a323b` | `#d5dae0` | Inputs, panels |
| `--border-strong` | `#3a4450` | `#b9c1ca` | Hover/focus-adjacent borders |
| `--text-1` | `#e8ecf0` | `#14181d` | Primary text |
| `--text-2` | `#a3adb8` | `#4b5560` | Secondary text |
| `--text-3` | `#6b7682` | `#6b7682` | Hints, disabled, timestamps (large/auxiliary only) |
| `--accent` | `#22d3ee` | `#0e7490` | Focus ring, selected indicator, links, primary button fill |
| `--accent-text` | `#22d3ee` | `#0e7490` | Accent-colored text |
| `--on-accent` | `#04181c` | `#ffffff` | Text on accent fill |
| `--success` | `#3ea66b` | `#1f7a47` | Completed, watching |
| `--warning` | `#d9a441` | `#8a5a00` | Skipped, needs attention |
| `--danger` | `#e5534b` | `#b3261e` | Failed, destructive action |

Rules:
- Text on any background must meet WCAG AA (4.5:1 for body, 3:1 for 18px+ or bold 14px+). `--text-3` is allowed only for non-essential auxiliary text; verify with a contrast checker and adjust the token if it fails.
- Semantic colors never fill large areas. They appear as a 6px dot, a 1px left rule, or colored text.
- Rule-category dots (not backgrounds) use this fixed set, assigned by rule order and cycling: `#5b9bd5`, `#6fb98f`, `#d9a441`, `#c27ba0`, `#8d8fd6`, `#5fb5b0`, `#d1805a`, `#9aa5b1`. Desaturated by design; never use them for text or fills.

### 4.2 Typography

| Role | Font | Size / line-height | Weight |
|---|---|---|---|
| Caption | Inter | 11 / 16 | 500, uppercase only for section labels with `0.06em` tracking |
| Small | Inter | 12 / 16 | 400 |
| Body (default) | Inter | 13 / 20 | 400 |
| Emphasis | Inter | 13 / 20 | 600 |
| Subtitle | Inter | 14 / 20 | 600 |
| Title (page) | Inter | 18 / 24 | 600, `-0.01em` |
| Display (onboarding only) | Inter | 28 / 34 | 600, `-0.02em` |
| Mono (paths, filenames, rule patterns, counts) | JetBrains Mono | 12.5 / 18 | 400, `font-variant-numeric: tabular-nums` |

- Bundle fonts locally (Inter variable, JetBrains Mono variable; both SIL OFL). No CDN. Include their license files in the repo and in `THIRD_PARTY_LICENSES.md`.
- Never use more than two weights on one screen region. Never use font size to create hierarchy where weight or color would do.

### 4.3 Spacing, radius, borders, elevation

- Spacing scale (4px base): `--s-1: 4px`, `--s-2: 8px`, `--s-3: 12px`, `--s-4: 16px`, `--s-6: 24px`, `--s-8: 32px`, `--s-12: 48px`. No other values.
- Radius: `--r-sm: 4px` (badges, kbd), `--r-md: 6px` (buttons, inputs, rows, panels), `--r-lg: 10px` (dialogs, popovers). Nothing larger except circles (dots, switches).
- Borders are 1px. Panels are defined by border, not shadow.
- Elevation exists only for popovers, menus, dialogs, and toasts: `box-shadow: 0 8px 24px rgb(0 0 0 / .35)` in dark, `0 8px 24px rgb(20 24 29 / .12)` in light. Dialog scrim: `rgb(0 0 0 / .5)`, no blur.

### 4.4 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | `100ms` | Hover tint, focus ring |
| `--dur-base` | `160ms` | Row insert/remove, toggles, dropdowns |
| `--dur-slow` | `240ms` | Dialog/sheet enter, page transitions |
| `--ease` | `cubic-bezier(.2, 0, 0, 1)` | All transitions (ease-out feel) |

- Allowed: opacity, `translateY` up to 4px for entering rows, height collapse for removed rows.
- Banned: scale-on-hover, springs/bounce, parallax, shimmer-skeletons for local operations (local reads are instant; show inline "Scanning..." text instead).
- Ambient animation: only the 8px "watching" dot, opacity 1 to 0.4 over 2s, ease-in-out, infinite, and only while the watcher is running.
- `prefers-reduced-motion: reduce`: all durations to 0ms and the pulse becomes static.

### 4.5 Focus and interaction

- Focus ring: `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible` for every interactive element. Never remove it.
- Minimum hit target 28x28px. Default control height: 28px (compact), 32px (primary actions in dialogs).
- Hover is a background tint (`--bg-raised`), never movement. Pressed is one step darker/lighter than hover.
- Disabled: 50% opacity, `cursor: not-allowed`, and a tooltip saying why when the reason is not obvious.

## 5. Layout

```
+--------------------------------------------------------------+
| Window title (native)                                        |
+---------------+----------------------------------------------+
| ClutterLess   |  Page title                       [Actions]  |
|               |  ------------------------------------------  |
|  Overview     |                                              |
|  Activity     |   Content (lists, forms)                     |
|  Rules        |                                              |
|  Folders      |                                              |
|               |                                              |
|  ------------ |                                              |
|  Settings     |                                              |
|  * Watching   |                                              |
+---------------+----------------------------------------------+
```

- Sidebar: 208px fixed, `--bg-sidebar`, 1px right border. Nav items 28px tall, 8px horizontal padding, 16px Lucide icon + label. Selected: `--bg-selected` fill and a 2px `--accent` rule on the left edge.
- Bottom of sidebar: watcher status (dot + "Watching 2 folders" / "Paused") and Settings. This is the only persistent status in the app.
- Content: `padding: 24px 32px`. Page header row: title left, primary actions right, 1px bottom border. Lists span full width; forms and prose max 640px, left-aligned.
- Never center content blocks. Left alignment throughout.

## 6. Components (shadcn/ui "New York" Architecture)

Build these once, in `frontend/src/components/`, and reuse. Use **shadcn/ui ("New York" style)** architecture: Radix UI headless primitives + `class-variance-authority` (CVA) + `cn()` (`clsx` + `tailwind-merge` in `src/lib/utils.ts`), styled strictly via locked `@theme` tokens.

| Component | Spec |
|---|---|
| **Button** | Variants: `primary` (accent fill, `--on-accent` text), `secondary` (surface fill, 1px border), `ghost` (no border until hover), `danger` (secondary with `--danger` text; fills only inside confirm dialogs). 28px tall, 12px horizontal padding, `--r-md`, Emphasis weight. Icon-only buttons are 28x28 with a tooltip. |
| **Input / Select** | 28px tall, `--bg-surface`, 1px `--border`, focus ring as 4.5. Mono variant for paths and regex. Inline error text below in `--danger`, Small size. |
| **Switch** | 28x16 track, 12px thumb, accent when on. Label on the left, switch on the right in settings rows. |
| **Segmented control** | Track `--bg-raised`, selected segment `--bg-surface` with 1px border. Used for theme and filter. |
| **Badge** | `--r-sm`, 11px text, 1px border, transparent fill. State badges (Moved, Skipped, Failed) include a 6px dot of the semantic color. |
| **List / Table row** | 36px tall, 1px `--border-subtle` divider, hover `--bg-raised`, selected `--bg-selected`. Columns use fixed widths or `fr`; header row is Caption style. |
| **FileRow** | `filename` (mono, `--text-1`) then `->` rendered as a 12px Lucide `arrow-right` in `--text-3`, then destination path (mono, `--text-2`, middle-ellipsis), then rule name with its category dot on the right. |
| **Path** | Mono, middle-ellipsis, full path in a tooltip, click copies, secondary action "Show in file manager". |
| **Toast** | Bottom-right, `--bg-surface`, 1px border, popover shadow, 4s (8s if it has an action). Includes inline `Undo` when relevant. Max 3 stacked. |
| **Dialog** | 480px wide (640 for the rule editor), `--r-lg`, scrim as 4.3. Title Subtitle style, actions right-aligned, primary on the right. Destructive confirm names the object ("Remove folder Downloads from watch list?"). |
| **Tooltip** | 400ms delay, Small text, `--bg-raised` with border, no arrow. |
| **Empty state** | Left-aligned: one Subtitle line, one Body line in `--text-2`, one button. No icons larger than 16px, no illustrations. |
| **Kbd** | `--r-sm`, 1px border, mono 11px. Show shortcuts in tooltips and menus. |
| **Status dot** | 8px circle. Watching = `--success` + pulse. Paused = `--text-3`. Error = `--danger`. Never convey state by color alone: always pair with text. |

Icons: Lucide, 16px, stroke 1.5, `currentColor`. An icon must always be adjacent to a label or have a tooltip.

## 7. Screens

All screens are specified in terms of the components above. Wireframes are structural, not pixel-exact.

### 7.1 Overview (default screen)

Purpose: answer "is it working, and what did it just do?" in two seconds.

```
Overview                                    [ Organize now ]  [ Pause ]
---------------------------------------------------------------------
WATCHING   * Watching 2 folders - last file moved 3 min ago
           ~/Downloads        ~/Desktop

RECENT ACTIVITY                                          View all ->
  invoice_april_2026.pdf  ->  Documents/Finance/2026-04   * Invoices   3m
  IMG_2041.heic           ->  Pictures/Sorted/2026        * Images     3m
  setup_v3.2.exe          ->  Downloads/_Installers       * Installers 1h
  ...
NEEDS ATTENTION
  1 file skipped: video.crdownload (still writing)
```

- Top section: current state in one line plus the watched folders as Path components. No large stat tiles.
- "Organize now" opens the Preview sheet (7.3). "Pause/Resume" toggles the watcher.
- Recent activity: last 8 FileRows, live-updating; a new row enters with the 4px translate + fade (`--dur-base`). Relative timestamps in `--text-3` mono.
- "Needs attention" appears only when there is something (skips, failures, config errors). Hidden otherwise.
- Empty state (no activity yet): "Nothing moved yet. New files in your watched folders will appear here." + `Organize now`.

### 7.2 Activity (history)

- Grouped by batch (date header, batch id in mono, count, `Undo batch` button, overflow menu). Expanding a batch reveals its FileRows.
- Per-batch states: `Applied`, `Undone`, `Partially undone`. Undone batches are dimmed (`--text-3`) and the button becomes disabled with tooltip "Already undone".
- Filter row: segmented control (All / Applied / Undone) + search input (matches filename or destination).
- Undo flow: click `Undo batch` -> dialog showing exactly which files go back where (same FileRow list, scrollable) -> confirm -> toast "Restored 5 files. 0 conflicts." with no further undo (undo is itself final, say so in the dialog).

### 7.3 Preview sheet (dry-run)

A right-side sheet (560px) or full-width panel under the page header; choose sheet if it fits at minimum width.

- Header: "Preview" + counts "5 will move - 1 skipped - 2 unmatched".
- Body: FileRows grouped by outcome. Order: Will move, Skipped (with reason), Unmatched (collapsed by default). Each row has a checkbox, default checked; unchecked rows are excluded from the run.
- Footer: `Cancel` (secondary) and `Move 5 files` (primary; label always contains the real count).
- Nothing on disk changes until the primary button is pressed. State this in a one-line Caption under the footer: "Nothing has been moved yet."

### 7.4 Rules

- Ordered list; order is priority ("first match wins" stated once, in a Caption under the title). Drag handle on the left (Lucide `grip-vertical`) plus keyboard reorder (Alt+Up/Down). Row: category dot, name, condition summary in mono (`.jpg .png .webp`), destination pattern in mono `--text-2`, switch to enable/disable, overflow menu (Edit, Duplicate, Delete).
- `New rule` primary button top right. Below the list: "Test a file name" inline tester (7.5).

### 7.5 Rule editor (dialog, 640px)

Fields, top to bottom: Name; Match (extensions as tag input, name glob, name regex, min size, max size, older than; each condition is a labeled row with an add/remove affordance, conditions are ANDed and the UI says so); Destination (mono input with template chips `{year}` `{month}` `{day}` `{ext}` `{name}` that insert on click; live preview of the resolved destination for a sample file).

- Live validation as you type, error text under the field with the same wording as the CLI's validation errors.
- Footer left: `Test against a file...`. Footer right: `Cancel`, `Save rule`.
- A `YAML` toggle at the top right of the dialog shows the rule's raw YAML (read-only in v1).

**Tester (inline on Rules page):** an input for a filename -> shows which rule matches, the resolved destination, and which conditions were evaluated (check/cross per condition). Mirrors `cless rules test`.

### 7.6 Folders

- List of watched folders: Path, recursive switch, file count currently inside (computed on open), overflow (Open, Remove). `Add folder` opens the native folder picker.
- Warn inline (not a dialog) when a rule destination sits inside a recursively watched folder.

### 7.7 Settings

Sections as left-aligned labeled rows separated by 1px rules (not cards): Appearance (theme segmented control), Behavior (stable-after seconds, conflict handling: Rename / Skip, ignore patterns), System (start on login, show notifications, close button hides to tray), Data (open config file, open history file, export config, reset to defaults with confirm), About (version, commit, license AGPL-3.0, links).

### 7.8 First-run onboarding

Three steps in a single centered 520px panel (the only centered layout in the app): 1) Choose folders to watch (defaults from known folders, checkboxes), 2) Choose rule set (Recommended defaults / Start empty), 3) Preview of what would move now -> `Organize` or `Skip for now`. Display type is allowed here. Skippable at every step.

### 7.9 Tray menu

Native menu: status line (disabled), `Open ClutterLess`, `Pause watching` / `Resume watching`, `Organize now`, separator, `Quit`. Tray icon is monochrome (template) with a small dot variant for paused/error. Left-click opens the window.

### 7.10 Error and edge states

- Config invalid on launch: Overview shows a banner row (left 2px `--danger` rule, plain text: what failed, file path, line if known) with `Open config` and `Retry`. The app still opens; watching is disabled until fixed.
- Another watcher already running (CLI `cless watch`): banner "A watcher is already running (cless watch). Close it to control watching from here." with `Retry`.
- Locked/failed file: shown in Activity as a Failed badge with the cause and a `Retry` button.
- Every error message states what happened, which file or setting, and what the user can do next.

## 8. Voice and copy

- Sentence case everywhere. No title case, no exclamation marks, no emoji, no first-person ("we").
- Plain verbs: "Move 5 files", "Undo batch", "Add folder". Not "Let's get organizing!".
- Be specific: "5 files moved to Documents/Finance" not "Success".
- Show real numbers and real paths. Never placeholder text in shipped screens.
- Errors: cause + object + next step. Example: "Couldn't move report.xlsx: it's open in another program. It will be retried in 2 seconds."
- Strings live in a single dictionary (`frontend/src/i18n/en.ts`) from day one so Indonesian can be added without touching components.
- Default language: English. Indonesian (`id.ts`) is a later phase.

## 9. Accessibility

- Full keyboard operation: Tab order follows visual order, Esc closes dialogs/sheets/menus, Enter confirms the primary action, arrow keys in lists, `Ctrl+K` focus search where search exists.
- Global shortcuts (shown in tooltips): `Ctrl+Shift+O` Organize now, `Ctrl+Z` on Activity = undo last batch (with confirm), `Ctrl+,` Settings.
- Screen reader: every icon-only control has `aria-label`; live regions announce toast text and watcher status changes; state badges expose their text.
- Contrast: AA minimum in both themes. Verify tokens with a checker before locking them.
- Do not rely on color alone for state (dot + text, icon + text).

## 10. Visual QA checklist (run at the end of every UI phase)

1. Screenshot every screen touched at 1080x700 and 880x560, in both themes. Save to `docs/screenshots/<phase>/`.
2. Zero horizontal scroll at 880x560. Long paths middle-ellipsize rather than wrap or overflow.
3. Every interactive element reachable by keyboard with a visible focus ring.
4. No color value, font size, spacing, or radius outside the token set (grep for `#` hex and `px` in component CSS).
5. Scan the screenshot against section 2. If any banned pattern appears, fix before declaring done.
6. Empty, loading-in-progress, error, and long-content (60+ char filename, 120+ char path) states exist and look intentional.
7. Reduced motion: toggle the OS setting or emulate it; nothing moves.
