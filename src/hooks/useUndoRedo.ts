import { useState, useCallback } from 'react';

const MAX_HISTORY = 200;

export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export const useUndoRedo = <T>(initialState: T) => {
  const [history, setHistory] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setHistory((prev) => {
      const resolvedPresent = typeof newPresent === 'function' 
        ? (newPresent as Function)(prev.present) 
        : newPresent;

      if (resolvedPresent === prev.present) return prev;

      const newPast = [...prev.past, prev.present];
      if (newPast.length > MAX_HISTORY) newPast.shift();

      return {
        past: newPast,
        present: resolvedPresent,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
