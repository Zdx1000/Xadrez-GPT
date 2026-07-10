import { useEffect, useId, useMemo, useRef } from 'react'
import { Home, Minus, RotateCcw, Trophy, X } from 'lucide-react'
import type { ChessColor } from './GameSidebar'

export type GameResult = ChessColor | 'draw'

export interface GameOverDialogProps {
  open: boolean
  result: GameResult
  reason: string
  playerSide?: ChessColor
  onPlayAgain: () => void
  onBackToMenu: () => void
  onClose?: () => void
}

export function GameOverDialog({
  open,
  result,
  reason,
  playerSide,
  onPlayAgain,
  onBackToMenu,
  onClose,
}: GameOverDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const primaryActionRef = useRef<HTMLButtonElement>(null)

  const resultCopy = useMemo(() => {
    if (result === 'draw') {
      return {
        eyebrow: 'Honras divididas',
        title: 'Empate',
        message: 'Uma batalha equilibrada até o último lance.',
        tone: 'draw',
      }
    }

    const colorLabel = result === 'white' ? 'brancas' : 'pretas'

    if (!playerSide) {
      return {
        eyebrow: 'Xeque-mate',
        title: `Vitória das ${colorLabel}`,
        message: 'A partida encontrou seu desfecho.',
        tone: 'victory',
      }
    }

    const playerWon = result === playerSide

    return playerWon
      ? {
          eyebrow: 'Xeque-mate',
          title: 'Vitória',
          message: 'Estratégia, precisão e domínio do tabuleiro.',
          tone: 'victory',
        }
      : {
          eyebrow: 'Fim de partida',
          title: 'Derrota',
          message: 'Toda grande revanche começa com um novo plano.',
          tone: 'defeat',
        }
  }, [playerSide, result])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    primaryActionRef.current?.focus()

    return () => previouslyFocused?.focus()
  }, [open])

  if (!open) return null

  const ResultIcon = result === 'draw' ? Minus : Trophy

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        className="game-dialog game-over-dialog"
        data-result={resultCopy.tone}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose?.()
        }}
      >
        {onClose && (
          <button
            className="game-dialog__close game-over-dialog__close"
            type="button"
            onClick={onClose}
            aria-label="Fechar resultado"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}

        <div className="game-over-dialog__result-icon" aria-hidden="true">
          <span className="game-over-dialog__halo" />
          <ResultIcon size={36} strokeWidth={1.4} />
        </div>

        <div className="game-over-dialog__copy">
          <p className="game-over-dialog__eyebrow">{resultCopy.eyebrow}</p>
          <h2 id={titleId}>{resultCopy.title}</h2>
          <p className="game-over-dialog__message">{resultCopy.message}</p>
          <p className="game-over-dialog__reason" id={descriptionId}>
            {reason}
          </p>
        </div>

        <div className="game-over-dialog__actions">
          <button
            className="game-dialog__action game-dialog__action--primary"
            ref={primaryActionRef}
            type="button"
            onClick={onPlayAgain}
          >
            <RotateCcw size={17} aria-hidden="true" />
            Jogar novamente
          </button>
          <button
            className="game-dialog__action game-dialog__action--secondary"
            type="button"
            onClick={onBackToMenu}
          >
            <Home size={17} aria-hidden="true" />
            Voltar ao início
          </button>
        </div>
      </section>
    </div>
  )
}

