import { useState, useCallback } from 'react';
import { PathChain } from '../types';

const MAX_HISTORY = 200;

interface HistoryState {
  past: PathChain[];
  present: PathChain;
  future: PathChain[];
}

export const useUndoRedo = (initialState: PathChain) => {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  const set = useCallback((newPresent: PathChain) => {
    setHistory((prev) => {
      const newPast = [...prev.past, prev.present];
      if (newPast.length > MAX_HISTORY) newPast.shift();

      return {
        past: newPast,
        present: newPresent,
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
