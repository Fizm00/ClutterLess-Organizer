// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, AlertTriangle, FileCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TagInput } from '../TagInput';
import { RuleTester } from '../RuleTester';
import { useRulesStore } from '@/state/rulesStore';
import type { RuleDTO } from '@/api/types';
import { t } from '@/i18n';

const TEMPLATE_VARS = ['{year}', '{month}', '{day}', '{ext}', '{name}'] as const;

type ConditionType = 'ext' | 'nameGlob' | 'nameRegex' | 'minSize' | 'maxSize' | 'olderThan';

interface ConditionOption {
  type: ConditionType;
  label: string;
}

const ALL_CONDITIONS: ConditionOption[] = [
  { type: 'ext', label: 'Extensions' },
  { type: 'nameGlob', label: 'File name glob' },
  { type: 'nameRegex', label: 'File name regex' },
  { type: 'minSize', label: 'Min size' },
  { type: 'maxSize', label: 'Max size' },
  { type: 'olderThan', label: 'Older than' },
];

export const RuleEditor: React.FC = () => {
  const {
    editingRule,
    isNewRule,
    externalChangeDetected,
    validationErrors,
    closeEditor,
    saveRule,
    validateDraftRule,
  } = useRulesStore();

  const [draft, setDraft] = useState<RuleDTO | null>(null);
  const [showYaml, setShowYaml] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [saving, setSaving] = useState(false);
  const destInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingRule) {
      setDraft(JSON.parse(JSON.stringify(editingRule)));
      setShowYaml(false);
      setShowTester(false);
    } else {
      setDraft(null);
    }
  }, [editingRule]);

  useEffect(() => {
    if (draft) {
      const timer = setTimeout(() => {
        void validateDraftRule(draft);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [draft, validateDraftRule]);

  const activeConditionTypes = useMemo(() => {
    if (!draft) return [];
    const types: ConditionType[] = [];
    if (draft.match.ext && draft.match.ext.length > 0) types.push('ext');
    if (draft.match.nameGlob && draft.match.nameGlob.length > 0) types.push('nameGlob');
    if (draft.match.nameRegex !== undefined && draft.match.nameRegex !== '') types.push('nameRegex');
    if (draft.match.minSize !== undefined && draft.match.minSize !== '') types.push('minSize');
    if (draft.match.maxSize !== undefined && draft.match.maxSize !== '') types.push('maxSize');
    if (draft.match.olderThan !== undefined && draft.match.olderThan !== '') types.push('olderThan');
    return types;
  }, [draft]);

  const availableConditions = useMemo(() => {
    return ALL_CONDITIONS.filter(c => !activeConditionTypes.includes(c.type));
  }, [activeConditionTypes]);

  const resolvedSampleDest = useMemo(() => {
    if (!draft || !draft.moveTo) return '';
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const ext = draft.match?.ext?.[0] || 'pdf';
    const name = 'sample_file';

    const rendered = draft.moveTo
      .replace(/{year}/g, year)
      .replace(/{month}/g, month)
      .replace(/{day}/g, day)
      .replace(/{ext}/g, ext)
      .replace(/{name}/g, name);

    return `${rendered}/${name}.${ext}`;
  }, [draft]);

  const yamlRepresentation = useMemo(() => {
    if (!draft) return '';
    const lines = [`- name: ${draft.name || 'Untitled'}`];
    if (draft.disabled) {
      lines.push('  disabled: true');
    }
    lines.push('  match:');
    if (draft.match.ext && draft.match.ext.length > 0) {
      lines.push(`    ext: [${draft.match.ext.join(', ')}]`);
    }
    if (draft.match.nameGlob && draft.match.nameGlob.length > 0) {
      lines.push(`    name_glob: [${draft.match.nameGlob.join(', ')}]`);
    }
    if (draft.match.nameRegex) {
      lines.push(`    name_regex: "${draft.match.nameRegex}"`);
    }
    if (draft.match.minSize) {
      lines.push(`    min_size: ${draft.match.minSize}`);
    }
    if (draft.match.maxSize) {
      lines.push(`    max_size: ${draft.match.maxSize}`);
    }
    if (draft.match.olderThan) {
      lines.push(`    older_than: ${draft.match.olderThan}`);
    }
    lines.push(`  move_to: ${draft.moveTo || ''}`);
    return lines.join('\n');
  }, [draft]);

  if (!editingRule || !draft) {
    return null;
  }

  const addCondition = (type: ConditionType) => {
    const nextMatch = { ...draft.match };
    switch (type) {
      case 'ext':
        nextMatch.ext = ['pdf'];
        break;
      case 'nameGlob':
        nextMatch.nameGlob = ['*report*'];
        break;
      case 'nameRegex':
        nextMatch.nameRegex = '(?i)(invoice)';
        break;
      case 'minSize':
        nextMatch.minSize = '1MB';
        break;
      case 'maxSize':
        nextMatch.maxSize = '100MB';
        break;
      case 'olderThan':
        nextMatch.olderThan = '30d';
        break;
    }
    setDraft({ ...draft, match: nextMatch });
  };

  const removeCondition = (type: ConditionType) => {
    const nextMatch = { ...draft.match };
    switch (type) {
      case 'ext':
        delete nextMatch.ext;
        break;
      case 'nameGlob':
        delete nextMatch.nameGlob;
        break;
      case 'nameRegex':
        delete nextMatch.nameRegex;
        break;
      case 'minSize':
        delete nextMatch.minSize;
        break;
      case 'maxSize':
        delete nextMatch.maxSize;
        break;
      case 'olderThan':
        delete nextMatch.olderThan;
        break;
    }
    setDraft({ ...draft, match: nextMatch });
  };

  const insertTemplateVar = (variable: string) => {
    const input = destInputRef.current;
    if (!input) {
      setDraft({ ...draft, moveTo: (draft.moveTo || '') + variable });
      return;
    }
    const start = input.selectionStart || draft.moveTo.length;
    const end = input.selectionEnd || draft.moveTo.length;
    const nextVal = draft.moveTo.slice(0, start) + variable + draft.moveTo.slice(end);
    setDraft({ ...draft, moveTo: nextVal });
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draft.name.trim() || !draft.moveTo.trim()) {
      return;
    }
    setSaving(true);
    try {
      const ok = await saveRule(draft);
      if (ok) {
        closeEditor();
      }
    } finally {
      setSaving(false);
    }
  };

  const nameError = validationErrors.find(
    e => e.field.includes('name') || e.message.toLowerCase().includes('rule name')
  );
  const matchError = validationErrors.find(
    e => e.message.toLowerCase().includes('condition') || e.message.toLowerCase().includes('regex')
  );
  const destError = validationErrors.find(
    e =>
      e.field.includes('move_to') ||
      e.message.toLowerCase().includes('move_to') ||
      e.message.includes('template')
  );

  return (
    <Dialog
      open={true}
      onOpenChange={open => {
        if (!open) closeEditor();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="flex flex-row items-center justify-between pr-6">
          <DialogTitle>{isNewRule ? t('editor.title_new') : t('editor.title_edit')}</DialogTitle>
          <Button
            type="button"
            variant={showYaml ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => setShowYaml(!showYaml)}
            aria-label="Toggle YAML View"
          >
            <FileCode className="size-4 text-muted-foreground" />
            <span>{t('editor.yaml_toggle')}</span>
          </Button>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {externalChangeDetected && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{t('editor.external_change_warning')}</AlertDescription>
            </Alert>
          )}

          {showYaml ? (
            <div className="rounded-lg border bg-muted/50 p-4 font-mono text-xs text-foreground whitespace-pre overflow-x-auto select-all">
              {yamlRepresentation}
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Rule Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rule-name-input">{t('editor.name_label')}</Label>
                <Input
                  id="rule-name-input"
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  placeholder={t('editor.name_placeholder')}
                  aria-invalid={Boolean(nameError)}
                  autoFocus={isNewRule}
                />
                {nameError && (
                  <span className="text-xs text-destructive">{nameError.message}</span>
                )}
              </div>

              {/* Match Conditions */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <Label>{t('editor.match_header')}</Label>
                    <span className="text-xs text-muted-foreground">
                      {t('editor.match_and_notice')}
                    </span>
                  </div>

                  {availableConditions.length > 0 && (
                    <select
                      className="h-8 rounded-md border border-input bg-transparent px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                      onChange={e => {
                        if (e.target.value) {
                          addCondition(e.target.value as ConditionType);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      aria-label={t('editor.add_condition')}
                    >
                      <option value="" disabled>
                        + {t('editor.add_condition')}
                      </option>
                      {availableConditions.map(c => (
                        <option key={c.type} value={c.type}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-2 rounded-lg border p-3">
                  {activeConditionTypes.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2">
                      No match conditions added yet. Select &quot;Add condition&quot; above.
                    </div>
                  ) : (
                    activeConditionTypes.map(type => (
                      <div key={type} className="flex items-start gap-2 py-1">
                        <span className="w-28 shrink-0 text-xs text-muted-foreground pt-2 font-medium">
                          {ALL_CONDITIONS.find(c => c.type === type)?.label}:
                        </span>

                        <div className="flex-1 min-w-0">
                          {type === 'ext' && (
                            <TagInput
                              tags={draft.match.ext || []}
                              onChange={tags =>
                                setDraft({ ...draft, match: { ...draft.match, ext: tags } })
                              }
                              placeholder="e.g. pdf, docx, xlsx"
                            />
                          )}
                          {type === 'nameGlob' && (
                            <Input
                              value={(draft.match.nameGlob || []).join(', ')}
                              onChange={e =>
                                setDraft({
                                  ...draft,
                                  match: {
                                    ...draft.match,
                                    nameGlob: e.target.value
                                      .split(',')
                                      .map(s => s.trim())
                                      .filter(Boolean),
                                  },
                                })
                              }
                              placeholder="e.g. *.pdf, report_*"
                              className="font-mono text-xs"
                            />
                          )}
                          {type === 'nameRegex' && (
                            <Input
                              value={draft.match.nameRegex || ''}
                              onChange={e =>
                                setDraft({
                                  ...draft,
                                  match: { ...draft.match, nameRegex: e.target.value },
                                })
                              }
                              placeholder="e.g. (?i)(invoice|receipt|faktur)"
                              className="font-mono text-xs"
                            />
                          )}
                          {type === 'minSize' && (
                            <Input
                              value={draft.match.minSize || ''}
                              onChange={e =>
                                setDraft({
                                  ...draft,
                                  match: { ...draft.match, minSize: e.target.value },
                                })
                              }
                              placeholder="e.g. 500KB, 1MB, 2GB"
                              className="font-mono text-xs"
                            />
                          )}
                          {type === 'maxSize' && (
                            <Input
                              value={draft.match.maxSize || ''}
                              onChange={e =>
                                setDraft({
                                  ...draft,
                                  match: { ...draft.match, maxSize: e.target.value },
                                })
                              }
                              placeholder="e.g. 100MB, 5GB"
                              className="font-mono text-xs"
                            />
                          )}
                          {type === 'olderThan' && (
                            <Input
                              value={draft.match.olderThan || ''}
                              onChange={e =>
                                setDraft({
                                  ...draft,
                                  match: { ...draft.match, olderThan: e.target.value },
                                })
                              }
                              placeholder="e.g. 30d, 12h, 2w"
                              className="font-mono text-xs"
                            />
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeCondition(type)}
                          aria-label={`Remove condition ${type}`}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {matchError && (
                  <span className="text-xs text-destructive">{matchError.message}</span>
                )}
              </div>

              {/* Destination */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="destination-input">{t('editor.dest_label')}</Label>
                <Input
                  id="destination-input"
                  ref={destInputRef}
                  value={draft.moveTo}
                  onChange={e => setDraft({ ...draft, moveTo: e.target.value })}
                  placeholder={t('editor.dest_placeholder')}
                  aria-invalid={Boolean(destError)}
                  className="font-mono text-xs"
                />
                {destError && (
                  <span className="text-xs text-destructive">{destError.message}</span>
                )}

                {/* Template chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">Insert template:</span>
                  {TEMPLATE_VARS.map(v => (
                    <Badge
                      key={v}
                      variant="outline"
                      asChild
                      className="cursor-pointer font-mono text-xs hover:bg-accent"
                    >
                      <button type="button" onClick={() => insertTemplateVar(v)}>
                        {v}
                      </button>
                    </Badge>
                  ))}
                </div>

                {resolvedSampleDest && (
                  <div className="text-xs text-muted-foreground truncate">
                    Sample preview:{' '}
                    <span className="font-mono text-foreground">{resolvedSampleDest}</span>
                  </div>
                )}
              </div>

              {showTester && (
                <div className="pt-2 border-t">
                  <RuleTester targetRule={draft} onClose={() => setShowTester(false)} />
                </div>
              )}
            </form>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTester(!showTester)}
          >
            {t('editor.test_button')}
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={closeEditor}>
              {t('action.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !draft.name.trim() || !draft.moveTo.trim()}
            >
              {saving ? 'Saving...' : t('action.save_rule')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
