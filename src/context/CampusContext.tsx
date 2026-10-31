import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import {
  loadState, saveState, resetAll, isItemExpired, canonicalSignature,
  type CampusItem, type Priority, type Category,
} from '../lib/engine';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface NewItem {
  title: string;
  date: string | null;
  time: string | null;
  endTime?: string | null;
  venue: string | null;
  category: Category;
  source: string;
  raw: string;
  priority: Priority;
  cancelled?: boolean;
  remind: boolean;
  provenance: CampusItem['provenance'];
}

export type DuplicateResult =
  | { kind: 'added'; item: CampusItem }
  | { kind: 'duplicate'; existing: CampusItem };

interface CampusContextValue {
  items: CampusItem[];
  onboarded: boolean;
  /** canonical signature of an item — used for duplicate detection */
  addItem: (data: NewItem) => DuplicateResult;
  addItemForce: (data: NewItem) => CampusItem;
  updateItem: (id: string, patch: Partial<CampusItem>) => void;
  deleteItem: (id: string) => void;
  toggleDone: (id: string) => void;
  toggleCancelled: (id: string) => void;
  togglePin: (id: string) => void;
  toggleRemind: (id: string) => void;
  resetBoard: () => void;
  clearExpired: () => void;
  markOnboarded: () => void;
  /** increments every 30s — lets components re-derive time-sensitive UI */
  nowTick: number;
  addOpen: boolean;
  setAddOpen: (v: boolean) => void;
  addPrefill: string | null;
  openAdd: (prefill?: string) => void;
  digestOpen: boolean;
  setDigestOpen: (v: boolean) => void;
  editingId: string | null;
  openEdit: (id: string) => void;
  toasts: Toast[];
  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
  dismissToast: (id: number) => void;
}

const CampusContext = createContext<CampusContextValue | null>(null);
let toastSeq = 1;
let itemSeq = 1000;

export function CampusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => loadState());
  const [addOpen, setAddOpen] = useState(false);
  const [addPrefill, setAddPrefill] = useState<string | null>(null);
  const [digestOpen, setDigestOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nowTick, setNowTick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  // refresh time-sensitive views (countdowns, expiry, ongoing) every 30s
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(t => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const showToast = useCallback((message: string, actionLabel?: string, onAction?: () => void) => {
    const id = toastSeq++;
    setToasts(t => [...t.slice(-2), { id, message, actionLabel, onAction }]);
    window.setTimeout(() => dismissToast(id), 4500);
  }, [dismissToast]);

  const signatureOf = canonicalSignature;

  const addItemForce = useCallback((data: NewItem): CampusItem => {
    const now = Date.now();
    const item: CampusItem = {
      ...data,
      endTime: data.endTime ?? null,
      cancelled: data.cancelled ?? false,
      id: `item-${now.toString(36)}-${itemSeq++}`,
      addedAt: now,
      updatedAt: now,
      done: false,
      pinned: false,
    };
    setState(s => ({ ...s, items: [item, ...s.items] }));
    return item;
  }, []);

  const addItem = useCallback((data: NewItem): DuplicateResult => {
    const sig = signatureOf(data);
    const existing = stateRef.current.items.find(i => signatureOf(i) === sig && !i.done && !i.cancelled);
    if (existing) return { kind: 'duplicate', existing };
    return { kind: 'added', item: addItemForce(data) };
  }, [addItemForce]);

  const updateItem = useCallback((id: string, patch: Partial<CampusItem>) => {
    const now = Date.now();
    setState(s => ({ ...s, items: s.items.map(i => (i.id === id ? { ...i, ...patch, updatedAt: now } : i)) }));
  }, []);

  const deleteItem = useCallback((id: string) => {
    const target = stateRef.current.items.find(i => i.id === id);
    setState(s => ({ ...s, items: s.items.filter(i => i.id !== id) }));
    if (target) {
      showToast('Card deleted', 'Undo', () => {
        setState(s => ({ ...s, items: [...s.items, target].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999')) }));
      });
    }
  }, [showToast]);

  const toggleDone = useCallback((id: string) => {
    const now = Date.now();
    setState(s => ({ ...s, items: s.items.map(i => (i.id === id ? { ...i, done: !i.done, updatedAt: now } : i)) }));
  }, []);

  const toggleCancelled = useCallback((id: string) => {
    const now = Date.now();
    setState(s => ({ ...s, items: s.items.map(i => (i.id === id ? { ...i, cancelled: !i.cancelled, updatedAt: now } : i)) }));
  }, []);

  const togglePin = useCallback((id: string) => {
    const now = Date.now();
    setState(s => ({ ...s, items: s.items.map(i => (i.id === id ? { ...i, pinned: !i.pinned, updatedAt: now } : i)) }));
  }, []);

  const toggleRemind = useCallback((id: string) => {
    const now = Date.now();
    setState(s => ({ ...s, items: s.items.map(i => (i.id === id ? { ...i, remind: !i.remind, updatedAt: now } : i)) }));
  }, []);

  const resetBoard = useCallback(() => {
    setState(resetAll());
    showToast('Board refreshed with fresh notices');
  }, [showToast]);

  /** Clears cards whose local end instant has passed. Same rule as itemStatus — one source of truth. */
  const clearExpired = useCallback(() => {
    const now = new Date();
    let removed = 0;
    setState(s => ({
      ...s,
      items: s.items.filter(i => {
        if (isItemExpired(i, now)) { removed++; return false; }
        return true;
      }),
    }));
    window.setTimeout(() => showToast(removed ? `Cleared ${removed} expired card${removed > 1 ? 's' : ''}` : 'Nothing expired right now'), 50);
  }, [showToast]);

  const markOnboarded = useCallback(() => {
    setState(s => ({ ...s, onboarded: true }));
  }, []);

  const openAdd = useCallback((prefill?: string) => {
    setEditingId(null);
    setAddPrefill(prefill ?? null);
    setAddOpen(true);
  }, []);

  const openEdit = useCallback((id: string) => {
    setEditingId(id);
    setAddPrefill(null);
    setAddOpen(true);
  }, []);

  const value = useMemo<CampusContextValue>(() => ({
    items: state.items,
    onboarded: state.onboarded,
    addItem, addItemForce, updateItem, deleteItem,
    toggleDone, toggleCancelled, togglePin, toggleRemind,
    resetBoard, clearExpired, markOnboarded,
    nowTick,
    addOpen, setAddOpen, addPrefill, openAdd, digestOpen, setDigestOpen,
    editingId, openEdit,
    toasts, showToast, dismissToast,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    state, addItem, addItemForce, updateItem, deleteItem,
    toggleDone, toggleCancelled, togglePin, toggleRemind,
    resetBoard, clearExpired, markOnboarded, nowTick,
    addOpen, addPrefill, openAdd, digestOpen, editingId, openEdit,
    toasts, showToast, dismissToast,
  ]);

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function useCampus() {
  const ctx = useContext(CampusContext);
  if (!ctx) throw new Error('useCampus must be used inside <CampusProvider>');
  return ctx;
}
