import { describe, expect, it } from 'vitest'
import { warmthColor } from './warmth'

describe('warmthColor', () => {
  it('0% é branco: multiplicar por ele não muda nada', () => {
    expect(warmthColor(0)).toBe('rgb(255,255,255)')
  })

  it('100% tira metade do azul e 22% do verde', () => {
    expect(warmthColor(100)).toBe('rgb(255,199,128)')
  })

  it('fora de 0 a 100 fica no limite', () => {
    expect(warmthColor(-10)).toBe(warmthColor(0))
    expect(warmthColor(150)).toBe(warmthColor(100))
  })
})
