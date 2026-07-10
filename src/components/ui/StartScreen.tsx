import type { FormEvent } from 'react'
import {
  Check,
  Crown,
  Play,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
} from 'lucide-react'

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export type PlayerSide = 'white' | 'black' | 'random'

export interface DifficultyOption {
  id: DifficultyLevel
  label: string
  description: string
}

export interface StartScreenProps {
  difficulties: readonly DifficultyOption[]
  selectedDifficulty: DifficultyLevel
  selectedSide: PlayerSide
  onDifficultyChange: (difficulty: DifficultyLevel) => void
  onSideChange: (side: PlayerSide) => void
  onStart: () => void
  isStarting?: boolean
}

const sideOptions: ReadonlyArray<{
  value: PlayerSide
  label: string
  description: string
  icon: typeof Shield
}> = [
  {
    value: 'white',
    label: 'Brancas',
    description: 'Você faz o primeiro lance',
    icon: Shield,
  },
  {
    value: 'black',
    label: 'Pretas',
    description: 'A máquina abre a partida',
    icon: Swords,
  },
  {
    value: 'random',
    label: 'Aleatório',
    description: 'Deixe o destino escolher',
    icon: Shuffle,
  },
]

export function StartScreen({
  difficulties,
  selectedDifficulty,
  selectedSide,
  onDifficultyChange,
  onSideChange,
  onStart,
  isStarting = false,
}: StartScreenProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onStart()
  }

  return (
    <main className="start-screen">
      <div className="start-screen__atmosphere" aria-hidden="true">
        <span className="start-screen__glow start-screen__glow--primary" />
        <span className="start-screen__glow start-screen__glow--secondary" />
        <span className="start-screen__grid" />
      </div>

      <section className="start-screen__panel" aria-labelledby="aureus-title">
        <header className="start-screen__header">
          <div className="start-screen__emblem" aria-hidden="true">
            <Crown size={32} strokeWidth={1.5} />
          </div>
          <div className="start-screen__brand-block">
            <p className="start-screen__eyebrow">
              <Sparkles size={13} aria-hidden="true" />
              Xadrez tridimensional
            </p>
            <h1 className="start-screen__brand" id="aureus-title">
              AUREUS
            </h1>
            <p className="start-screen__tagline">
              Estratégia clássica. Presença extraordinária.
            </p>
          </div>
        </header>

        <form className="start-screen__form" onSubmit={handleSubmit}>
          <fieldset className="start-screen__fieldset">
            <legend className="start-screen__legend">
              <span className="start-screen__step">01</span>
              Escolha seu desafio
            </legend>
            <p className="start-screen__hint">
              Cinco níveis calibrados para acompanhar a sua evolução.
            </p>

            <div
              className="difficulty-selector"
              role="radiogroup"
              aria-label="Nível de dificuldade"
            >
              {difficulties.map((difficulty, index) => {
                const isSelected = difficulty.id === selectedDifficulty

                return (
                  <button
                    className="difficulty-selector__option"
                    data-selected={isSelected || undefined}
                    key={difficulty.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onDifficultyChange(difficulty.id)}
                    disabled={isStarting}
                  >
                    <span className="difficulty-selector__number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="difficulty-selector__copy">
                      <strong>{difficulty.label}</strong>
                      <small>{difficulty.description}</small>
                    </span>
                    <span className="difficulty-selector__check" aria-hidden="true">
                      <Check size={15} />
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="start-screen__fieldset">
            <legend className="start-screen__legend">
              <span className="start-screen__step">02</span>
              Escolha seu lado
            </legend>

            <div
              className="side-selector"
              role="radiogroup"
              aria-label="Cor das peças"
            >
              {sideOptions.map((option) => {
                const Icon = option.icon
                const isSelected = option.value === selectedSide

                return (
                  <button
                    className="side-selector__option"
                    data-side={option.value}
                    data-selected={isSelected || undefined}
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSideChange(option.value)}
                    disabled={isStarting}
                  >
                    <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <Check
                      className="side-selector__check"
                      size={14}
                      aria-hidden="true"
                    />
                  </button>
                )
              })}
            </div>
          </fieldset>

          <button
            className="start-screen__submit"
            type="submit"
            disabled={isStarting || difficulties.length === 0}
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            <span>{isStarting ? 'Preparando o tabuleiro…' : 'Iniciar partida'}</span>
          </button>
        </form>

        <footer className="start-screen__footer">
          <span>Three.js Experience</span>
          <span aria-hidden="true">•</span>
          <span>Regras clássicas</span>
          <span aria-hidden="true">•</span>
          <span>Inteligência adaptativa</span>
        </footer>
      </section>
    </main>
  )
}

