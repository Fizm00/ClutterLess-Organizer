// SPDX-License-Identifier: AGPL-3.0-only
import {
  Api,
  BatchDetailDTO,
  BatchSummaryDTO,
  ConditionEvaluationDTO,
  ConfigDTO,
  FolderWarningDTO,
  HistoryFilterDTO,
  MoveResultDTO,
  OnboardingRequest,
  PlanDTO,
  PreviewOptionsDTO,
  RuleDTO,
  RuleTestResultDTO,
  RunRequestDTO,
  RunResultDTO,
  UndoResultDTO,
  ValidationErrorDTO,
  VersionInfo,
  WatchStatusDTO,
} from './types';

// Realistic 70-character filenames and 120+ character paths for rigorous edge-case testing
const longFilename1 = 'quarterly_financial_audit_reconciliation_report_final_v2_approved_signed.pdf';
const longFilename2 = 'very_long_project_asset_specification_documentation_bundle_archive_2026.zip';
const longPath1 = 'C:/Users/Administrator/Documents/Corporate_Enterprise_Financial_Records/2026/Q1_Audits/Reconciliations/Finalized';
const longPath2 = 'D:/Storage/Archive/Software_Engineering_Projects/ClutterLess_Organizer_Workspace/Build_Artifacts/Distribution';

let mockConfig: ConfigDTO = {
  settings: {
    stableAfterSeconds: 3,
    conflict: 'rename',
    fallbackDir: '',
    ignoreHidden: true,
    ignoreExt: ['crdownload', 'part', 'tmp', 'download'],
    ignoreNames: ['desktop.ini', 'thumbs.db', '.DS_Store'],
    closeToTray: true,
    notificationsEnabled: false,
    autostart: false,
    onboardingCompleted: true,
  },
  watch: [
    { path: '~/Downloads', recursive: false },
    { path: '~/Desktop', recursive: false },
  ],
  rules: [
    {
      name: 'Invoices',
      moveTo: '~/Documents/Finance/{year}-{month}',
      match: { nameRegex: '(?i)(invoice|faktur|receipt|kwitansi|struk|tax)' },
    },
    {
      name: 'Images',
      moveTo: '~/Pictures/Sorted/{year}',
      match: { ext: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'heic'] },
    },
    {
      name: 'Videos',
      moveTo: '~/Videos/Sorted/{year}',
      match: { ext: ['mp4', 'mkv', 'mov', 'avi'] },
    },
    {
      name: 'Archives',
      moveTo: '~/Downloads/_Archives',
      match: { ext: ['zip', 'rar', '7z', 'tar', 'gz'] },
    },
    {
      name: 'Documents',
      moveTo: '~/Documents/Inbox/{ext}',
      match: { ext: ['pdf', 'docx', 'xlsx', 'pptx', 'txt'] },
    },
  ],
};

let mockWatchStatus: WatchStatusDTO = {
  running: true,
  folders: ['~/Downloads', '~/Desktop'],
};

const mockBatchSummaries: BatchSummaryDTO[] = [
  {
    id: 'batch-20260418-142200',
    time: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    total: 3,
    moved: 3,
    undone: 0,
    allUndone: false,
  },
  {
    id: 'batch-20260418-120000',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    total: 8,
    moved: 8,
    undone: 0,
    allUndone: false,
  },
  {
    id: 'batch-20260417-093000',
    time: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    total: 5,
    moved: 5,
    undone: 5,
    allUndone: true,
  },
];

const mockListeners = new Map<string, Set<(payload: any) => void>>();

export const mockApi: Api & { emit: (name: string, payload: any) => void } = {
  config: {
    async get(): Promise<ConfigDTO> {
      return JSON.parse(JSON.stringify(mockConfig));
    },
    async validate(dto: ConfigDTO): Promise<ValidationErrorDTO[]> {
      const errs: ValidationErrorDTO[] = [];
      if (dto.settings.stableAfterSeconds < 1) {
        errs.push({ field: 'settings.stableAfterSeconds', message: 'must be at least 1 second' });
      }
      if (dto.rules.length === 0) {
        errs.push({ field: 'rules', message: 'at least one rule is required' });
      }
      return errs;
    },
    async save(dto: ConfigDTO): Promise<void> {
      mockConfig = JSON.parse(JSON.stringify(dto));
      mockWatchStatus.folders = (mockConfig.watch || []).map(w => w.path);
    },
    async path(): Promise<string> {
      return 'C:/Users/User/.config/clutterless/config.yaml';
    },
    async resetToDefaults(): Promise<void> {
      mockConfig = {
        settings: {
          stableAfterSeconds: 3,
          conflict: 'rename',
          fallbackDir: '',
          ignoreHidden: true,
          ignoreExt: ['crdownload', 'part', 'tmp', 'download'],
          ignoreNames: ['desktop.ini', 'thumbs.db', '.DS_Store'],
          closeToTray: true,
          notificationsEnabled: false,
          autostart: false,
          onboardingCompleted: true,
        },
        watch: [
          { path: '~/Downloads', recursive: false },
          { path: '~/Desktop', recursive: false },
        ],
        rules: [
          {
            name: 'Invoices',
            moveTo: '~/Documents/Finance/{year}-{month}',
            match: { nameRegex: '(?i)(invoice|faktur|receipt|kwitansi|struk|tax)' },
          },
          {
            name: 'Images',
            moveTo: '~/Pictures/Sorted/{year}',
            match: { ext: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'heic'] },
          },
          {
            name: 'Videos',
            moveTo: '~/Videos/Sorted/{year}',
            match: { ext: ['mp4', 'mkv', 'mov', 'avi'] },
          },
        ],
      };
    },
    async isFirstRun(): Promise<boolean> {
      return !mockConfig.settings.onboardingCompleted;
    },
    async completeOnboarding(req: OnboardingRequest): Promise<void> {
      mockConfig.watch = req.watchFolders.map(p => ({ path: p, recursive: false }));
      mockWatchStatus.folders = [...req.watchFolders];
      if (req.ruleSet === 'empty') {
        mockConfig.rules = [];
      }
      mockConfig.settings.onboardingCompleted = true;
      mockConfig.settings.autostart = req.autostart;
      mockConfig.settings.closeToTray = true;
    },
    async getFolderWarnings(): Promise<FolderWarningDTO[]> {
      const warnings: FolderWarningDTO[] = [];
      for (const w of mockConfig.watch) {
        if (!w.recursive) continue;
        for (const r of mockConfig.rules) {
          if (r.moveTo.startsWith(w.path)) {
            warnings.push({
              folderPath: w.path,
              ruleName: r.name,
              moveTo: r.moveTo,
              message: `Rule "${r.name}" destination (${r.moveTo}) is inside this recursive folder. Files moved here will be re-scanned unless excluded.`,
            });
          }
        }
      }
      return warnings;
    },
  },

  rules: {
    async list(): Promise<RuleDTO[]> {
      return JSON.parse(JSON.stringify(mockConfig.rules));
    },
    async upsert(rule: RuleDTO): Promise<void> {
      const idx = mockConfig.rules.findIndex(r => r.name.toLowerCase() === rule.name.toLowerCase());
      if (idx >= 0) {
        mockConfig.rules[idx] = rule;
      } else {
        mockConfig.rules.push(rule);
      }
    },
    async delete(name: string): Promise<void> {
      mockConfig.rules = mockConfig.rules.filter(r => r.name.toLowerCase() !== name.toLowerCase());
    },
    async reorder(names: string[]): Promise<void> {
      const map = new Map(mockConfig.rules.map(r => [r.name.toLowerCase(), r]));
      const next: RuleDTO[] = [];
      for (const n of names) {
        const found = map.get(n.toLowerCase());
        if (found) {
          next.push(found);
          map.delete(n.toLowerCase());
        }
      }
      for (const rem of map.values()) {
        next.push(rem);
      }
      mockConfig.rules = next;
    },
    async test(filename: string): Promise<RuleTestResultDTO> {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      for (const rule of mockConfig.rules) {
        if (rule.disabled) continue;
        if (rule.match.nameRegex && new RegExp(rule.match.nameRegex.replace(/\(\?i\)/g, ''), 'i').test(filename)) {
          return {
            matched: true,
            ruleName: rule.name,
            destination: rule.moveTo.replace('{year}', '2026').replace('{month}', '04') + '/' + filename,
            reason: `matched rule ${rule.name}`,
            conditions: [
              { type: 'name_regex', pattern: rule.match.nameRegex, passed: true },
            ],
          };
        }
        if (rule.match.ext && rule.match.ext.includes(ext)) {
          return {
            matched: true,
            ruleName: rule.name,
            destination: rule.moveTo.replace('{year}', '2026').replace('{ext}', ext) + '/' + filename,
            reason: `matched rule ${rule.name}`,
            conditions: [
              { type: 'ext', pattern: `[${rule.match.ext.join(', ')}]`, passed: true },
            ],
          };
        }
      }
      return {
        matched: false,
        reason: 'no rule matched the criteria',
        conditions: [
          { type: 'ext', pattern: '[pdf, docx]', passed: false },
        ],
      };
    },
    async testRule(rule: RuleDTO, filename: string): Promise<RuleTestResultDTO> {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const conds: ConditionEvaluationDTO[] = [];
      let allPassed = true;
      if (rule.match.ext && rule.match.ext.length > 0) {
        const passed = rule.match.ext.includes(ext);
        if (!passed) allPassed = false;
        conds.push({ type: 'ext', pattern: `[${rule.match.ext.join(', ')}]`, passed });
      }
      if (rule.match.nameRegex) {
        const passed = new RegExp(rule.match.nameRegex.replace(/\(\?i\)/g, ''), 'i').test(filename);
        if (!passed) allPassed = false;
        conds.push({ type: 'name_regex', pattern: rule.match.nameRegex, passed });
      }
      return {
        matched: allPassed,
        ruleName: rule.name,
        destination: allPassed ? rule.moveTo.replace('{year}', '2026').replace('{ext}', ext) + '/' + filename : '',
        reason: allPassed ? `matched rule ${rule.name}` : 'conditions did not match',
        conditions: conds,
      };
    },
  },

  organize: {
    async preview(_opts?: PreviewOptionsDTO): Promise<PlanDTO> {
      return {
        planId: 'plan-mock-1234',
        items: [
          {
            id: 'plan-item-1',
            source: 'C:/Users/User/Downloads/' + longFilename1,
            dest: longPath1 + '/' + longFilename1,
            ruleName: 'Documents',
            skipped: false,
            reason: '',
          },
          {
            id: 'plan-item-2',
            source: 'C:/Users/User/Downloads/invoice_tech_corp_2026_04.pdf',
            dest: 'C:/Users/User/Documents/Finance/2026-04/invoice_tech_corp_2026_04.pdf',
            ruleName: 'Invoices',
            skipped: false,
            reason: '',
          },
          {
            id: 'plan-item-3',
            source: 'C:/Users/User/Downloads/video_gameplay.mp4.crdownload',
            dest: 'C:/Users/User/Videos/Sorted/2026/video_gameplay.mp4.crdownload',
            ruleName: 'Videos',
            skipped: true,
            reason: 'file is still being written (.crdownload)',
          },
          {
            id: 'plan-item-4',
            source: 'C:/Users/User/Downloads/' + longFilename2,
            dest: longPath2 + '/' + longFilename2,
            ruleName: 'Archives',
            skipped: false,
            reason: '',
          },
        ],
        total: 4,
        moveCount: 3,
        skipCount: 1,
      };
    },
    async run(req: RunRequestDTO): Promise<RunResultDTO> {
      const selected = req.selectedIds || ['plan-item-1', 'plan-item-2', 'plan-item-4'];
      return {
        batchId: 'batch-mock-' + Date.now(),
        moves: selected.map(id => ({
          id,
          source: 'C:/Users/User/Downloads/example.pdf',
          dest: 'C:/Users/User/Documents/Inbox/pdf/example.pdf',
          size: 1024 * 1024 * 2.5,
          ruleName: 'Documents',
          skipped: false,
          failed: false,
          reason: '',
        })),
        moved: selected.length,
        skipped: 0,
        failed: 0,
        unmatched: 0,
      };
    },
    async retryFile(sourcePath: string): Promise<MoveResultDTO> {
      return {
        id: 'retry-' + Date.now(),
        source: sourcePath,
        dest: 'C:/Users/User/Documents/Finance/2026-04/' + sourcePath.split(/[/\\]/).pop(),
        size: 1024 * 1024 * 2.5,
        ruleName: 'Invoices',
        skipped: false,
        failed: false,
        reason: '',
      };
    },
  },

  history: {
    async batches(_limit = 20, filter?: HistoryFilterDTO): Promise<BatchSummaryDTO[]> {
      let res = [...mockBatchSummaries];
      if (filter?.status === 'active' || filter?.status === 'applied') {
        res = res.filter(b => !b.allUndone);
      } else if (filter?.status === 'undone') {
        res = res.filter(b => b.allUndone);
      }
      return res;
    },
    async batch(id: string): Promise<BatchDetailDTO> {
      const summary = mockBatchSummaries.find(b => b.id === id) || mockBatchSummaries[0];
      return {
        summary,
        records: [
          {
            batchId: id,
            time: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
            source: 'C:/Users/User/Downloads/' + longFilename1,
            dest: longPath1 + '/' + longFilename1,
            rule: 'Invoices',
            size: 4500000,
            status: 'moved',
          },
          {
            batchId: id,
            time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            source: 'C:/Users/User/Downloads/IMG_2041_holiday_photo_family_camera.heic',
            dest: 'C:/Users/User/Pictures/Sorted/2026/IMG_2041.heic',
            rule: 'Images',
            size: 8900000,
            status: 'moved',
          },
          {
            batchId: id,
            time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            source: 'C:/Users/User/Downloads/setup_v3.2_installer_x64.exe',
            dest: 'C:/Users/User/Downloads/_Installers/setup_v3.2_installer_x64.exe',
            rule: 'Installers',
            size: 45000000,
            status: 'moved',
          },
          {
            batchId: id,
            time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            source: 'C:/Users/User/Downloads/' + longFilename2,
            dest: longPath2 + '/bundle.zip',
            rule: 'Archives',
            size: 154000000,
            status: 'moved',
          },
          {
            batchId: id,
            time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            source: 'C:/Users/User/Downloads/annual_financial_statements_2025.xlsx',
            dest: 'C:/Users/User/Documents/Finance/2025/annual_financial_statements_2025.xlsx',
            rule: 'Documents',
            size: 3200000,
            status: 'moved',
          },
          {
            batchId: id,
            time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            source: 'C:/Users/User/Downloads/podcast_recording_raw_take_02.wav',
            dest: 'C:/Users/User/Music/Recordings/2026/take_02.wav',
            rule: 'Audio',
            size: 85000000,
            status: 'moved',
          },
        ],
      };
    },
    async undoPreview(batchId: string): Promise<PlanDTO> {
      return {
        planId: 'undo-preview-' + batchId,
        items: [
          {
            id: 'undo-item-1',
            source: longPath1 + '/' + longFilename1,
            dest: 'C:/Users/User/Downloads/' + longFilename1,
            ruleName: 'undo',
            skipped: false,
            reason: '',
          },
          {
            id: 'undo-item-2',
            source: 'C:/Users/User/Pictures/Sorted/2026/IMG_2041.heic',
            dest: 'C:/Users/User/Downloads/IMG_2041_holiday_photo_family_camera.heic',
            ruleName: 'undo',
            skipped: false,
            reason: '',
          },
          {
            id: 'undo-item-3',
            source: 'C:/Users/User/Downloads/_Installers/setup_v3.2_installer_x64.exe',
            dest: 'C:/Users/User/Downloads/setup_v3.2_installer_x64.exe',
            ruleName: 'undo',
            skipped: false,
            reason: '',
          },
        ],
        total: 3,
        moveCount: 3,
        skipCount: 0,
      };
    },
    async undo(batchId: string): Promise<UndoResultDTO> {
      const b = mockBatchSummaries.find(x => x.id === batchId);
      if (b) {
        b.allUndone = true;
        b.undone = b.moved;
      }
      return {
        batchId,
        moves: [],
        restored: b ? b.moved : 1,
        skipped: 0,
        failed: 0,
        message: 'Successfully undone',
      };
    },
  },

  watch: {
    async start(): Promise<void> {
      mockWatchStatus.running = true;
    },
    async stop(): Promise<void> {
      mockWatchStatus.running = false;
    },
    async status(): Promise<WatchStatusDTO> {
      return { ...mockWatchStatus };
    },
    async reload(): Promise<void> {
      // reloaded
    },
  },

  system: {
    async version(): Promise<VersionInfo> {
      return {
        version: '0.3.0',
        commit: 'abcdef12',
        buildDate: '2026-10-28',
      };
    },
    async revealPath(_path: string): Promise<void> {
      console.log('[Mock] Reveal in file manager:', _path);
    },
    async openConfig(): Promise<void> {
      console.log('[Mock] Open config file in default editor');
    },
    async openHistory(): Promise<void> {
      console.log('[Mock] Open history log in default editor');
    },
    async pickFolder(): Promise<string | null> {
      return 'D:/Code/Projects';
    },
    async setAutostart(_enabled: boolean): Promise<void> {
      // no-op
    },
    async getAutostart(): Promise<boolean> {
      return false;
    },
    async countFiles(folderPath: string): Promise<number> {
      if (folderPath.includes('Downloads')) return 24;
      if (folderPath.includes('Desktop')) return 8;
      return 12;
    },
  },

  onEvent(name: string, callback: (payload: any) => void): () => void {
    if (!mockListeners.has(name)) {
      mockListeners.set(name, new Set());
    }
    mockListeners.get(name)!.add(callback);
    return () => {
      mockListeners.get(name)?.delete(callback);
    };
  },

  emit(name: string, payload: any): void {
    const handlers = mockListeners.get(name);
    if (handlers) {
      handlers.forEach(fn => fn(payload));
    }
  },
};
