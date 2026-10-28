// SPDX-License-Identifier: AGPL-3.0-only

export interface VersionInfo {
  version: string;
  commit: string;
  buildDate: string;
}

export interface WatchEntryDTO {
  path: string;
  recursive: boolean;
}

export interface SettingsDTO {
  stableAfterSeconds: number;
  conflict: string;
  fallbackDir: string;
  ignoreHidden: boolean;
  ignoreExt: string[];
  ignoreNames: string[];
  closeToTray?: boolean;
  notificationsEnabled?: boolean;
  autostart?: boolean;
  onboardingCompleted?: boolean;
}

export interface OnboardingRequest {
  watchFolders: string[];
  ruleSet: 'recommended' | 'empty';
  autostart: boolean;
}

export interface MatchDTO {
  ext?: string[];
  nameGlob?: string[];
  nameRegex?: string;
  minSize?: string;
  maxSize?: string;
  olderThan?: string;
}

export interface RuleDTO {
  name: string;
  disabled?: boolean;
  moveTo: string;
  match: MatchDTO;
}

export interface ConfigDTO {
  settings: SettingsDTO;
  watch: WatchEntryDTO[];
  rules: RuleDTO[];
}

export interface ValidationErrorDTO {
  field: string;
  message: string;
}

export interface ConditionEvaluationDTO {
  type: string;
  pattern: string;
  passed: boolean;
  details?: string;
}

export interface RuleTestResultDTO {
  matched: boolean;
  ruleName?: string;
  destination?: string;
  reason: string;
  conditions?: ConditionEvaluationDTO[];
}

export interface FolderWarningDTO {
  folderPath: string;
  ruleName: string;
  moveTo: string;
  message: string;
}

export interface PreviewOptionsDTO {
  dir?: string;
}

export interface PlanItemDTO {
  id: string;
  source: string;
  dest: string;
  ruleName: string;
  skipped: boolean;
  reason: string;
}

export interface PlanDTO {
  planId: string;
  items: PlanItemDTO[];
  total: number;
  moveCount: number;
  skipCount: number;
}

export interface RunRequestDTO {
  planId?: string;
  selectedIds?: string[];
  dir?: string;
}

export interface MoveResultDTO {
  id: string;
  source: string;
  dest: string;
  size: number;
  ruleName: string;
  skipped: boolean;
  failed: boolean;
  reason: string;
}

export interface RunResultDTO {
  batchId: string;
  moves: MoveResultDTO[];
  moved: number;
  skipped: number;
  failed: number;
  unmatched: number;
}

export interface HistoryFilterDTO {
  query?: string;
  status?: string; // "all", "active", "undone"
  since?: string;
  until?: string;
}

export interface BatchSummaryDTO {
  id: string;
  time: string;
  total: number;
  moved: number;
  undone: number;
  allUndone: boolean;
}

export interface RecordDTO {
  batchId: string;
  time: string;
  source: string;
  dest: string;
  rule: string;
  size: number;
  status: string;
}

export interface BatchDetailDTO {
  summary: BatchSummaryDTO;
  records: RecordDTO[];
}

export interface UndoMoveResultDTO {
  originalSource: string;
  currentDest: string;
  restoredTo?: string;
  skipped: boolean;
  failed: boolean;
  reason: string;
}

export interface UndoResultDTO {
  batchId: string;
  moves: UndoMoveResultDTO[];
  restored: number;
  skipped: number;
  failed: number;
  message: string;
}

export interface WatchStatusDTO {
  running: boolean;
  folders: string[];
  error?: string;
}

export interface ConfigApi {
  get(): Promise<ConfigDTO>;
  validate(dto: ConfigDTO): Promise<ValidationErrorDTO[]>;
  save(dto: ConfigDTO): Promise<void>;
  path(): Promise<string>;
  resetToDefaults(): Promise<void>;
  getFolderWarnings(): Promise<FolderWarningDTO[]>;
  isFirstRun(): Promise<boolean>;
  completeOnboarding(req: OnboardingRequest): Promise<void>;
}

export interface RulesApi {
  list(): Promise<RuleDTO[]>;
  upsert(rule: RuleDTO): Promise<void>;
  delete(name: string): Promise<void>;
  reorder(names: string[]): Promise<void>;
  test(filename: string): Promise<RuleTestResultDTO>;
  testRule(rule: RuleDTO, filename: string): Promise<RuleTestResultDTO>;
}

export interface OrganizeApi {
  preview(opts?: PreviewOptionsDTO): Promise<PlanDTO>;
  run(req: RunRequestDTO): Promise<RunResultDTO>;
  retryFile(sourcePath: string): Promise<MoveResultDTO>;
}

export interface HistoryApi {
  batches(limit?: number, filter?: HistoryFilterDTO): Promise<BatchSummaryDTO[]>;
  batch(id: string): Promise<BatchDetailDTO>;
  undoPreview(batchId: string): Promise<PlanDTO>;
  undo(batchId: string): Promise<UndoResultDTO>;
}

export interface WatchApi {
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<WatchStatusDTO>;
  reload(): Promise<void>;
}

export interface SystemApi {
  version(): Promise<VersionInfo>;
  revealPath(path: string): Promise<void>;
  openConfig(): Promise<void>;
  pickFolder(): Promise<string | null>;
  setAutostart(enabled: boolean): Promise<void>;
  getAutostart(): Promise<boolean>;
  countFiles(folderPath: string): Promise<number>;
}

export interface Api {
  config: ConfigApi;
  rules: RulesApi;
  organize: OrganizeApi;
  history: HistoryApi;
  watch: WatchApi;
  system: SystemApi;
  onEvent(name: string, callback: (payload: any) => void): () => void;
}
