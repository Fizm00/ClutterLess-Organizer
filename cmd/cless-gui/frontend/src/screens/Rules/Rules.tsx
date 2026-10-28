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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState, RuleTester, RuleEditor, formatMiddleEllipsis } from '@/components';
import { useRulesStore } from '@/state/rulesStore';
import { RuleDTO } from '@/api/types';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

function getConditionSummary(rule: RuleDTO): string {
  const parts: string[] = [];
  if (rule.match.ext && rule.match.ext.length > 0) {
    const exts = rule.match.ext;
    if (exts.length > 4) {
      parts.push(`${exts.slice(0, 4).map(e => `.${e}`).join(' ')} +${exts.length - 4}`);
    } else {
      parts.push(exts.map(e => `.${e}`).join(' '));
    }
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

interface SortableRuleRowProps {
  rule: RuleDTO;
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
        'group flex items-center justify-between h-11 px-3 bg-background hover:bg-muted/50 transition-colors gap-3',
        isDragging && 'opacity-75 bg-muted z-10',
        rule.disabled && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag handle for rule ${rule.name}. Press Alt+Up or Alt+Down to reorder.`}
          className="text-muted-foreground hover:text-foreground p-1 rounded cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </button>

        {/* Rule Name */}
        <span
          className="text-sm font-medium text-foreground w-36 shrink-0 truncate"
          title={rule.name}
        >
          {rule.name}
        </span>

        {/* Conditions (single mono text block per C.3, no separate badges) */}
        <span
          className="w-60 shrink-0 font-mono text-xs text-muted-foreground truncate"
          title={getConditionSummary(rule)}
        >
          {getConditionSummary(rule)}
        </span>

        {/* Destination (mono, muted, middle-ellipsis) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ArrowRight className="size-4 text-muted-foreground shrink-0" />
          <span
            className="font-mono text-xs text-muted-foreground truncate"
            title={rule.moveTo}
          >
            {formatMiddleEllipsis(rule.moveTo, 44)}
          </span>
        </div>
      </div>

      {/* Row Actions */}
      <div className="flex items-center gap-2.5 shrink-0 ml-3">
        <Switch
          checked={!rule.disabled}
          onCheckedChange={onToggle}
          aria-label={`Toggle rule ${rule.name}`}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Menu for rule ${rule.name}`}
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="size-4 text-muted-foreground" />
              <span>{t('action.edit')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="size-4 text-muted-foreground" />
              <span>{t('action.duplicate')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              <span>{t('action.delete')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    <div className="flex flex-col gap-6 w-full">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <p className="text-sm text-muted-foreground">{t('rules.caption')}</p>

        {rules.length === 0 && !loading ? (
          <div className="rounded-lg border px-4 w-full">
            <EmptyState
              title={t('rules.empty_title')}
              description={t('rules.empty_desc')}
              action={
                <Button variant="default" size="sm" onClick={() => openEditor()}>
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
              <div className="rounded-lg border divide-y w-full overflow-hidden">
                {rules.map((rule, idx) => (
                  <SortableRuleRow
                    key={rule.name}
                    rule={rule}
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
      </div>

      {/* Plain Inline Rule Tester Section */}
      <RuleTester />

      {/* Rule Editor Dialog */}
      <RuleEditor />

      {/* Delete Rule Confirmation Dialog */}
      <Dialog
        open={Boolean(ruleToDelete)}
        onOpenChange={open => {
          if (!open) setRuleToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rules.delete_title', { name: ruleToDelete || '' })}</DialogTitle>
            <DialogDescription>{t('rules.delete_desc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleToDelete(null)}>
              {t('action.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
