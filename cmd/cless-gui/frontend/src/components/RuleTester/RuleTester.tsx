// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useRulesStore } from '@/state/rulesStore';
import type { RuleDTO, RuleTestResultDTO } from '@/api/types';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

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
    <div className={cn('flex flex-col gap-3 w-full', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">{t('tester.title')}</h2>
        {onClose && (
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label={t('action.close')}>
            <X className="size-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      <form onSubmit={handleTest} className="flex items-center gap-2 max-w-xl">
        <Input
          value={filename}
          onChange={e => setFilename(e.target.value)}
          placeholder={t('tester.placeholder')}
          className="font-mono text-xs flex-1"
          aria-label={t('tester.title')}
        />
        <Button type="submit" variant="outline" size="default" disabled={loading || !filename.trim()}>
          {loading ? 'Testing...' : t('tester.test_button')}
        </Button>
      </form>

      {result && (
        <div className="flex flex-col gap-2.5 text-sm pt-1 max-w-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={result.matched ? 'secondary' : 'outline'}>
                {result.matched ? 'Matched' : 'Unmatched'}
              </Badge>
              {result.ruleName && (
                <span className="font-medium text-foreground">
                  Rule &quot;{result.ruleName}&quot;
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{result.reason}</span>
          </div>

          {result.destination && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-mono text-xs text-foreground select-all truncate">
                {result.destination}
              </span>
            </div>
          )}

          {result.conditions && result.conditions.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-sm text-muted-foreground">{t('tester.conditions_header')}</span>
              <div className="rounded-lg border divide-y">
                {result.conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between h-9 px-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {cond.passed ? (
                        <Check className="size-4 text-muted-foreground" />
                      ) : (
                        <X className="size-4 text-destructive" />
                      )}
                      <span className="text-muted-foreground">{cond.type}:</span>
                      <span className="font-mono text-xs text-foreground">{cond.pattern}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
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
