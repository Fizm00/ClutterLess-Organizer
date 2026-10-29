// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { Folder, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { ClutterLessLogo } from '@/components/ClutterLessLogo';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useOnboardingStore } from '@/state/onboardingStore';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

export const Onboarding: React.FC = () => {
  const {
    step,
    watchFolders,
    ruleSet,
    autostart,
    loading,
    previewFiles,
    toggleFolder,
    setRuleSet,
    setAutostart,
    setStep,
    complete,
    skip,
  } = useOnboardingStore();

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6">
      <div
        className="w-full max-w-lg bg-card border rounded-lg flex flex-col overflow-hidden"
        data-testid="onboarding-panel"
      >
        {/* Step Indicator Header */}
        <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClutterLessLogo className="size-5 shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">
              {t('onboarding.step_indicator', { current: step, total: 3 })}
            </span>
          </div>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className={cn('h-1.5 w-6 rounded-full transition-colors', step >= 1 ? 'bg-primary' : 'bg-border')} />
            <div className={cn('h-1.5 w-6 rounded-full transition-colors', step >= 2 ? 'bg-primary' : 'bg-border')} />
            <div className={cn('h-1.5 w-6 rounded-full transition-colors', step >= 3 ? 'bg-primary' : 'bg-border')} />
          </div>
        </div>

        {/* Step 1: Watched Folders */}
        {step === 1 && (
          <div className="p-6 flex flex-col gap-6" data-testid="onboarding-step-1">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t('onboarding.step1_title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.step1_desc')}
              </p>
            </div>

            <div className="rounded-lg border divide-y overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFolder('~/Downloads')}
                className={cn(
                  'w-full text-left p-4 transition-colors flex items-start gap-3 cursor-pointer',
                  watchFolders.includes('~/Downloads') ? 'bg-muted/60' : 'hover:bg-muted/40'
                )}
                data-testid="folder-option-downloads"
              >
                <div
                  className={cn(
                    'size-4 rounded border flex items-center justify-center shrink-0 mt-0.5',
                    watchFolders.includes('~/Downloads')
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-transparent'
                  )}
                >
                  {watchFolders.includes('~/Downloads') && <Check className="size-3" />}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Folder className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {t('onboarding.step1_downloads')}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">~/Downloads</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('onboarding.step1_downloads_desc')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleFolder('~/Desktop')}
                className={cn(
                  'w-full text-left p-4 transition-colors flex items-start gap-3 cursor-pointer',
                  watchFolders.includes('~/Desktop') ? 'bg-muted/60' : 'hover:bg-muted/40'
                )}
                data-testid="folder-option-desktop"
              >
                <div
                  className={cn(
                    'size-4 rounded border flex items-center justify-center shrink-0 mt-0.5',
                    watchFolders.includes('~/Desktop')
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-transparent'
                  )}
                >
                  {watchFolders.includes('~/Desktop') && <Check className="size-3" />}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Folder className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {t('onboarding.step1_desktop')}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">~/Desktop</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('onboarding.step1_desktop_desc')}
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between border-t">
              <label htmlFor="autostart-toggle" className="text-sm text-muted-foreground cursor-pointer">
                {t('onboarding.autostart_option')}
              </label>
              <Switch
                id="autostart-toggle"
                checked={autostart}
                onCheckedChange={setAutostart}
              />
            </div>
          </div>
        )}

        {/* Step 2: Choose Ruleset */}
        {step === 2 && (
          <div className="p-6 flex flex-col gap-6" data-testid="onboarding-step-2">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t('onboarding.step2_title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.step2_desc')}
              </p>
            </div>

            <div className="rounded-lg border divide-y overflow-hidden">
              <button
                type="button"
                onClick={() => setRuleSet('recommended')}
                className={cn(
                  'w-full text-left p-4 transition-colors flex items-start gap-3 cursor-pointer',
                  ruleSet === 'recommended' ? 'bg-muted/60' : 'hover:bg-muted/40'
                )}
                data-testid="ruleset-option-recommended"
              >
                <div
                  className={cn(
                    'size-4 rounded border flex items-center justify-center shrink-0 mt-0.5',
                    ruleSet === 'recommended'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-transparent'
                  )}
                >
                  {ruleSet === 'recommended' && <Check className="size-3" />}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {t('onboarding.ruleset_recommended')}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {t('onboarding.ruleset_recommended_desc')}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Images', 'Documents', 'Videos', 'Music', 'Archives'].map(category => (
                      <Badge key={category} variant="secondary" className="font-normal">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRuleSet('empty')}
                className={cn(
                  'w-full text-left p-4 transition-colors flex items-start gap-3 cursor-pointer',
                  ruleSet === 'empty' ? 'bg-muted/60' : 'hover:bg-muted/40'
                )}
                data-testid="ruleset-option-empty"
              >
                <div
                  className={cn(
                    'size-4 rounded border flex items-center justify-center shrink-0 mt-0.5',
                    ruleSet === 'empty'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-transparent'
                  )}
                >
                  {ruleSet === 'empty' && <Check className="size-3" />}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {t('onboarding.ruleset_empty')}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {t('onboarding.ruleset_empty_desc')}
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Confirmation */}
        {step === 3 && (
          <div className="p-6 flex flex-col gap-6" data-testid="onboarding-step-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t('onboarding.step3_title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.step3_desc')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{t('onboarding.preview_summary', { count: previewFiles.length })}</span>
                <span className="font-mono">{watchFolders.join(', ')}</span>
              </div>

              {previewFiles.length === 0 ? (
                <div className="p-6 text-center rounded-lg border text-muted-foreground text-sm">
                  {t('onboarding.preview_empty')}
                </div>
              ) : (
                <div className="rounded-lg border divide-y overflow-hidden max-h-48 overflow-y-auto">
                  {previewFiles.map((file, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-mono text-xs text-foreground truncate">{file.name}</span>
                        <span className="font-mono text-xs text-muted-foreground truncate">
                          &rarr; {file.dest}
                        </span>
                      </div>
                      <Badge variant="secondary" className="font-normal shrink-0">
                        {file.rule}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Navigation Bar */}
        <div className="p-6 pt-4 border-t flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              data-testid="onboarding-btn-back"
            >
              <ArrowLeft className="size-4 text-muted-foreground" />
              {t('onboarding.btn_back')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={skip}
              disabled={loading}
              data-testid="onboarding-btn-skip"
            >
              {t('onboarding.btn_skip')}
            </Button>
          )}

          <div className="flex items-center gap-2">
            {step === 3 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => void complete(false)}
                  disabled={loading}
                  data-testid="onboarding-btn-skip-for-now"
                >
                  {t('onboarding.btn_skip_for_now')}
                </Button>
                <Button
                  variant="default"
                  onClick={() => void complete(true)}
                  disabled={loading}
                  data-testid="onboarding-btn-organize"
                >
                  {t('onboarding.btn_organize_now')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={skip}
                  disabled={loading}
                  data-testid="onboarding-btn-skip-step"
                >
                  {t('onboarding.btn_skip_step')}
                </Button>
                <Button
                  variant="default"
                  onClick={handleNext}
                  disabled={loading || (step === 1 && watchFolders.length === 0)}
                  data-testid="onboarding-btn-continue"
                >
                  {t('onboarding.btn_continue')}
                  <ArrowRight className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
