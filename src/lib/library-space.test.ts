import { describe, expect, it } from 'vitest'
import { canFreeSpace, formatSize, spaceUsed } from './library-space'

const file = (bytes: number) => new Blob([new Uint8Array(bytes)])

describe('spaceUsed', () => {
  it('soma só os livros com o arquivo neste aparelho', () => {
    const used = spaceUsed([
      { fileBlob: file(100) },
      { fileBlob: null, driveFileId: 'd' },
      { fileBlob: file(50) },
    ])
    expect(used).toEqual({ bytes: 150, books: 2 })
  })
})

describe('canFreeSpace', () => {
  it('só quando o Drive já tem este arquivo', () => {
    expect(canFreeSpace({ fileBlob: file(1), driveFileId: 'd', pendingUpload: false })).toBe(true)
  })

  it('não com envio pendente, sem Drive ou sem arquivo aqui', () => {
    expect(canFreeSpace({ fileBlob: file(1), driveFileId: 'd', pendingUpload: true })).toBe(false)
    expect(canFreeSpace({ fileBlob: file(1), driveFileId: 'd' })).toBe(false)
    expect(canFreeSpace({ fileBlob: file(1), pendingUpload: false })).toBe(false)
    expect(canFreeSpace({ fileBlob: null, driveFileId: 'd', pendingUpload: false })).toBe(false)
  })
})

describe('formatSize', () => {
  it('MB com uma casa abaixo de 10, inteiro acima, GB a partir de 1024 MB', () => {
    expect(formatSize(0)).toBe('0 MB')
    expect(formatSize(1.5 * 1024 * 1024)).toBe('1,5 MB')
    expect(formatSize(25 * 1024 * 1024)).toBe('25 MB')
    expect(formatSize(1.25 * 1024 * 1024 * 1024)).toBe('1,3 GB')
  })
})
