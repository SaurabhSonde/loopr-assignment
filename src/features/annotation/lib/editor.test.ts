import { describe, expect, it } from 'vitest'
import {
  createEditorState,
  editorReducer,
  normalizeLabel,
  type Annotation,
  type EditorAction,
  type EditorState,
} from './editor'

const box = (id: string, overrides: Partial<Annotation> = {}): Annotation => ({
  id,
  label: null,
  x: 10,
  y: 10,
  width: 50,
  height: 40,
  ...overrides,
})

const run = (state: EditorState, ...actions: EditorAction[]) =>
  actions.reduce(editorReducer, state)

const boxesOf = (state: EditorState) => state.history.present

describe('editorReducer', () => {
  it('adds a box and selects it', () => {
    const state = run(createEditorState([]), {
      type: 'add',
      annotation: box('a'),
    })
    expect(boxesOf(state)).toHaveLength(1)
    expect(state.selectedId).toBe('a')
  })

  it('records each edit as one undoable step', () => {
    let state = run(
      createEditorState([]),
      { type: 'add', annotation: box('a') },
      {
        type: 'update',
        id: 'a',
        rect: { x: 20, y: 20, width: 60, height: 50 },
      },
      { type: 'rename', id: 'a', label: 'Car' },
    )
    expect(boxesOf(state)[0]).toMatchObject({ x: 20, label: 'Car' })

    state = run(state, { type: 'undo' })
    expect(boxesOf(state)[0]).toMatchObject({ x: 20, label: null })
    state = run(state, { type: 'undo' })
    expect(boxesOf(state)[0]).toMatchObject({ x: 10 })
    state = run(state, { type: 'redo' }, { type: 'redo' })
    expect(boxesOf(state)[0]).toMatchObject({ x: 20, label: 'Car' })
  })

  it("doesn't record edits that change nothing", () => {
    const start = createEditorState([box('a', { label: 'Car' })])
    const state = run(
      start,
      {
        type: 'update',
        id: 'a',
        rect: { x: 10, y: 10, width: 50, height: 40 },
      },
      { type: 'rename', id: 'a', label: '  Car ' },
    )
    expect(state.history.past).toHaveLength(0)
  })

  it('clears the selection when the selected box is removed', () => {
    const state = run(
      createEditorState([box('a'), box('b')]),
      { type: 'select', id: 'a' },
      { type: 'remove', id: 'a' },
    )
    expect(boxesOf(state).map((a) => a.id)).toEqual(['b'])
    expect(state.selectedId).toBeNull()
  })

  it('restores a removed box with undo', () => {
    const state = run(
      createEditorState([box('a')]),
      { type: 'remove', id: 'a' },
      { type: 'undo' },
    )
    expect(boxesOf(state).map((a) => a.id)).toEqual(['a'])
  })

  it('clears all boxes in one undoable step', () => {
    let state = run(createEditorState([box('a'), box('b')]), { type: 'clear' })
    expect(boxesOf(state)).toEqual([])
    state = run(state, { type: 'undo' })
    expect(boxesOf(state)).toHaveLength(2)
  })

  it('drops a selection that no longer exists after undo', () => {
    const state = run(
      createEditorState([]),
      { type: 'add', annotation: box('a') },
      { type: 'undo' },
    )
    expect(state.selectedId).toBeNull()
  })

  it("doesn't select boxes that don't exist", () => {
    const state = run(createEditorState([]), { type: 'select', id: 'ghost' })
    expect(state.selectedId).toBeNull()
  })
})

describe('normalizeLabel', () => {
  it('trims, collapses whitespace and treats empty as unlabeled', () => {
    expect(normalizeLabel('  Front   door ')).toBe('Front door')
    expect(normalizeLabel('   ')).toBeNull()
    expect(normalizeLabel(null)).toBeNull()
    expect(normalizeLabel('x'.repeat(100))).toHaveLength(60)
  })
})
