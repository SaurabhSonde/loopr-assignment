/** Undo/redo stacks around a value; each commit is one undoable step. */
export type History<T> = { past: T[]; present: T; future: T[] }

export const HISTORY_LIMIT = 100

export const createHistory = <T>(present: T): History<T> => ({
  past: [],
  present,
  future: [],
})

/** Records `next` as a new step (dropping the redo stack); a no-op if unchanged. */
export const commit = <T>(
  history: History<T>,
  next: T,
  limit = HISTORY_LIMIT,
): History<T> =>
  next === history.present
    ? history
    : {
        past: [...history.past, history.present].slice(-limit),
        present: next,
        future: [],
      }

export const undo = <T>(history: History<T>): History<T> => {
  if (history.past.length === 0) return history
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  }
}

export const redo = <T>(history: History<T>): History<T> => {
  if (history.future.length === 0) return history
  const [next, ...future] = history.future
  return {
    past: [...history.past, history.present],
    present: next,
    future,
  }
}

export const canUndo = <T>(history: History<T>) => history.past.length > 0
export const canRedo = <T>(history: History<T>) => history.future.length > 0
