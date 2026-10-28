// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect, useState, useId } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  MoreHorizontal,
  ArrowRight,
  Edit2,
  Copy,
  Trash2,
  Folder,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Switch } from '../../components/Switch';
import { Menu } from '../../components/Menu';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { RuleTester } from '../../components/RuleTester';
import { RuleEditor } from '../../components/RuleEditor';
import { useRulesStore } from '../../state/rulesStore';
import { RuleDTO } from '../../api/types';
import { t } from '../../i18n';
import { cn } from '../../lib/utils';

// Helper to summarize match conditions in mono
function getConditionSummary(rule: RuleDTO): string {
  const parts: string[] = [];
  if (rule.match.ext && rule.match.ext.length > 0) {
    parts.push(rule.match.ext.map(e => `.${e}`).join(' '));
  }
  if (rule.match.nameGlob && rule.match.nameGlob.length > 0) {
    parts.push(rule.match.nameGlob.join(' '));
  }
  if (rule.match.nameRegex) {
    parts.push(rule.match.nameRegex);
  }
  if (rule.match.minSize) {
    parts.push(`≥${rule.match.minSize}`);
  }
  if (rule.match.maxSize) {
    parts.push(`≤${rule.match.maxSize}`);
  }
  if (rule.match.olderThan) {
    parts.push(`>${rule.match.olderThan}`);
  }
  return parts.join(' · ') || 'any';
}

// Category color mapping based on rule name
function getCategoryTheme(name: string): { dot: string; badge: string } {
  const lower = name.toLowerCase();
  if (lower.includes('invoice') || lower.includes('finance')) {
    return { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' };
  }
  if (lower.includes('image') || lower.includes('photo')) {
    return { dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/25' };
  }
  if (lower.includes('video') || lower.includes('media')) {
    return { dot: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-500 border-purple-500/25' };
  }
  if (lower.includes('archive') || lower.includes('zip')) {
    return { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/25' };
  }
  if (lower.includes('doc') || lower.includes('text')) {
    return { dot: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/25' };
  }
  if (lower.includes('installer') || lower.includes('setup')) {
    return { dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-500 border-rose-500/25' };
  }
  return { dot: 'bg-accent', badge: 'bg-accent/10 text-accent border-accent/25' };
}

interface SortableRuleRowProps {
  rule: RuleDTO;
  index: number;
  total: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SortableRuleRow: React.FC<SortableRuleRowProps> = ({
  rule,
  index,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.name });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      onMoveUp();
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      onMoveDown();
    }
  };

  const theme = getCategoryTheme(rule.name);
  const exts = rule.match.ext || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-xs transition-all duration-fast ease',
        'hover:border-border-strong hover:bg-bg-raised/40 focus-within:ring-1 focus-within:ring-accent',
        isDragging && 'opacity-75 shadow-elevation border-accent z-10',
        rule.disabled && 'opacity-55 bg-card/50'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag handle for rule ${rule.name}. Press Alt+Up or Alt+Down to reorder.`}
          className="text-text-3 hover:text-text-1 p-1 rounded-sm cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Priority Index Badge */}
        <span
          className={cn(
            'inline-flex items-center justify-center font-mono text-caption font-semibold w-6 h-6 rounded-md border shrink-0',
            theme.badge
          )}
        >
          #{index + 1}
        </span>

        {/* Rule Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 w-32 shrink-0 min-w-0">
            <span className={cn('h-2 w-2 rounded-full shrink-0', theme.dot)} aria-hidden="true" />
            <span
              className={cn(
                'text-body font-semibold text-foreground truncate',
                rule.disabled && 'text-muted-foreground'
              )}
              title={rule.name}
            >
              {rule.name}
            </span>
          </div>

          {/* Match Conditions Column */}
          <div className="w-64 shrink-0 min-w-0 flex items-center gap-1 overflow-hidden" title={getConditionSummary(rule)}>
            {exts.length > 0 ? (
              <>
                {exts.slice(0, 4).map(ext => (
                  <span
                    key={ext}
                    className="font-mono text-caption text-text-1 bg-muted border border-border-subtle rounded-md px-1.5 py-0.5 shrink-0"
                  >
                    .{ext}
                  </span>
                ))}
                {exts.length > 4 && (
                  <span className="font-mono text-caption text-text-3 bg-muted/60 border border-border-subtle rounded-md px-1.5 py-0.5 shrink-0">
                    +{exts.length - 4}
                  </span>
                )}
              </>
            ) : (
              <span className="block font-mono text-caption text-text-2 bg-muted border border-border-subtle rounded-md px-2.5 py-1 truncate w-full">
                {getConditionSummary(rule)}
              </span>
            )}
          </div>

          {/* Destination Column */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 text-small font-mono text-text-2">
            <ArrowRight className="h-3.5 w-3.5 text-text-3 shrink-0" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border-subtle truncate max-w-full">
              <Folder className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden="true" />
              <span className="truncate text-text-1" title={rule.moveTo}>
                {rule.moveTo}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Row Actions */}
      <div className="flex items-center gap-2.5 shrink-0 ml-3">
        <Switch
          checked={!rule.disabled}
          onCheckedChange={onToggle}
          aria-label={`Toggle rule ${rule.name}`}
        />

        <Menu
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-text-3 hover:text-text-1"
              aria-label={`Menu for rule ${rule.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
          items={[
            {
              label: t('action.edit'),
              icon: <Edit2 className="h-3.5 w-3.5" />,
              onClick: onEdit,
            },
            {
              label: t('action.duplicate'),
              icon: <Copy className="h-3.5 w-3.5" />,
              onClick: onDuplicate,
            },
            {
              label: t('action.delete'),
              icon: <Trash2 className="h-3.5 w-3.5 text-danger" />,
              danger: true,
              onClick: onDelete,
            },
          ]}
        />
      </div>
    </div>
  );
};

export const Rules: React.FC = () => {
  const {
    rules,
    loading,
    fetchRules,
    openEditor,
    deleteRule,
    duplicateRule,
    toggleRule,
    reorderRules,
  } = useRulesStore();

  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex(r => r.name === active.id);
      const newIndex = rules.findIndex(r => r.name === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(rules, oldIndex, newIndex);
        const names = reordered.map(r => r.name);
        void reorderRules(names);
        setAriaAnnouncement(
          t('rules.reordered', {
            name: String(active.id),
            position: (newIndex + 1).toString(),
            total: rules.length.toString(),
          })
        );
      }
    }
  };

  const handleKeyboardMove = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const reordered = arrayMove(rules, currentIndex, targetIndex);
    const names = reordered.map(r => r.name);
    void reorderRules(names);
    setAriaAnnouncement(
      t('rules.reordered', {
        name: rules[currentIndex].name,
        position: (targetIndex + 1).toString(),
        total: rules.length.toString(),
      })
    );
  };

  const confirmDelete = async () => {
    if (ruleToDelete) {
      await deleteRule(ruleToDelete);
      setRuleToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Live Region for Screen Reader Reorder Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {/* Top Pipeline Banner Card */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 text-accent">
            <SlidersHorizontal size={15} strokeWidth={1.75} />
          </span>
          <div className="flex flex-col">
            <span className="font-sans text-body font-semibold text-foreground">
              {t('rules.caption')}
            </span>
            <span className="font-sans text-caption text-text-3">
              Rules are evaluated top-to-bottom. Drag handles or press Alt+Up / Alt+Down to reorder priority.
            </span>
          </div>
        </div>
        <span className="font-mono text-caption text-accent bg-accent/10 border border-accent/25 px-2.5 py-1 rounded-md">
          {rules.filter(r => !r.disabled).length} active / {rules.length} total
        </span>
      </div>

      {/* Rules List */}
      {rules.length === 0 && !loading ? (
        <div className="flex flex-col bg-card border border-border rounded-xl shadow-xs overflow-hidden w-full p-6">
          <EmptyState
            title={t('rules.empty_title')}
            description={t('rules.empty_desc')}
            action={
              <Button variant="primary" onClick={() => openEditor()}>
                {t('action.new_rule')}
              </Button>
            }
          />
        </div>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rules.map(r => r.name)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2.5 w-full">
              {rules.map((rule, idx) => (
                <SortableRuleRow
                  key={rule.name}
                  rule={rule}
                  index={idx}
                  total={rules.length}
                  onEdit={() => openEditor(rule)}
                  onDuplicate={() => void duplicateRule(rule)}
                  onDelete={() => setRuleToDelete(rule.name)}
                  onToggle={() => void toggleRule(rule.name)}
                  onMoveUp={() => handleKeyboardMove(idx, 'up')}
                  onMoveDown={() => handleKeyboardMove(idx, 'down')}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Inline Tester */}
      <div className="pt-1 w-full">
        <RuleTester />
      </div>

      {/* Rule Editor Dialog */}
      <RuleEditor />

      {/* Delete Rule Confirmation Dialog */}
      <Dialog
        open={Boolean(ruleToDelete)}
        onOpenChange={open => {
          if (!open) setRuleToDelete(null);
        }}
        title={t('rules.delete_title', { name: ruleToDelete || '' })}
        description={t('rules.delete_desc')}
        footer={
          <div className="flex items-center gap-2 justify-end w-full">
            <Button variant="secondary" size="default" onClick={() => setRuleToDelete(null)}>
              {t('action.cancel')}
            </Button>
            <Button variant="danger" size="default" onClick={confirmDelete}>
              {t('action.delete')}
            </Button>
          </div>
        }
      >
        <p className="text-small text-text-2">
          Files matching this rule will no longer be automatically organized into its destination.
        </p>
      </Dialog>
    </div>
  );
};
