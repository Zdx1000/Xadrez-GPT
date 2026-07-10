import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { getComputerMove } from './ai'
import { DIFFICULTIES } from './difficulties'

describe('IA local', () => {
  it('sempre retorna uma jogada legal em todos os níveis', () => {
    const fen = new Chess().fen()

    for (const difficulty of DIFFICULTIES) {
      const move = getComputerMove(fen, difficulty.level)
      expect(move, difficulty.name).not.toBeNull()

      const game = new Chess(fen)
      expect(() => game.move(move!)).not.toThrow()
    }
  })

  it('no nível mais alto captura uma peça valiosa sem defesa', () => {
    const fen = '4k3/8/8/8/8/8/4r3/3Q2K1 w - - 0 1'
    const move = getComputerMove(fen, 5)

    expect(move).toMatchObject({ from: 'd1', to: 'e2' })
  })

  it('retorna null quando a partida já terminou', () => {
    const checkmate = '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1'
    expect(getComputerMove(checkmate, 3)).toBeNull()
  })
})
