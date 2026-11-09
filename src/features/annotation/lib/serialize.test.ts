import { describe, expect, it } from 'vitest'
import { labelColor, UNLABELED_COLOR } from './colors'
import { serializeAnnotations } from './serialize'

describe('serializeAnnotations', () => {
  it('exports pixel and normalized coordinates', () => {
    const json = serializeAnnotations({ width: 4000, height: 3000 }, [
      { id: 'a', label: 'Car', x: 1000.4, y: 750, width: 2000, height: 1500.6 },
    ])
    expect(json).toEqual({
      image: { width: 4000, height: 3000 },
      annotations: [
        {
          label: 'Car',
          px: { x: 1000, y: 750, width: 2000, height: 1501 },
          norm: { x: 0.2501, y: 0.25, width: 0.5, height: 0.5002 },
        },
      ],
    })
  })
})

describe('labelColor', () => {
  it('gives a label the same color every time, regardless of case', () => {
    expect(labelColor('Car')).toEqual(labelColor('car'))
    expect(labelColor('Car')).toEqual(labelColor('Car'))
  })

  it('uses a neutral color for unlabeled boxes', () => {
    expect(labelColor(null)).toBe(UNLABELED_COLOR)
  })
})
