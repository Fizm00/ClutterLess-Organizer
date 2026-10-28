import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  showToast: toast => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const duration = toast.duration ?? (toast.onAction ? 8000 : 4000);

    set(state => {
      const next = [...state.toasts, { ...toast, id, duration }];
      return { toasts: next.slice(-3) }; // Keep at most 3 stacked
    });

    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
  },
  dismissToast: id => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },
}));

export const toast = {
  show: (message: string, actionLabel?: string, onAction?: () => void) => {
    useToastStore.getState().showToast({ message, actionLabel, onAction });
  },
};

