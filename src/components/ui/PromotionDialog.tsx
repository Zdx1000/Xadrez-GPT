import { useEffect, useId, useRef } from 'react'
import { Crown, X } from 'lucide-react'
import type { ChessColor } from './GameSidebar'

export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

export interface PromotionDialogProps {
  open: boolean
  color: ChessColor
  onSelect: (piece: PromotionPiece) => void
  onCancel?: () => void
}

const promotionOptions: ReadonlyArray<{
  value: PromotionPiece
  label: string
  whiteGlyph: string
  blackGlyph: string
}> = [
  { value: 'q', label: 'Dama', whiteGlyph: '♕', blackGlyph: '♛' },
  { value: 'r', label: 'Torre', whiteGlyph: '♖', blackGlyph: '♜' },
  { value: 'b', label: 'Bispo', whiteGlyph: '♗', blackGlyph: '♝' },
  { value: 'n', label: 'Cavalo', whiteGlyph: '♘', blackGlyph: '♞' },
]

export function PromotionDialog({
  open,
  color,
  onSelect,
  onCancel,
}: PromotionDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const firstOptionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    firstOptionRef.current?.focus()

    return () => previouslyFocused?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.()
      }}
    >
      <section
        className="game-dialog promotion-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel?.()
        }}
      >
        <header className="game-dialog__header">
          <span className="game-dialog__icon" aria-hidden="true">
            <Crown size={22} strokeWidth={1.6} />
          </span>
          <span className="game-dialog__heading">
            <small>Última fileira alcançada</small>
            <h2 id={titleId}>Promover peão</h2>
          </span>
          {onCancel && (
            <button
              className="game-dialog__close"
              type="button"
              onClick={onCancel}
              aria-label="Cancelar promoção"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </header>

        <p className="game-dialog__description" id={descriptionId}>
          Escolha a peça que assumirá esta posição.
        </p>

        <div className="promotion-dialog__options">
          {promotionOptions.map((option, index) => (
            <button
              className="promotion-dialog__option"
              data-piece={option.value}
              key={option.value}
              ref={index === 0 ? firstOptionRef : undefined}
              type="button"
              onClick={() => onSelect(option.value)}
            >
              <span className="promotion-dialog__piece" aria-hidden="true">
                {color === 'white' ? option.whiteGlyph : option.blackGlyph}
              </span>
              <strong>{option.label}</strong>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

