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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Edit2, Copy, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { Switch } from '../../components/Switch';
import { Menu } from '../../components/Menu';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { RuleTester } from '../../components/RuleTester';
import { RuleEditor } from '../../components/RuleEditor';
import { useRulesStore } from '../../state/rulesStore';
import type { RuleDTO } from '../../api/types';
import { t } from '../../i18n';
import { cn } from '../../lib/utils';

// Helper to extract clean condition summary
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

// Category dot color mapping based on rule name
function getCategoryColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('invoice') || lower.includes('finance')) return 'bg-emerald-500';
  if (lower.includes('image') || lower.includes('photo')) return 'bg-cyan-500';
  if (lower.includes('video') || lower.includes('media')) return 'bg-purple-500';
  if (lower.includes('archive') || lower.includes('zip')) return 'bg-amber-500';
  if (lower.includes('doc') || lower.includes('text')) return 'bg-blue-500';
  if (lower.includes('installer') || lower.includes('setup')) return 'bg-rose-500';
  return 'bg-accent';
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex items-center justify-between rounded-md border border-border bg-bg-surface px-3 py-2.5 transition-colors',
        'hover:bg-bg-raised/60 focus-within:ring-1 focus-within:ring-accent',
        isDragging && 'opacity-60 shadow-lg border-accent/40 z-10',
        rule.disabled && 'opacity-60 bg-bg-surface/50'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag handle for rule ${rule.name}. Press Alt+Up or Alt+Down to reorder.`}
          className="text-text-muted hover:text-text-primary p-1 rounded-xs cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Category Dot */}
        <span
          className={cn('h-2 w-2 rounded-full shrink-0', getCategoryColor(rule.name))}
          aria-hidden="true"
        />

        {/* Rule Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={cn(
              'text-sm font-medium text-text-primary truncate w-40 shrink-0',
              rule.disabled && 'text-text-muted'
            )}
            title={rule.name}
          >
            {rule.name}
          </span>

          <span
            className="font-mono text-xs text-text-muted bg-bg-raised/70 border border-border/60 rounded-xs px-2 py-0.5 truncate max-w-xs shrink-0"
            title={getConditionSummary(rule)}
          >
            {getConditionSummary(rule)}
          </span>

          <div className="flex items-center gap-1.5 min-w-0 flex-1 text-xs font-mono text-text-secondary truncate">
            <ArrowRight className="h-3 w-3 text-text-muted shrink-0" />
            <span className="truncate" title={rule.moveTo}>
              {rule.moveTo}
            </span>
          </div>
        </div>
      </div>

      {/* Row Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-3">
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
              className="h-8 w-8 p-0 text-text-muted hover:text-text-primary"
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
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      {/* Live Region for Screen Reader Reorder Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {/* Screen Subtitle / Caption */}
      <div className="text-xs text-text-muted -mt-2">
        {t('rules.caption')}
      </div>

      {/* Rules List */}
      {rules.length === 0 && !loading ? (
        <EmptyState
          title={t('rules.empty_title')}
          description={t('rules.empty_desc')}
          action={
            <Button variant="primary" onClick={() => openEditor()}>
              {t('action.new_rule')}
            </Button>
          }
        />
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rules.map(r => r.name)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
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
      <div className="pt-2">
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
        <p className="text-sm text-text-muted">
          Files matching this rule will no longer be automatically organized into its destination.
        </p>
      </Dialog>
    </div>
  );
};
