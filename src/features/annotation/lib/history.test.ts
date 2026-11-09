import { describe, expect, it } from 'vitest'
import { canRedo, canUndo, commit, createHistory, redo, undo } from './history'

describe('history', () => {
  it('undoes and redoes committed steps', () => {
    let history = createHistory(1)
    history = commit(history, 2)
    history = commit(history, 3)

    history = undo(history)
    expect(history.present).toBe(2)
    history = undo(history)
    expect(history.present).toBe(1)
    expect(canUndo(history)).toBe(false)

    history = redo(history)
    expect(history.present).toBe(2)
    expect(canRedo(history)).toBe(true)
  })

  it('drops the redo stack on a new edit', () => {
    let history = commit(commit(createHistory('a'), 'b'), 'c')
    history = commit(undo(history), 'd')
    expect(history.present).toBe('d')
    expect(canRedo(history)).toBe(false)
  })

  it('ignores commits that change nothing', () => {
    const history = createHistory('same')
    expect(commit(history, 'same')).toBe(history)
  })

  it('keeps at most `limit` undo steps', () => {
    let history = createHistory(0)
    for (let i = 1; i <= 10; i++) history = commit(history, i, 3)
    expect(history.past).toEqual([7, 8, 9])
  })

  it('does nothing when there is nothing to undo or redo', () => {
    const history = createHistory('x')
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
  })
})
