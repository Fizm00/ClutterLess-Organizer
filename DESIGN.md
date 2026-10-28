# DESIGN — ClutterLess GUI

> Single source of truth for how the GUI looks, moves, and reads.
> If this file and your taste disagree, this file wins. If this file is silent, choose the quieter option.
> Tokens in section 4 are the contract: implement them as official shadcn/ui CSS custom properties in `src/index.css`, never hardcode hex values or Tailwind palette utilities in components.

## 1. Intent

ClutterLess is a **quiet instrument**: a small, precise utility that sits in the background, does one job, and can prove what it did. The GUI should feel like a calm, dense, neutral system utility built on official **shadcn/ui** (`ui.shadcn.com/examples`: dashboard and tasks) — not like a flashy SaaS marketing dashboard.

Five principles, in priority order:

1. **Plan before action.** Anything that moves files shows a preview first. The preview is a first-class screen, not a modal afterthought.
2. **Reversible, visibly.** Every completed action shows an Undo affordance in place. The user should never wonder "can I get that back?".
3. **Density over decoration.** Lists, tables, paths, and filenames are the content. Chrome stays out of the way.
4. **Neutral palette, semantic color only.** Primary actions use neutral contrast (`bg-primary text-primary-foreground`: light fill in dark mode, dark fill in light mode). Non-neutral color is reserved strictly for semantic states (watching, warning, error) and the single brand mark in the sidebar header.
5. **Motion explains.** Animate only to show cause and effect. No ambient decoration except a slow status pulse on the watching dot.

## 2. Anti-slop rules (hard bans)

The most common failure of AI-generated UI is decorative clutter ("AI slop"). All of the following are strictly banned and enforced by `npm run lint:style` and ESLint:

| Banned | Do instead |
|---|---|
| Stat / KPI summary cards (Watcher Status card, Watched Folders card, Recent Activity count card, Detected Files card, Subfolder Mode card) | One flat status line at the top of Overview; tables and lists carry the data directly |
| Nested bordered containers (cards inside cards, per-row bordered cards in Rules/Activity/Folders, boxed filter toolbars) | **At most 1 level of bordered container (`rounded-lg border`) per screen section**, with rows separated by `divide-y` or `Table` borders |
| Icons inside colored square badges (cyan, blue, purple, green, amber boxes) | Plain `size-4 text-muted-foreground` Lucide icons only where functional |
| Rule category colors/dots or `#1..#5` priority number badges | Priority is communicated by top-to-bottom list order alone; zero category colors |
| Decorative badges (`v1.0`, `LIVE`, `5 active / 5 total`, `1 pending`, `Watching` badge inside a Watching section) | Plain `text-sm text-muted-foreground` text; `Badge` (`variant="outline"` or `"secondary"`) only for batch/file state (`Applied`, `Undone`, `Skipped`, `Failed`) |
| `uppercase` and wide letter-spacing (`tracking-wider`, `tracking-widest`, `tracking-[...]`) outside `src/components/ui/` | Sentence-case labels (`text-xs font-medium text-muted-foreground` or `text-sm font-medium`) |
| Monospace font on subtitles, section labels, or general UI chrome | `font-mono` is strictly for filenames, filesystem paths, rule glob/regex/destination patterns, batch IDs, keyboard shortcuts, and tabular timestamps |
| Repeated status chrome (duplicate watcher cards in sidebar, breadcrumbs repeating the sidebar selection) | Watcher status lives in the single sidebar footer row and the Overview status line |
| Bright cyan/neon primary buttons (`#06b6d4`, `#22d3ee`) or raw Tailwind color utilities (`bg-cyan-*`, `text-emerald-*`, `border-amber-*`, etc.) | Neutral shadcn `Button` (`bg-primary text-primary-foreground`); `--brand` is used only on the 16px sidebar logo icon |
| Arbitrary Tailwind values (`bg-[#...]`, `text-[11px]`, `p-[...]`), gradients (`bg-gradient-*`), glassmorphism (`backdrop-blur*`), or in-flow shadows (`shadow-*`) outside `src/components/ui/` | Official shadcn/ui components (`src/components/ui/`) + standard Tailwind v4 spacing and typography scale |
| Always-visible Copy + Reveal icon buttons on every path row | Copy and Reveal buttons appear on row hover/focus-within (`opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`) |
| Giant centered icon + headline + subtext empty states | Left-aligned `EmptyState`: one `text-sm font-medium` title, one `text-sm text-muted-foreground` description, one optional `Button size="sm"` |
| Truncating paths at the end | Middle-ellipsis so both root and filename stay visible |

If you are about to add something "to make it look nicer" and it is not in this document, don't.

## 3. Platform and window

- Primary target: Windows 10/11 (WebView2). Must also run on Linux and macOS without layout breakage.
- Default window 1080x700, minimum 880x560. Layout must hold at minimum size without horizontal scroll.
- Native window frame in v1.
- Follow the OS theme by default (`prefers-color-scheme`); user can override to Light or Dark in Settings. Both themes are first-class: every screen must be checked in both.
- Respect OS text scaling and `prefers-reduced-motion`.

## 4. Design tokens

Implemented in `frontend/src/index.css` using the official **shadcn/ui `neutral`** base color palette (`oklch` CSS variables) mapped via `@theme inline`. Light theme variables live under `:root, [data-theme="light"]`; dark theme variables live under `:root:not([data-theme="light"]), .dark` (dark is the default when no `data-theme="light"` attribute is set).

### 4.1 Color (shadcn/ui `neutral` + semantic status tokens)

| CSS Variable | Light (`oklch`) | Dark (`oklch`) | Role |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Window and main content background |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Primary text |
| `--card` / `--card-foreground` | `oklch(1 0 0)` / `oklch(0.145 0 0)` | `oklch(0.205 0 0)` / `oklch(0.985 0 0)` | Raised containers when needed |
| `--popover` / `--popover-foreground` | `oklch(1 0 0)` / `oklch(0.145 0 0)` | `oklch(0.205 0 0)` / `oklch(0.985 0 0)` | Dialogs, sheets, dropdown menus, tooltips |
| `--primary` / `--primary-foreground` | `oklch(0.205 0 0)` / `oklch(0.985 0 0)` | `oklch(0.922 0 0)` / `oklch(0.205 0 0)` | Neutral primary button fill and active controls |
| `--secondary` / `--secondary-foreground` | `oklch(0.97 0 0)` / `oklch(0.205 0 0)` | `oklch(0.269 0 0)` / `oklch(0.985 0 0)` | Secondary buttons and badges |
| `--muted` / `--muted-foreground` | `oklch(0.97 0 0)` / `oklch(0.556 0 0)` | `oklch(0.269 0 0)` / `oklch(0.708 0 0)` | Subdued backgrounds and secondary/caption text |
| `--accent` / `--accent-foreground` | `oklch(0.97 0 0)` / `oklch(0.205 0 0)` | `oklch(0.269 0 0)` / `oklch(0.985 0 0)` | Row hover and active sidebar navigation item |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Error states and destructive confirmation actions |
| `--border` / `--input` / `--ring` | `oklch(0.922 0 0)` / `oklch(0.922 0 0)` / `oklch(0.708 0 0)` | `oklch(1 0 0 / 10%)` / `oklch(1 0 0 / 15%)` / `oklch(0.556 0 0)` | Hairline borders, inputs, focus rings |
| `--sidebar` / `--sidebar-border` | `oklch(0.985 0 0)` / `oklch(0.922 0 0)` | `oklch(0.17 0 0)` / `oklch(1 0 0 / 10%)` | Sidebar surface and right border |
| `--brand` | `oklch(0.52 0.09 210)` | `oklch(0.72 0.11 210)` | 16px brand icon in sidebar header only |
| `--status-watching` | `oklch(0.55 0.15 150)` | `oklch(0.70 0.15 150)` | Watching status dot (`size-2`) and pass indicator |
| `--status-warning` | `oklch(0.60 0.15 75)` | `oklch(0.78 0.14 75)` | Skipped / warning dot (`size-2`) |

Rules:
- Text on any background must meet WCAG AA contrast in both themes.
- Non-neutral hues (`--brand`, `--status-watching`, `--status-warning`, `--destructive`) never fill large surfaces; they appear only on 8px status dots, 16px status icons, or destructive confirmation buttons inside dialogs.
- No rule category dot palette exists.

### 4.2 Typography

- `--font-sans`: `'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif`
- `--font-mono`: `'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace` (`font-variant-numeric: tabular-nums`)
- Bundle fonts locally (`@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`; both SIL OFL). No CDN.
- Hierarchy:
  - Page title (in header): `text-lg font-semibold`
  - Section title: `text-sm font-medium`
  - Body / table cells: `text-sm`
  - Secondary / captions / table headers: `text-xs text-muted-foreground` (sentence case, never `uppercase`)
  - Mono (paths, filenames, rule patterns, batch IDs, shortcuts): `font-mono text-xs`

### 4.3 Spacing, radius, borders, elevation

- Base radius: `--radius: 0.625rem` (`rounded-lg` for top-level table/list containers and dialogs, `rounded-md` for buttons and inputs).
- Borders are 1px (`border-border`). In-flow sections use at most one level of bordered container (`rounded-lg border`).
- Elevation (`shadow-lg` / `shadow-xs`) is restricted to popovers, dropdown menus, dialogs, sheets, and toasts inside `src/components/ui/`.

### 4.4 Motion & Reduced Motion

- Subtle transitions via `tw-animate-css` for dialogs, sheets, and popovers.
- Watching status dot (`StatusDot` with `status="watching"`) uses `animate-pulse`.
- Under `@media (prefers-reduced-motion: reduce)`, all animations and transitions collapse to `0.01ms`.

## 5. Layout

```
+--------------------------------------------------------------+
| Window title (native)                                        |
+---------------+----------------------------------------------+
| [L] ClutterLess|  Page title                      [Actions]  |
|               |  ------------------------------------------  |
|  Overview     |                                              |
|  Activity     |   Content (px-8 py-6, space-y-6)             |
|  Rules        |                                              |
|  Folders      |                                              |
|               |                                              |
|  ------------ |                                              |
|  * Watching   |                                              |
|  Settings     |                                              |
+---------------+----------------------------------------------+
```

- **Sidebar** (`w-52 shrink-0 border-r bg-sidebar`):
  - Top brand row (`h-14 px-4`): 16px `Layers` icon in `text-brand` + `"ClutterLess"` (`text-sm font-semibold`). No subtitle, no version badge.
  - Primary nav (`px-2 py-2 space-y-0.5`): `Overview`, `Activity`, `Rules`, `Folders` rendered as `Button` (`variant="ghost" size="sm" className="w-full justify-start gap-2"`), with `bg-accent text-accent-foreground font-medium` when active. No item badges or left accent bars.
  - Footer (`mt-auto border-t p-2 space-y-1`): one status line (`StatusDot` + `"Watching N folders"` / `"Paused"`, `px-2 py-1.5 text-xs text-muted-foreground`) and `Settings` nav button (`Ctrl+,` `Kbd` on hover).
  - `/styleguide` is a dev-only route (`import.meta.env.DEV`) and never appears in the sidebar navigation.
- **Page header** (`flex h-14 items-center justify-between px-8` + `Separator`):
  - Left: page title (`text-lg font-semibold`). No breadcrumbs, no subtitles.
  - Right: at most 2 action buttons (`size="sm"`).
- **Content area**: `flex-1 overflow-y-auto px-8 py-6` with `space-y-6`.

## 6. Components

### 6.1 Official `shadcn/ui` primitives (`src/components/ui/`)

Generated via the official `shadcn` CLI (`new-york` style, `neutral` base color, CSS variables) and used via `variant`, `size`, and composition without arbitrary overrides:
- `accordion.tsx`, `alert.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `tooltip.tsx`.

### 6.2 Project-specific components (`src/components/`)

| Component | Spec |
|---|---|
| **`FileRow`** | Renders either as a `TableRow` (`asTableRow`) or a `div` flex row (`h-9 px-3`). Shows `filename` (`font-mono text-xs font-medium`), `ArrowRight` (`size-3.5 text-muted-foreground`), destination `Path`, plain `text-xs text-muted-foreground` rule name (no category dot), and relative timestamp (`font-mono text-xs tabular-nums text-muted-foreground`). |
| **`Path`** | `font-mono text-xs text-muted-foreground` with middle-ellipsis (`formatMiddleEllipsis`) and full path in a shadcn `Tooltip`. Copy and Reveal `Button` (`variant="ghost" size="icon" className="size-6"`) are hidden until row hover/focus (`opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`). |
| **`StatusDot`** | `size-2 rounded-full`: `watching` (`bg-status-watching animate-pulse`), `paused` (`bg-muted-foreground/50`), `warning` (`bg-status-warning`), `error` (`bg-destructive`). Always paired with text. |
| **`EmptyState`** | Left-aligned `py-8`: `text-sm font-medium text-foreground` title, `text-sm text-muted-foreground` description, optional `Button size="sm" variant="outline"`. |
| **`Kbd`** | `rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground`. |

## 7. Screens

### 7.1 Overview
- Header: `"Overview"`, right actions: `Button variant="outline" size="sm"` (`Pause` / `Resume`) and `Button size="sm"` (`Organize now`).
- Status section (no card): one status line (`StatusDot` + `"Watching 2 folders · last file moved 3m ago"`) followed by a flat list of watched folders (`divide-y border-y`, each row `py-2` with `Path` on the left and `"24 files"` in `text-xs text-muted-foreground` on the right).
- Needs attention: rendered only when items exist, using a single shadcn `Alert` (`AlertTriangle` icon + skipped/failed rows with dismiss/retry actions).
- Recent activity: section header (`text-sm font-medium` `"Recent activity"` + `Button variant="link" size="sm"` `"View all ->"`), followed by a single `rounded-lg border` containing a shadcn `Table` (`File`, `Destination`, `Rule`, `Time`) with the last 8 moves.

### 7.2 Activity
- Header: `"Activity"`, right action: `Button variant="outline" size="sm"` (`Organize now`).
- Toolbar (no card/border wrapper): `flex items-center justify-between gap-4` with shadcn `Tabs` (`All`, `Applied`, `Undone`) on the left and search `Input` (`max-w-xs`, `Ctrl+K`) on the right.
- Date groups: `text-sm text-muted-foreground` date heading (sentence case), followed by a single `rounded-lg border divide-y` container holding that date's batches.
- Each batch row (`h-10 px-3`) shows expand chevron, batch ID (`font-mono text-xs`), `"3 files"` (`text-xs text-muted-foreground`), status `Badge` (`variant="outline"` with `StatusDot` for `Applied`, `variant="secondary"` for `Undone`), relative time, `Button variant="ghost" size="sm"` `"Undo"`, and overflow `DropdownMenu`. Expanding reveals `FileRow` items separated by `divide-y`.

### 7.3 Preview sheet (dry-run)
- Right-side shadcn `Sheet` (`sm:max-w-xl w-full flex flex-col`).
- `SheetHeader`: `"Preview"` + `SheetDescription` `"5 will move · 1 skipped · 2 unmatched"`.
- Body: `Will move` list in a single `rounded-lg border divide-y` with header select-all `Checkbox` and per-row `Checkbox` + `FileRow`; `Skipped` section; collapsible `Unmatched` section.
- `SheetFooter`: `"Nothing has been moved yet."` caption on the left, `Button variant="outline"` `"Cancel"` and `Button` `"Move N files"` on the right.

### 7.4 Rules
- Header: `"Rules"`, right action: `Button size="sm"` (`New rule`).
- One muted caption below header: `"Rules run top to bottom. The first match wins."` (`text-sm text-muted-foreground`).
- Rules list: a single `rounded-lg border divide-y` container. Each sortable row (`h-11 px-3`) has a drag handle (`GripVertical`), rule name (`text-sm font-medium w-36`), condition summary (`font-mono text-xs text-muted-foreground`), `ArrowRight`, destination pattern (`font-mono text-xs text-muted-foreground`), `Switch`, and `DropdownMenu` (`Edit`, `Duplicate`, `Delete`). No `#1..#5` badges, no category dots.
- Inline tester below (`space-y-2 pt-2`): `Label` `"Test a file name"`, `Input` (`font-mono`) + `Button variant="outline"` `"Test"`, and plain result summary.

### 7.5 Rule editor & Undo dialog
- Built on shadcn `Dialog` (`sm:max-w-xl`).
- Rule editor uses `Label`, `Input`, `Select`, template chips (`Badge variant="secondary"`), live CLI-identical validation messages (`text-xs text-destructive`), and a read-only YAML toggle.
- Undo dialog lists files to restore inside a scrollable `rounded-lg border divide-y` container and states that undo is final.

### 7.6 Folders
- Header: `"Folders"`, right action: `Button size="sm"` (`Add folder`).
- Inline warning `Alert` when a rule destination sits inside a recursively watched folder.
- Single `rounded-lg border` containing a shadcn `Table` with columns `Folder` (folder basename in `font-medium` + full `Path` below), `Files` (`font-mono text-xs text-muted-foreground text-right`), `Recursive` (`Switch`), and actions (`DropdownMenu`: `Open in file manager`, `Remove`).

### 7.7 Settings
- Header: `"Settings"` (no header buttons).
- Organized with shadcn `Tabs` (`General`, `System`, `Data & About`), content `max-w-xl`.
- Each tab renders flat rows separated by `divide-y` (label + description on the left, `Select` / `Switch` / `Input` / `Button variant="outline" size="sm"` on the right).
- `"Reset to defaults"` uses `Button variant="outline" size="sm"`; `variant="destructive"` is used only on the confirmation button inside the confirm `Dialog`.

### 7.8 First-run onboarding
- Three steps in a single centered `max-w-lg rounded-lg border bg-background p-6` panel: 1) Choose folders to watch, 2) Choose rule set, 3) Preview of planned moves -> `Organize` or `Skip for now`.

### 7.9 Tray menu & 7.10 Error states
- Native tray menu: status line, `Open ClutterLess`, `Pause/Resume watching`, `Organize now`, `Quit`.
- Config invalid or watcher lock contention renders as a shadcn `Alert variant="destructive"` at the top of Overview with `Open config` and `Retry` buttons.

## 8. Voice and copy

- Sentence case everywhere. No title case, no exclamation marks, no emoji, no first-person ("we").
- Plain verbs: "Move 5 files", "Undo batch", "Add folder".
- Be specific: "5 files moved to Documents/Finance" not "Success".
- Show real numbers and real paths. Never placeholder text in shipped screens.
- Errors: cause + object + next step.
- Strings live in `frontend/src/i18n/en.ts` (and `id.ts`).

## 9. Accessibility

- Full keyboard operation: Tab order follows visual order, Esc closes dialogs/sheets/menus, Enter confirms the primary action, Alt+Up/Down reorders rules, `Ctrl+K` focuses search.
- Global shortcuts: `Ctrl+Shift+O` Organize now, `Ctrl+Z` on Activity = undo last batch, `Ctrl+,` Settings.
- Screen reader: every icon-only control has `aria-label`; live regions announce toast text and watcher status changes; state never relies on color alone.
- Contrast: WCAG AA minimum in both themes.

## 10. Visual QA checklist (run at the end of every UI phase)

1. Screenshot every screen touched at 1080x700 and 880x560, in both themes. Save to `docs/screenshots/<phase>/`.
2. Zero horizontal scroll at 880x560. Long paths middle-ellipsize rather than wrap or overflow.
3. Every interactive element reachable by keyboard with a visible focus ring.
4. `npm run lint:style` and `npm run lint` pass with 0 violations (zero `uppercase`, `tracking-wide*`, arbitrary values, raw Tailwind color palettes, gradients, or blurs outside `src/components/ui/`).
5. At most 1 level of bordered container (`rounded-lg border`) per screen section.
6. Empty, loading-in-progress, error, and long-content (60+ char filename, 120+ char path) states exist and look intentional.
7. Reduced motion: toggle the OS setting or emulate it; nothing moves.
