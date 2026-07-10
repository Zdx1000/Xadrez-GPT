import type { Chess, Color, Move, PieceSymbol } from 'chess.js'

const PIECE_GLYPHS: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
}

export interface PresentedMove {
  number: number
  white?: string
  black?: string
}

export function groupMoveHistory(moves: Move[]): PresentedMove[] {
  return moves.reduce<PresentedMove[]>((groups, move, index) => {
    const groupIndex = Math.floor(index / 2)
    const group = groups[groupIndex] ?? { number: groupIndex + 1 }
    if (index % 2 === 0) group.white = move.san
    else group.black = move.san
    groups[groupIndex] = group
    return groups
  }, [])
}

export function getCapturedPieces(moves: Move[]) {
  return moves.reduce<Record<Color, string[]>>(
    (captured, move) => {
      if (move.captured) captured[move.color].push(PIECE_GLYPHS[move.color === 'w' ? 'b' : 'w'][move.captured])
      return captured
    },
    { w: [], b: [] },
  )
}

export function describePosition(game: Chess, thinking: boolean) {
  if (game.isCheckmate()) {
    return {
      eyebrow: 'Fim de partida',
      title: game.turn() === 'w' ? 'Vitória das peças negras' : 'Vitória das peças brancas',
      detail: 'Xeque-mate. O rei não possui nenhuma resposta legal.',
    }
  }
  if (game.isStalemate()) {
    return { eyebrow: 'Fim de partida', title: 'Empate por afogamento', detail: 'Não há jogadas legais disponíveis.' }
  }
  if (game.isThreefoldRepetition()) {
    return { eyebrow: 'Fim de partida', title: 'Empate por repetição', detail: 'A mesma posição ocorreu três vezes.' }
  }
  if (game.isInsufficientMaterial()) {
    return { eyebrow: 'Fim de partida', title: 'Material insuficiente', detail: 'Não há material para forçar o mate.' }
  }
  if (game.isDrawByFiftyMoves()) {
    return { eyebrow: 'Fim de partida', title: 'Regra dos 50 lances', detail: 'A partida terminou empatada.' }
  }

  return describeActivePosition(game, thinking)
}

/** Evita repetir as verificações de fim de jogo quando o chamador já as fez. */
export function describeActivePosition(
  game: Chess,
  thinking: boolean,
  inCheck = game.inCheck(),
) {
  if (thinking) {
    return { eyebrow: 'Turno da máquina', title: 'Analisando a posição…', detail: 'Aureus está calculando variantes.' }
  }
  if (inCheck) {
    return {
      eyebrow: 'Atenção',
      title: 'Xeque!',
      detail: game.turn() === 'w' ? 'O rei branco está sob ataque.' : 'O rei negro está sob ataque.',
    }
  }
  return {
    eyebrow: game.turn() === 'w' ? 'Turno das brancas' : 'Turno das negras',
    title: 'Sua estratégia está em jogo',
    detail: 'Selecione uma peça para revelar seus movimentos legais.',
  }
}
