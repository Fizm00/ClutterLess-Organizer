import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Select,
  Switch,
  SegmentedControl,
  Badge,
  Checkbox,
  ListRow,
  FileRow,
  Path,
  EmptyState,
  Kbd,
  StatusDot,
  Menu,
  Dialog,
  Sheet,
  toast,
} from '../../components';
import { Play, Pause, Trash2, Edit3, MoreVertical, Plus, Folder } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

export const Styleguide: React.FC = () => {
  const { mode, setMode } = useThemeStore();
  const [switchState, setSwitchState] = useState(true);
  const [checkboxState, setCheckboxState] = useState(true);
  const [segmentVal, setSegmentVal] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const longPath =
    'C:/Users/Administrator/Documents/Corporate_Enterprise_Financial_Records/2026/Q1_Audits/Reconciliations/Finalized/quarterly_audit_final_approved_signed_v2.pdf';

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between py-3 px-4 bg-card border border-border rounded-xl shadow-xs w-full">
        <div className="flex items-center gap-2.5">
          <span className="font-sans text-small font-medium text-muted-foreground">Theme:</span>
          <SegmentedControl
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open Dialog
          </Button>
          <Button variant="primary" onClick={() => setSheetOpen(true)}>
            Open Preview Sheet
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast.show('5 files moved to Documents/Finance', 'Undo', () => {
                toast.show('Restored 5 files. 0 conflicts.');
              })
            }
          >
            Trigger Toast
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Buttons & IconButtons */}
        <section className="flex flex-col gap-4 p-5 bg-card border border-border rounded-xl shadow-xs min-w-0">
          <h2 className="font-sans text-subtitle font-semibold text-foreground pb-2 border-b border-border-subtle">
            Buttons & Actions
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton icon={<Play size={14} strokeWidth={1.5} />} label="Start watch" />
            <IconButton icon={<Pause size={14} strokeWidth={1.5} />} label="Pause watch" />
            <IconButton icon={<Trash2 size={14} strokeWidth={1.5} />} label="Delete rule" variant="danger" />
            <IconButton icon={<Plus size={14} strokeWidth={1.5} />} label="Add folder" variant="secondary" />
          </div>
        </section>

        {/* Inputs & Selects */}
        <section className="flex flex-col gap-4 p-5 bg-card border border-border rounded-xl shadow-xs min-w-0">
          <h2 className="font-sans text-subtitle font-semibold text-foreground pb-2 border-b border-border-subtle">
            Inputs & Selects
          </h2>
          <div className="flex flex-col gap-3 w-full">
            <Input label="Rule Name" placeholder="e.g. Invoices" defaultValue="Financial Documents" />
            <Input
              label="Destination Pattern (Mono)"
              mono
              placeholder="~/Documents/{year}"
              defaultValue="~/Documents/Finance/{year}-{month}"
            />
            <Input
              label="With Error State"
              error="at least one rule condition is required"
              defaultValue="Invalid Rule"
            />
            <Select
              label="Conflict Strategy"
              options={[
                { value: 'rename', label: 'Rename (name (1).ext)' },
                { value: 'skip', label: 'Skip (leave in place)' },
              ]}
              defaultValue="rename"
            />
          </div>
        </section>

        {/* Switches & Toggles */}
        <section className="flex flex-col gap-4 p-5 bg-card border border-border rounded-xl shadow-xs min-w-0">
          <h2 className="font-sans text-subtitle font-semibold text-foreground pb-2 border-b border-border-subtle">
            Switches & Toggles
          </h2>
          <div className="flex flex-col gap-3 w-full">
            <Switch
              label="Recursive scanning"
              description="Scan subdirectories inside watched folder"
              checked={switchState}
              onCheckedChange={setSwitchState}
            />
            <Switch
              label="Disabled setting"
              description="This option cannot be toggled"
              checked={false}
              disabled
              onCheckedChange={() => {}}
            />
            <div className="flex flex-wrap items-center gap-4">
              <Checkbox label="Selected for move" checked={checkboxState} onCheckedChange={setCheckboxState} />
              <Checkbox label="Disabled item" checked={false} disabled onCheckedChange={() => {}} />
            </div>
            <div>
              <span className="font-sans text-small font-medium text-foreground block mb-1.5">Filter Segmented Control</span>
              <SegmentedControl
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'applied', label: 'Applied' },
                  { value: 'undone', label: 'Undone' },
                ]}
                value={segmentVal}
                onChange={setSegmentVal}
              />
            </div>
          </div>
        </section>

        {/* Badges & Indicators */}
        <section className="flex flex-col gap-4 p-5 bg-card border border-border rounded-xl shadow-xs min-w-0">
          <h2 className="font-sans text-subtitle font-semibold text-foreground pb-2 border-b border-border-subtle">
            Badges & Indicators
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge state="moved">Moved</Badge>
            <Badge state="skipped">Skipped</Badge>
            <Badge state="failed">Failed</Badge>
            <Badge state="undone">Undone</Badge>
            <Badge>Tag</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusDot state="watching" label="Watching 2 folders" />
            <StatusDot state="paused" label="Watcher paused" />
            <StatusDot state="error" label="Locked / Conflict" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Kbd>Ctrl+Shift+O</Kbd>
            <Kbd>Ctrl+Z</Kbd>
            <Kbd>Esc</Kbd>
          </div>
          <div>
            <Menu
              trigger={
                <Button variant="secondary">
                  Dropdown Menu <MoreVertical size={13} />
                </Button>
              }
              items={[
                { label: 'Edit Rule', icon: <Edit3 size={14} />, shortcut: 'Enter' },
                { label: 'Duplicate', icon: <Plus size={14} /> },
                { label: 'Delete', icon: <Trash2 size={14} />, danger: true },
              ]}
            />
          </div>
        </section>

        {/* Paths & Middle Ellipsis */}
        <section className="col-span-full flex flex-col gap-4 p-5 bg-card border border-border rounded-xl shadow-xs min-w-0">
          <h2 className="font-sans text-subtitle font-semibold text-foreground pb-2 border-b border-border-subtle">
            Middle-Ellipsis Path Handling (60+ chars & 120+ paths)
          </h2>
          <div className="flex flex-col gap-3 w-full">
            <Path path="C:/Users/User/Downloads/short.pdf" onReveal={p => toast.show(`Reveal: ${p}`)} />
            <Path path={longPath} onReveal={p => toast.show(`Reveal: ${p}`)} />
            <Path
              path="D:/Very_Long_Company_Enterprise_Storage_Directory_Structure_Level_1/Level_2/Level_3/deep_file_asset_bundle.zip"
              onReveal={p => toast.show(`Reveal: ${p}`)}
            />
          </div>
        </section>

        {/* FileRows (Real Activity View) */}
        <section className="col-span-full flex flex-col gap-3 p-5 bg-card border border-border rounded-xl shadow-xs min-w-0">
          <h2 className="font-sans text-subtitle font-semibold text-foreground pb-2 border-b border-border-subtle">
            FileRows & Table Presentation
          </h2>
          <div className="flex flex-col border border-border rounded-lg overflow-hidden w-full">
            <ListRow isHeader>
              <span className="w-60 shrink-0">File</span>
              <span className="w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0">Destination</span>
              <span className="w-24 shrink-0 text-right">Rule</span>
              <span className="w-12 shrink-0 text-right">Time</span>
            </ListRow>
            <FileRow
              filename="quarterly_audit_final_approved_signed_v2.pdf"
              destPath={longPath}
              ruleName="Invoices"
              ruleCategoryIndex={0}
              timeAgo="2m"
              onReveal={p => toast.show(`Reveal: ${p}`)}
            />
            <FileRow
              filename="IMG_2041_holiday_photo_family_camera.heic"
              destPath="C:/Users/User/Pictures/Sorted/2026/IMG_2041.heic"
              ruleName="Images"
              ruleCategoryIndex={1}
              timeAgo="5m"
              onReveal={p => toast.show(`Reveal: ${p}`)}
            />
            <FileRow
              filename="very_long_project_asset_specification_documentation_bundle_archive_2026.zip"
              destPath="D:/Storage/Archive/Software_Engineering_Projects/Downloads/_Archives/bundle.zip"
              ruleName="Archives"
              ruleCategoryIndex={3}
              timeAgo="1h"
              onReveal={p => toast.show(`Reveal: ${p}`)}
            />
          </div>
        </section>

        {/* Empty State */}
        <section className="col-span-full flex flex-col gap-4 p-5 bg-card border border-border rounded-xl shadow-xs min-w-0">
          <h2 className="font-sans text-subtitle font-semibold text-foreground pb-2 border-b border-border-subtle">
            Empty State Specification
          </h2>
          <EmptyState
            icon={<Folder size={16} strokeWidth={1.5} />}
            title="Nothing moved yet"
            description="New files in your watched folders will appear here automatically."
            action={<Button variant="primary">Organize now</Button>}
          />
        </section>
      </div>

      {/* Dialog Preview */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Undo batch batch-20260418-142200?"
        description="The following files will be restored to their original locations. This action cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setDialogOpen(false);
                toast.show('Restored 3 files. 0 conflicts.');
              }}
            >
              Restore 3 files
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-0.5 w-full">
          <FileRow
            filename="report_2026.pdf"
            destPath="C:/Users/User/Downloads/report_2026.pdf"
            ruleName="Documents"
            ruleCategoryIndex={4}
          />
          <FileRow
            filename="setup.exe"
            destPath="C:/Users/User/Downloads/setup.exe"
            ruleName="Installers"
            ruleCategoryIndex={6}
          />
        </div>
      </Dialog>

      {/* Sheet Preview */}
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Preview"
        description="4 will move - 1 skipped - 0 unmatched"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSheetOpen(false);
                toast.show('Moved 4 files.');
              }}
            >
              Move 4 files
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-0.5 w-full">
          <span className="font-sans text-small text-text-2 block mb-1">Will move</span>
          <FileRow
            filename="invoice_april_2026.pdf"
            destPath="Documents/Finance/2026-04/invoice_april_2026.pdf"
            ruleName="Invoices"
            ruleCategoryIndex={0}
          />
          <FileRow
            filename="IMG_9999.png"
            destPath="Pictures/Sorted/2026/IMG_9999.png"
            ruleName="Images"
            ruleCategoryIndex={1}
          />
          <span className="font-sans text-small text-text-2 block mb-1 mt-4">
            Skipped
          </span>
          <FileRow
            filename="video.crdownload"
            destPath="(still writing)"
            ruleName="Videos"
            ruleCategoryIndex={2}
          />
        </div>
      </Sheet>
    </div>
  );
};
