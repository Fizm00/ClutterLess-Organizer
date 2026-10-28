// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { Folder, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/Button';
import { Switch } from '../../components/Switch';
import { useOnboardingStore } from '../../state/onboardingStore';
import { t } from '../../i18n';
import { cn } from '../../lib/utils';

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
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-app text-text-1 p-6">
      <div
        className="w-full max-w-onboarding bg-bg-surface border border-border rounded-md shadow-elevation flex flex-col overflow-hidden"
        data-testid="onboarding-panel"
      >
        {/* Step Indicator Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-caption text-text-3 font-medium uppercase tracking-wider">
              {t('onboarding.step_indicator', { current: step, total: 3 })}
            </span>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className={cn('h-1.5 w-6 rounded-xs transition-colors', step >= 1 ? 'bg-accent' : 'bg-border')} />
            <div className={cn('h-1.5 w-6 rounded-xs transition-colors', step >= 2 ? 'bg-accent' : 'bg-border')} />
            <div className={cn('h-1.5 w-6 rounded-xs transition-colors', step >= 3 ? 'bg-accent' : 'bg-border')} />
          </div>
        </div>

        {/* Step 1: Watched Folders */}
        {step === 1 && (
          <div className="p-6 flex flex-col gap-6" data-testid="onboarding-step-1">
            <div className="flex flex-col gap-1">
              <h1 className="text-display font-semibold text-text-1 tracking-tight">
                {t('onboarding.step1_title')}
              </h1>
              <p className="text-body text-text-2">
                {t('onboarding.step1_desc')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Downloads option */}
              <button
                type="button"
                onClick={() => toggleFolder('~/Downloads')}
                className={cn(
                  'w-full text-left p-4 rounded-sm border transition-colors flex items-start gap-3.5 cursor-pointer',
                  watchFolders.includes('~/Downloads')
                    ? 'border-accent bg-bg-raised'
                    : 'border-border bg-bg-surface hover:bg-bg-raised'
                )}
                data-testid="folder-option-downloads"
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-xs border flex items-center justify-center shrink-0 mt-0.5',
                    watchFolders.includes('~/Downloads')
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-border-strong bg-transparent'
                  )}
                >
                  {watchFolders.includes('~/Downloads') && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-text-2 shrink-0" />
                    <span className="text-body font-medium text-text-1">
                      {t('onboarding.step1_downloads')}
                    </span>
                    <span className="text-caption font-mono text-text-3">~/Downloads</span>
                  </div>
                  <p className="text-small text-text-2">
                    {t('onboarding.step1_downloads_desc')}
                  </p>
                </div>
              </button>

              {/* Desktop option */}
              <button
                type="button"
                onClick={() => toggleFolder('~/Desktop')}
                className={cn(
                  'w-full text-left p-4 rounded-sm border transition-colors flex items-start gap-3.5 cursor-pointer',
                  watchFolders.includes('~/Desktop')
                    ? 'border-accent bg-bg-raised'
                    : 'border-border bg-bg-surface hover:bg-bg-raised'
                )}
                data-testid="folder-option-desktop"
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-xs border flex items-center justify-center shrink-0 mt-0.5',
                    watchFolders.includes('~/Desktop')
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-border-strong bg-transparent'
                  )}
                >
                  {watchFolders.includes('~/Desktop') && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-text-2 shrink-0" />
                    <span className="text-body font-medium text-text-1">
                      {t('onboarding.step1_desktop')}
                    </span>
                    <span className="text-caption font-mono text-text-3">~/Desktop</span>
                  </div>
                  <p className="text-small text-text-2">
                    {t('onboarding.step1_desktop_desc')}
                  </p>
                </div>
              </button>
            </div>

            {/* Optional Autostart Checkbox */}
            <div className="pt-2 flex items-center justify-between border-t border-border-subtle">
              <label htmlFor="autostart-toggle" className="text-small text-text-2 cursor-pointer">
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
              <h1 className="text-display font-semibold text-text-1 tracking-tight">
                {t('onboarding.step2_title')}
              </h1>
              <p className="text-body text-text-2">
                {t('onboarding.step2_desc')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Recommended defaults */}
              <button
                type="button"
                onClick={() => setRuleSet('recommended')}
                className={cn(
                  'w-full text-left p-4 rounded-sm border transition-colors flex items-start gap-3.5 cursor-pointer',
                  ruleSet === 'recommended'
                    ? 'border-accent bg-bg-raised'
                    : 'border-border bg-bg-surface hover:bg-bg-raised'
                )}
                data-testid="ruleset-option-recommended"
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-xs border flex items-center justify-center shrink-0 mt-0.5',
                    ruleSet === 'recommended'
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-border-strong bg-transparent'
                  )}
                >
                  {ruleSet === 'recommended' && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-body font-medium text-text-1">
                    {t('onboarding.ruleset_recommended')}
                  </span>
                  <p className="text-small text-text-2">
                    {t('onboarding.ruleset_recommended_desc')}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Images', 'Documents', 'Videos', 'Music', 'Archives'].map(category => (
                      <span
                        key={category}
                        className="px-2 py-0.5 rounded-sm bg-bg-surface border border-border text-caption text-text-2"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              {/* Start empty */}
              <button
                type="button"
                onClick={() => setRuleSet('empty')}
                className={cn(
                  'w-full text-left p-4 rounded-sm border transition-colors flex items-start gap-3.5 cursor-pointer',
                  ruleSet === 'empty'
                    ? 'border-accent bg-bg-raised'
                    : 'border-border bg-bg-surface hover:bg-bg-raised'
                )}
                data-testid="ruleset-option-empty"
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-xs border flex items-center justify-center shrink-0 mt-0.5',
                    ruleSet === 'empty'
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-border-strong bg-transparent'
                  )}
                >
                  {ruleSet === 'empty' && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-body font-medium text-text-1">
                    {t('onboarding.ruleset_empty')}
                  </span>
                  <p className="text-small text-text-2">
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
              <h1 className="text-display font-semibold text-text-1 tracking-tight">
                {t('onboarding.step3_title')}
              </h1>
              <p className="text-body text-text-2">
                {t('onboarding.step3_desc')}
              </p>
            </div>

            {/* Preview list */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-caption font-medium text-text-3 px-1">
                <span>{t('onboarding.preview_summary', { count: previewFiles.length })}</span>
                <span className="font-mono">{watchFolders.join(', ')}</span>
              </div>

              {previewFiles.length === 0 ? (
                <div className="p-6 text-center border border-border border-dashed rounded-sm text-text-2 text-small">
                  {t('onboarding.preview_empty')}
                </div>
              ) : (
                <div className="border border-border rounded-sm divide-y divide-border bg-bg-surface overflow-hidden max-h-48 overflow-y-auto">
                  {previewFiles.map((file, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-small">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-text-1 font-medium truncate">{file.name}</span>
                        <span className="text-caption font-mono text-text-3 truncate">
                          &rarr; {file.dest}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-sm bg-bg-raised text-caption text-text-2 shrink-0">
                        {file.rule}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Navigation Bar */}
        <div className="p-6 pt-4 border-t border-border bg-bg-surface flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button
              variant="secondary"
              size="default"
              onClick={handleBack}
              disabled={loading}
              data-testid="onboarding-btn-back"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t('onboarding.btn_back')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="default"
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
                  variant="secondary"
                  size="default"
                  onClick={() => complete(false)}
                  disabled={loading}
                  data-testid="onboarding-btn-skip-for-now"
                >
                  {t('onboarding.btn_skip_for_now')}
                </Button>
                <Button
                  variant="primary"
                  size="default"
                  onClick={() => complete(true)}
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
                  size="default"
                  onClick={skip}
                  disabled={loading}
                  data-testid="onboarding-btn-skip-step"
                >
                  {t('onboarding.btn_skip_step')}
                </Button>
                <Button
                  variant="primary"
                  size="default"
                  onClick={handleNext}
                  disabled={loading || (step === 1 && watchFolders.length === 0)}
                  data-testid="onboarding-btn-continue"
                >
                  {t('onboarding.btn_continue')}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
