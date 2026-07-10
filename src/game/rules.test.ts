import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { getLegalMoves, isMoveLegal } from './rules'

describe('regras tradicionais por chess.js', () => {
  it('começa com as 20 jogadas legais esperadas', () => {
    const game = new Chess()
    expect(game.moves()).toHaveLength(20)
  })

  it('oferece os dois roques quando o caminho está livre e seguro', () => {
    const moves = getLegalMoves('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1')

    expect(moves).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'e1', to: 'g1' }),
        expect.objectContaining({ from: 'e1', to: 'c1' }),
      ]),
    )
  })

  it('reconhece en passant e as quatro opções de promoção', () => {
    expect(
      isMoveLegal('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', {
        from: 'e5',
        to: 'd6',
      }),
    ).toBe(true)

    const promotions = getLegalMoves('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a7')
      .filter((move) => move.to === 'a8')
      .map((move) => move.promotion)

    expect(promotions).toEqual(expect.arrayContaining(['q', 'r', 'b', 'n']))
  })

  it('não permite ignorar um xeque', () => {
    const game = new Chess('4k3/8/8/8/8/8/R3r3/4K3 w - - 0 1')
    expect(() => game.move({ from: 'a2', to: 'a3' })).toThrow()
  })
})
