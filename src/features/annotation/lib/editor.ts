import { sameRect, type Rect } from './geometry'
import { commit, createHistory, redo, undo, type History } from './history'

export type Annotation = Rect & {
  id: string
  /** null until the user names it. */
  label: string | null
}

export type EditorState = {
  history: History<Annotation[]>
  selectedId: string | null
}

export type EditorAction =
  | { type: 'add'; annotation: Annotation }
  | { type: 'update'; id: string; rect: Rect }
  | { type: 'rename'; id: string; label: string | null }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'select'; id: string | null }
  | { type: 'undo' }
  | { type: 'redo' }

export const MAX_LABEL_LENGTH = 60

/** Trims and collapses whitespace; empty means unlabeled. */
export const normalizeLabel = (label: string | null) => {
  const text = (label ?? '').trim().replace(/\s+/g, ' ')
  return text ? text.slice(0, MAX_LABEL_LENGTH) : null
}

export const createEditorState = (annotations: Annotation[]): EditorState => ({
  history: createHistory(annotations),
  selectedId: null,
})

/** Keeps the selection only if that box still exists (e.g. after undo). */
const validSelection = (id: string | null, annotations: Annotation[]) =>
  id && annotations.some((annotation) => annotation.id === id) ? id : null

/**
 * Every edit is one history step; selection isn't part of history. Gestures
 * dispatch once when they end, so undo reverts a whole drag, not each pixel.
 */
export const editorReducer = (
  state: EditorState,
  action: EditorAction,
): EditorState => {
  const annotations = state.history.present

  switch (action.type) {
    case 'add':
      return {
        history: commit(state.history, [...annotations, action.annotation]),
        selectedId: action.annotation.id,
      }

    case 'update': {
      const current = annotations.find((a) => a.id === action.id)
      if (!current || sameRect(current, action.rect)) return state
      return {
        ...state,
        history: commit(
          state.history,
          annotations.map((a) =>
            a.id === action.id ? { ...a, ...action.rect } : a,
          ),
        ),
      }
    }

    case 'rename': {
      const label = normalizeLabel(action.label)
      const current = annotations.find((a) => a.id === action.id)
      if (!current || current.label === label) return state
      return {
        ...state,
        history: commit(
          state.history,
          annotations.map((a) => (a.id === action.id ? { ...a, label } : a)),
        ),
      }
    }

    case 'remove': {
      if (!annotations.some((a) => a.id === action.id)) return state
      return {
        history: commit(
          state.history,
          annotations.filter((a) => a.id !== action.id),
        ),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      }
    }

    case 'clear':
      if (annotations.length === 0) return state
      return { history: commit(state.history, []), selectedId: null }

    case 'select':
      return action.id === state.selectedId
        ? state
        : { ...state, selectedId: validSelection(action.id, annotations) }

    case 'undo':
    case 'redo': {
      const history =
        action.type === 'undo' ? undo(state.history) : redo(state.history)
      if (history === state.history) return state
      return {
        history,
        selectedId: validSelection(state.selectedId, history.present),
      }
    }
  }
}
