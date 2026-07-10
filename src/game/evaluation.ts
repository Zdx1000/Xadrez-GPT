import type { Chess, Color, PieceSymbol } from 'chess.js'

export const CHECKMATE_SCORE = 100_000

export const PIECE_VALUES: Readonly<Record<PieceSymbol, number>> = {
  p: 100,
  n: 320,
  b: 335,
  r: 500,
  q: 900,
  k: 0,
}

/**
 * Avalia a posição em centipawns do ponto de vista da cor informada.
 * Valores positivos favorecem `perspective`; valores negativos favorecem o oponente.
 */
export function evaluatePosition(game: Chess, perspective: Color): number {
  if (game.isCheckmate()) {
    return game.turn() === perspective ? -CHECKMATE_SCORE : CHECKMATE_SCORE
  }

  if (game.isDraw()) {
    return 0
  }

  return evaluateStaticPosition(game, perspective)
}

/** Avalia uma posição cuja terminalidade já foi verificada pela busca. */
export function evaluateStaticPosition(game: Chess, perspective: Color): number {

  let whiteScore = 0
  let blackScore = 0
  const board = game.board()

  for (let row = 0; row < board.length; row += 1) {
    for (let file = 0; file < board[row].length; file += 1) {
      const piece = board[row][file]
      if (!piece) continue

      const score = PIECE_VALUES[piece.type] + positionalValue(piece.type, piece.color, row, file)
      if (piece.color === 'w') whiteScore += score
      else blackScore += score
    }
  }

  let score = perspective === 'w' ? whiteScore - blackScore : blackScore - whiteScore

  if (game.inCheck()) {
    score += game.turn() === perspective ? -35 : 35
  }

  return score
}

function positionalValue(type: PieceSymbol, color: Color, row: number, file: number): number {
  const centerDistance = Math.abs(file - 3.5) + Math.abs(row - 3.5)
  const advancement = color === 'w' ? 7 - row : row

  switch (type) {
    case 'p':
      return advancement * 9 - Math.abs(file - 3.5) * 3
    case 'n':
      return 32 - centerDistance * 9
    case 'b':
      return 22 - centerDistance * 5
    case 'r':
      return advancement * 2 - Math.abs(file - 3.5)
    case 'q':
      return 10 - centerDistance * 2
    case 'k':
      // Durante a maior parte da partida, uma posição afastada do centro é mais segura.
      return centerDistance * 4
  }
}
