import { describe, expect, it } from 'vitest'
import { OPEN_STAGES, openProgress } from './open-progress'

describe('openProgress', () => {
  it('cada etapa começa onde a anterior termina e a última chega a 1', () => {
    const stages = Object.values(OPEN_STAGES)
    expect(stages[0].from).toBe(0)
    for (let i = 1; i < stages.length; i++) expect(stages[i].from).toBe(stages[i - 1].to)
    expect(stages.at(-1)!.to).toBe(1)
  })

  it('a fração anda dentro da fatia da etapa', () => {
    expect(openProgress('parse')).toBe(0.5)
    expect(openProgress('parse', 0.5)).toBeCloseTo(0.625)
    expect(openProgress('render', 1)).toBe(1)
  })

  it('fração fora de 0 a 1 fica no limite', () => {
    expect(openProgress('read', -1)).toBe(openProgress('read', 0))
    expect(openProgress('read', 2)).toBe(openProgress('read', 1))
  })
})
