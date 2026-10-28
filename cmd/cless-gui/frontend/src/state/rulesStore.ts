// SPDX-License-Identifier: AGPL-3.0-only
import { create } from 'zustand';
import { api } from '../api';
import type { RuleDTO, ValidationErrorDTO, RuleTestResultDTO } from '../api/types';
import { toast } from '../components/Toast';
import { t } from '../i18n';

interface RulesState {
  rules: RuleDTO[];
  loading: boolean;
  error: string | null;
  editingRule: RuleDTO | null;
  isNewRule: boolean;
  externalChangeDetected: boolean;
  validationErrors: ValidationErrorDTO[];
  testResult: RuleTestResultDTO | null;
  testing: boolean;

  fetchRules: () => Promise<void>;
  openEditor: (rule?: RuleDTO) => void;
  closeEditor: () => void;
  setExternalChangeDetected: (detected: boolean) => void;
  validateDraftRule: (rule: RuleDTO) => Promise<ValidationErrorDTO[]>;
  saveRule: (rule: RuleDTO) => Promise<boolean>;
  deleteRule: (name: string) => Promise<boolean>;
  duplicateRule: (rule: RuleDTO) => Promise<boolean>;
  toggleRule: (name: string) => Promise<void>;
  reorderRules: (names: string[]) => Promise<void>;
  testFile: (filename: string) => Promise<RuleTestResultDTO>;
  testDraftRule: (rule: RuleDTO, filename: string) => Promise<RuleTestResultDTO>;
  clearTestResult: () => void;
}

export const useRulesStore = create<RulesState>((set, get) => ({
  rules: [],
  loading: false,
  error: null,
  editingRule: null,
  isNewRule: false,
  externalChangeDetected: false,
  validationErrors: [],
  testResult: null,
  testing: false,

  fetchRules: async () => {
    set({ loading: true, error: null });
    try {
      const rules = await api.rules.list();
      set({ rules, loading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch rules', loading: false });
    }
  },

  openEditor: (rule?: RuleDTO) => {
    if (rule) {
      set({
        editingRule: JSON.parse(JSON.stringify(rule)),
        isNewRule: false,
        externalChangeDetected: false,
        validationErrors: [],
      });
    } else {
      set({
        editingRule: {
          name: '',
          disabled: false,
          moveTo: '',
          match: {},
        },
        isNewRule: true,
        externalChangeDetected: false,
        validationErrors: [],
      });
    }
  },

  closeEditor: () => {
    set({
      editingRule: null,
      isNewRule: false,
      externalChangeDetected: false,
      validationErrors: [],
    });
  },

  setExternalChangeDetected: (detected: boolean) => {
    set({ externalChangeDetected: detected });
  },

  validateDraftRule: async (rule: RuleDTO) => {
    try {
      const cfg = await api.config.get();
      // Replace or append draft rule to validate against full config rules
      const rules = [...cfg.rules];
      const existingIdx = rules.findIndex(r => r.name.toLowerCase() === rule.name.toLowerCase());
      if (existingIdx >= 0) {
        rules[existingIdx] = rule;
      } else {
        rules.push(rule);
      }
      const testConfig = { ...cfg, rules };
      const errors = await api.config.validate(testConfig);
      // Filter errors relevant to this rule
      const relevantErrors = errors.filter(e => {
        return (
          e.message.toLowerCase().includes(rule.name.toLowerCase()) ||
          e.field.includes('rules') ||
          e.message.includes('rule')
        );
      });
      set({ validationErrors: relevantErrors });
      return relevantErrors;
    } catch {
      return [];
    }
  },

  saveRule: async (rule: RuleDTO) => {
    try {
      await api.rules.upsert(rule);
      toast.show(t('toast.rule_saved'));
      get().closeEditor();
      await get().fetchRules();
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Failed to save rule';
      toast.show('Config invalid: ' + msg);
      return false;
    }
  },

  deleteRule: async (name: string) => {
    try {
      await api.rules.delete(name);
      toast.show(t('toast.rule_deleted'));
      await get().fetchRules();
      return true;
    } catch (err: any) {
      toast.show('Failed to delete rule: ' + (err?.message || ''));
      return false;
    }
  },

  duplicateRule: async (rule: RuleDTO) => {
    const baseName = rule.name + ' (Copy)';
    let newName = baseName;
    const existing = new Set(get().rules.map(r => r.name.toLowerCase()));
    let counter = 2;
    while (existing.has(newName.toLowerCase())) {
      newName = `${rule.name} (Copy ${counter})`;
      counter++;
    }

    const cloned: RuleDTO = {
      ...JSON.parse(JSON.stringify(rule)),
      name: newName,
    };
    return get().saveRule(cloned);
  },

  toggleRule: async (name: string) => {
    const rule = get().rules.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (!rule) return;
    const updated: RuleDTO = {
      ...rule,
      disabled: !rule.disabled,
    };
    try {
      await api.rules.upsert(updated);
      await get().fetchRules();
    } catch (err: any) {
      toast.show('Failed to update rule: ' + (err?.message || ''));
    }
  },

  reorderRules: async (names: string[]) => {
    // Optimistic local update
    const ruleMap = new Map(get().rules.map(r => [r.name.toLowerCase(), r]));
    const next: RuleDTO[] = [];
    for (const n of names) {
      const found = ruleMap.get(n.toLowerCase());
      if (found) {
        next.push(found);
        ruleMap.delete(n.toLowerCase());
      }
    }
    for (const rem of ruleMap.values()) {
      next.push(rem);
    }
    set({ rules: next });

    try {
      await api.rules.reorder(names);
    } catch (err: any) {
      toast.show('Failed to reorder rules: ' + (err?.message || ''));
      await get().fetchRules();
    }
  },

  testFile: async (filename: string) => {
    set({ testing: true });
    try {
      const res = await api.rules.test(filename);
      set({ testResult: res, testing: false });
      return res;
    } catch (err: any) {
      const fallback: RuleTestResultDTO = {
        matched: false,
        reason: err?.message || 'Evaluation failed',
      };
      set({ testResult: fallback, testing: false });
      return fallback;
    }
  },

  testDraftRule: async (rule: RuleDTO, filename: string) => {
    set({ testing: true });
    try {
      const res = await api.rules.testRule(rule, filename);
      set({ testResult: res, testing: false });
      return res;
    } catch (err: any) {
      const fallback: RuleTestResultDTO = {
        matched: false,
        reason: err?.message || 'Evaluation failed',
      };
      set({ testResult: fallback, testing: false });
      return fallback;
    }
  },

  clearTestResult: () => {
    set({ testResult: null, testing: false });
  },
}));
