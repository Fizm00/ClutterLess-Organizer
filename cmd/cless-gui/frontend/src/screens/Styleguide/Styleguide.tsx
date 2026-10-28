// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StatusDot, Path, FileRow, EmptyState, Kbd } from '@/components';
import { useThemeStore, ThemeMode } from '@/store/themeStore';
import { AlertCircle, Folder } from 'lucide-react';
import { toast } from 'sonner';

export const Styleguide: React.FC = () => {
  const { mode, setMode } = useThemeStore();
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Theme Toggle & Toast Trigger */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Theme:</span>
          <Tabs value={mode} onValueChange={v => setMode(v as ThemeMode)}>
            <TabsList>
              <TabsTrigger value="dark">Dark</TabsTrigger>
              <TabsTrigger value="light">Light</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => toast('Moved 5 files to Documents/Finance.')}
        >
          Trigger toast
        </Button>
      </div>

      {/* 1. Buttons, Badges & StatusDots */}
      <section className="flex flex-col gap-2.5 w-full">
        <h2 className="text-sm font-medium text-foreground">Buttons, badges, and status</h2>
        <div className="rounded-lg border p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="default" size="sm">Default</Button>
            <Button variant="secondary" size="sm">Secondary</Button>
            <Button variant="outline" size="sm">Outline</Button>
            <Button variant="ghost" size="sm">Ghost</Button>
            <Button variant="destructive" size="sm">Destructive</Button>
            <Button variant="default" size="sm" disabled>Disabled</Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Applied</Badge>
            <Badge variant="outline">Undone</Badge>
            <Badge variant="secondary" className="font-mono text-xs font-normal">.pdf</Badge>
            <Badge variant="secondary" className="font-mono text-xs font-normal">.jpg</Badge>
            <Kbd>Ctrl+Shift+O</Kbd>
            <Kbd>Ctrl+K</Kbd>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <StatusDot state="watching" label="Watching 2 folders" />
            <StatusDot state="paused" label="Watcher paused" />
            <StatusDot state="error" label="Watcher error" />
          </div>
        </div>
      </section>

      {/* 2. Form Controls & Alert */}
      <section className="flex flex-col gap-2.5 w-full">
        <h2 className="text-sm font-medium text-foreground">Inputs, switches, and alerts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-input">Rule name</Label>
            <Input id="sg-input" defaultValue="Invoices" />
            <Label htmlFor="sg-dest">Destination pattern</Label>
            <Input id="sg-dest" defaultValue="~/Documents/Finance/{year}-{month}" className="font-mono text-xs" />
          </div>

          <div className="flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Recursive monitoring</span>
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-label="Recursive monitoring" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={checked} onCheckedChange={v => setChecked(Boolean(v))} id="sg-check" />
              <Label htmlFor="sg-check" className="font-normal">Include in organization run</Label>
            </div>
            <Alert>
              <AlertCircle className="size-4 text-muted-foreground" />
              <AlertTitle>Needs attention</AlertTitle>
              <AlertDescription>1 file skipped while still being written.</AlertDescription>
            </Alert>
          </div>
        </div>
      </section>

      {/* 3. Project Components: FileRow, Path & EmptyState */}
      <section className="flex flex-col gap-2.5 w-full">
        <h2 className="text-sm font-medium text-foreground">FileRow, Path middle-ellipsis, and EmptyState</h2>
        <div className="rounded-lg border divide-y w-full overflow-hidden">
          <FileRow
            filename="quarterly_financial_audit_reconciliation_report_final_v2_approved_signed.pdf"
            destPath="C:/Users/Administrator/Documents/Corporate_Enterprise_Financial_Records/2026/Q1_Audits/Reconciliations/Finalized/report.pdf"
            ruleName="Invoices"
            timeAgo="3m ago"
          />
          <FileRow
            filename="IMG_2041_holiday_photo.heic"
            destPath="C:/Users/User/Pictures/Sorted/2026/IMG_2041.heic"
            ruleName="Images"
            timeAgo="12m ago"
          />
          <div className="px-4 py-2 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Path component:</span>
            <Path path="D:/Storage/Archive/Software_Engineering_Projects/ClutterLess_Organizer_Workspace/Build_Artifacts/Distribution/bundle.zip" />
          </div>
          <div className="px-4">
            <EmptyState
              icon={<Folder className="size-4 text-muted-foreground" />}
              title="Nothing moved yet"
              description="New files in your watched folders will appear here."
            />
          </div>
        </div>
      </section>
    </div>
  );
};
