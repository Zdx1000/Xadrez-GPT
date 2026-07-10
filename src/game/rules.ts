import { Chess, type Move, type Square } from 'chess.js'
import type { ChessMove, PromotionPiece } from './types'

export function createGame(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess()
}

export function toChessMove(move: Pick<Move, 'from' | 'to' | 'promotion'>): ChessMove {
  const result: ChessMove = {
    from: move.from,
    to: move.to,
  }

  if (isPromotionPiece(move.promotion)) {
    result.promotion = move.promotion
  }

  return result
}

export function getLegalMoves(fen: string, from?: Square): ChessMove[] {
  const game = new Chess(fen)
  const moves = from
    ? game.moves({ square: from, verbose: true })
    : game.moves({ verbose: true })

  return moves.map(toChessMove)
}

export function isMoveLegal(fen: string, candidate: ChessMove): boolean {
  return getLegalMoves(fen, candidate.from).some(
    (move) =>
      move.to === candidate.to &&
      (move.promotion ?? undefined) === (candidate.promotion ?? undefined),
  )
}

function isPromotionPiece(piece: string | undefined): piece is PromotionPiece {
  return piece === 'q' || piece === 'r' || piece === 'b' || piece === 'n'
}
