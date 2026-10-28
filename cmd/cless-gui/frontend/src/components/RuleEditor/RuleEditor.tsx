// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, AlertTriangle, FileCode } from 'lucide-react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { Input } from '../Input';
import { TagInput } from '../TagInput';
import { RuleTester } from '../RuleTester';
import { useRulesStore } from '../../state/rulesStore';
import type { RuleDTO } from '../../api/types';
import { t } from '../../i18n';

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

  // Live validation on draft change using Go Validate
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

  // Sample destination preview
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

  // Convert draft to YAML representation for read-only view
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

  // Find validation error matching specific fields
  const nameError = validationErrors.find(
    e => e.field.includes('name') || e.message.toLowerCase().includes('rule name')
  );
  const matchError = validationErrors.find(
    e => e.message.toLowerCase().includes('condition') || e.message.toLowerCase().includes('regex')
  );
  const destError = validationErrors.find(
    e => e.field.includes('move_to') || e.message.toLowerCase().includes('move_to') || e.message.includes('template')
  );

  return (
    <Dialog
      open={true}
      onOpenChange={open => {
        if (!open) closeEditor();
      }}
      title={isNewRule ? t('editor.title_new') : t('editor.title_edit')}
      width="wide"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTester(!showTester)}
            className="text-xs"
          >
            {t('editor.test_button')}
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="default" onClick={closeEditor}>
              {t('action.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="default"
              onClick={handleSave}
              disabled={saving || !draft.name.trim() || !draft.moveTo.trim()}
            >
              {saving ? 'Saving...' : t('action.save_rule')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Top actions: YAML toggle */}
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant={showYaml ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowYaml(!showYaml)}
            className="text-xs h-7 gap-1.5"
            aria-label="Toggle YAML View"
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>{t('editor.yaml_toggle')}</span>
          </Button>
        </div>

        {externalChangeDetected && (
          <div className="p-3 rounded-sm bg-danger/10 border-l-2 border-danger flex items-start gap-2.5 text-xs text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{t('editor.external_change_warning')}</div>
          </div>
        )}

        {showYaml ? (
          <div className="rounded-sm border border-border bg-bg-raised p-4 font-mono text-xs text-text-primary whitespace-pre overflow-x-auto select-all">
            {yamlRepresentation}
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* Rule Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rule-name-input" className="text-xs font-medium text-text-secondary">
                {t('editor.name_label')}
              </label>
              <Input
                id="rule-name-input"
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                placeholder={t('editor.name_placeholder')}
                error={nameError?.message}
                autoFocus={isNewRule}
              />
            </div>

            {/* Match Conditions */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    {t('editor.match_header')}
                  </label>
                  <div className="text-caption text-text-muted">{t('editor.match_and_notice')}</div>
                </div>

                {availableConditions.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      className="h-7 rounded-sm border border-border bg-bg-surface px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
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
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-sm border border-border bg-bg-surface p-3">
                {activeConditionTypes.length === 0 ? (
                  <div className="text-xs text-text-muted py-2 text-center">
                    No match conditions added yet. Select &quot;Add condition&quot; above.
                  </div>
                ) : (
                  activeConditionTypes.map(type => (
                    <div key={type} className="flex items-start gap-2 pt-1 pb-1">
                      <span className="w-28 shrink-0 text-xs text-text-secondary pt-2 font-medium">
                        {ALL_CONDITIONS.find(c => c.type === type)?.label}:
                      </span>

                      <div className="flex-1 min-w-0">
                        {type === 'ext' && (
                          <TagInput
                            tags={draft.match.ext || []}
                            onChange={tags => setDraft({ ...draft, match: { ...draft.match, ext: tags } })}
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
                        size="icon"
                        onClick={() => removeCondition(type)}
                        className="text-text-muted hover:text-danger h-8 w-8 p-0"
                        aria-label={`Remove condition ${type}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {matchError && (
                <span className="text-xs text-danger font-medium">{matchError.message}</span>
              )}
            </div>

            {/* Destination */}
            <div className="flex flex-col gap-2">
              <label htmlFor="destination-input" className="text-xs font-medium text-text-secondary">
                {t('editor.dest_label')}
              </label>
              <Input
                id="destination-input"
                ref={destInputRef}
                value={draft.moveTo}
                onChange={e => setDraft({ ...draft, moveTo: e.target.value })}
                placeholder={t('editor.dest_placeholder')}
                error={destError?.message}
                className="font-mono text-xs"
              />

              {/* Template chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-caption text-text-muted">Insert template:</span>
                {TEMPLATE_VARS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertTemplateVar(v)}
                    className="rounded-xs border border-border bg-bg-surface px-1.5 py-0.5 text-xs font-mono text-accent hover:bg-bg-raised hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Live sample preview */}
              {resolvedSampleDest && (
                <div className="text-caption text-text-muted font-mono truncate bg-bg-raised/50 rounded-xs p-1.5 border border-border/50">
                  Sample preview: <span className="text-text-primary">{resolvedSampleDest}</span>
                </div>
              )}
            </div>

            {/* Tester Inline within Dialog */}
            {showTester && (
              <div className="pt-2 border-t border-border">
                <RuleTester targetRule={draft} onClose={() => setShowTester(false)} />
              </div>
            )}
          </form>
        )}
      </div>
    </Dialog>
  );
};
