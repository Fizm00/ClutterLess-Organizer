// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState } from 'react';
import { Check, X, Search, FileText } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { Badge } from '../Badge';
import { useRulesStore } from '../../state/rulesStore';
import type { RuleDTO, RuleTestResultDTO } from '../../api/types';
import { t } from '../../i18n';
import { cn } from '../../lib/utils';

export interface RuleTesterProps {
  targetRule?: RuleDTO;
  onClose?: () => void;
  className?: string;
  initialFilename?: string;
}

export const RuleTester: React.FC<RuleTesterProps> = ({
  targetRule,
  onClose,
  className,
  initialFilename = 'invoice_tech_corp_2026_04.pdf',
}) => {
  const [filename, setFilename] = useState(initialFilename);
  const [result, setResult] = useState<RuleTestResultDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const { testFile, testDraftRule } = useRulesStore();

  const handleTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!filename.trim()) return;

    setLoading(true);
    try {
      let res: RuleTestResultDTO;
      if (targetRule) {
        res = await testDraftRule(targetRule, filename.trim());
      } else {
        res = await testFile(filename.trim());
      }
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('rounded-md border border-border bg-bg-surface p-4 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-medium text-text-primary">{t('tester.title')}</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('action.close')}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleTest} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={filename}
            onChange={e => setFilename(e.target.value)}
            placeholder={t('tester.placeholder')}
            className="pl-8 font-mono text-xs"
            aria-label={t('tester.title')}
          />
        </div>
        <Button type="submit" variant="secondary" size="default" disabled={loading || !filename.trim()}>
          {loading ? 'Testing...' : t('tester.test_button')}
        </Button>
      </form>

      {result && (
        <div className="rounded-sm border border-border bg-bg-raised p-3 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge state={result.matched ? 'applied' : undefined}>
                {result.matched ? 'Matched' : 'Unmatched'}
              </Badge>
              {result.ruleName && (
                <span className="font-medium text-text-primary">
                  Rule &quot;{result.ruleName}&quot;
                </span>
              )}
            </div>
            <span className="text-text-muted">{result.reason}</span>
          </div>

          {result.destination && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <span className="text-text-secondary font-medium">Destination:</span>
              <span className="font-mono text-text-primary select-all truncate">{result.destination}</span>
            </div>
          )}

          {result.conditions && result.conditions.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
              <span className="text-text-muted font-medium">{t('tester.conditions_header')}</span>
              <div className="flex flex-col gap-1">
                {result.conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xs px-2 py-1 bg-bg-surface border border-border"
                  >
                    <div className="flex items-center gap-2">
                      {cond.passed ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
                      ) : (
                        <X className="h-3.5 w-3.5 text-danger" strokeWidth={2.5} />
                      )}
                      <span className="font-mono text-text-secondary">{cond.type}:</span>
                      <span className="font-mono text-text-primary">{cond.pattern}</span>
                    </div>
                    <span className={cn('text-caption font-medium', cond.passed ? 'text-emerald-500' : 'text-text-muted')}>
                      {cond.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
