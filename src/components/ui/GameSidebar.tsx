import { memo, useMemo } from 'react'
import {
  Bot,
  Clock3,
  Crown,
  History,
  Plus,
  RefreshCw,
  Sparkles,
  Undo2,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { type GameClock, useClockTime } from '../../hooks/useGameClock'
import type { PlayerSide } from './StartScreen'

export type ChessColor = Exclude<PlayerSide, 'random'>

export type GameStatusTone =
  | 'neutral'
  | 'active'
  | 'thinking'
  | 'check'
  | 'finished'

export interface GameSidebarProps {
  status: string
  statusDetail?: string
  statusTone?: GameStatusTone
  playerSide: ChessColor
  activeColor: ChessColor
  difficultyLabel: string
  clock: GameClock
  moveHistory: readonly string[]
  onNewGame: () => void
  onUndo: () => void
  onFlipBoard: () => void
  onToggleSound: () => void
  onToggleEffects: () => void
  canUndo?: boolean
  isBoardFlipped?: boolean
  soundEnabled?: boolean
  effectsEnabled?: boolean
  playerName?: string
  machineName?: string
}

interface PlayerCardProps {
  color: ChessColor
  name: string
  role: string
  seconds: number
  isActive: boolean
  isMachine: boolean
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

interface ClockedPlayerCardProps extends Omit<PlayerCardProps, 'seconds'> {
  clock: GameClock
}

const PlayerCard = memo(function PlayerCard({
  color,
  name,
  role,
  seconds,
  isActive,
  isMachine,
}: PlayerCardProps) {
  const ActorIcon = isMachine ? Bot : User
  const colorLabel = color === 'white' ? 'Brancas' : 'Pretas'

  return (
    <article
      className="player-card"
      data-color={color}
      data-active={isActive || undefined}
      aria-label={`${name}, peças ${colorLabel.toLowerCase()}`}
    >
      <div className="player-card__identity">
        <span className="player-card__avatar" aria-hidden="true">
          <ActorIcon size={21} strokeWidth={1.7} />
        </span>
        <span className="player-card__copy">
          <strong>{name}</strong>
          <small>
            {role} · {colorLabel}
          </small>
        </span>
      </div>

      <time
        className="player-card__clock"
        data-urgent={seconds <= 30 || undefined}
        dateTime={`PT${Math.max(0, Math.floor(seconds))}S`}
        aria-label={`${formatClock(seconds)} restantes`}
      >
        <Clock3 size={15} aria-hidden="true" />
        {formatClock(seconds)}
      </time>
    </article>
  )
})

const ClockedPlayerCard = memo(function ClockedPlayerCard({
  clock,
  color,
  ...props
}: ClockedPlayerCardProps) {
  const milliseconds = useClockTime(clock, color === 'white' ? 'w' : 'b')
  return <PlayerCard {...props} color={color} seconds={milliseconds / 1000} />
})

export const GameSidebar = memo(function GameSidebar({
  status,
  statusDetail,
  statusTone = 'neutral',
  playerSide,
  activeColor,
  difficultyLabel,
  clock,
  moveHistory,
  onNewGame,
  onUndo,
  onFlipBoard,
  onToggleSound,
  onToggleEffects,
  canUndo = true,
  isBoardFlipped = false,
  soundEnabled = true,
  effectsEnabled = true,
  playerName = 'Você',
  machineName = 'AUREUS',
}: GameSidebarProps) {
  const whiteIsMachine = playerSide === 'black'
  const blackIsMachine = playerSide === 'white'
  const moveRows = useMemo(
    () => Array.from(
      { length: Math.ceil(moveHistory.length / 2) },
      (_, index) => ({
        number: index + 1,
        white: moveHistory[index * 2],
        black: moveHistory[index * 2 + 1],
      }),
    ),
    [moveHistory],
  )

  return (
    <aside className="game-sidebar" aria-label="Painel da partida">
      <header className="game-sidebar__header">
        <div className="game-sidebar__brand">
          <span className="game-sidebar__emblem" aria-hidden="true">
            <Crown size={19} strokeWidth={1.5} />
          </span>
          <span>
            <strong>AUREUS</strong>
            <small>Xadrez 3D</small>
          </span>
        </div>

        <span className="game-sidebar__difficulty" title="Nível da máquina">
          {difficultyLabel}
        </span>
      </header>

      <section
        className="game-status"
        data-tone={statusTone}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="game-status__pulse" aria-hidden="true" />
        <span className="game-status__copy">
          <strong>{status}</strong>
          {statusDetail && <small>{statusDetail}</small>}
        </span>
      </section>

      <section className="game-sidebar__players" aria-label="Jogadores e relógios">
        <ClockedPlayerCard
          clock={clock}
          color="black"
          name={blackIsMachine ? machineName : playerName}
          role={blackIsMachine ? 'Máquina' : 'Jogador'}
          isActive={activeColor === 'black'}
          isMachine={blackIsMachine}
        />
        <div className="game-sidebar__versus" aria-hidden="true">
          <span />
          <small>VS</small>
          <span />
        </div>
        <ClockedPlayerCard
          clock={clock}
          color="white"
          name={whiteIsMachine ? machineName : playerName}
          role={whiteIsMachine ? 'Máquina' : 'Jogador'}
          isActive={activeColor === 'white'}
          isMachine={whiteIsMachine}
        />
      </section>

      <section className="move-history" aria-labelledby="move-history-title">
        <header className="move-history__header">
          <h2 id="move-history-title">
            <History size={16} aria-hidden="true" />
            Histórico
          </h2>
          <span>{moveHistory.length} lances</span>
        </header>

        <div className="move-history__scroll" tabIndex={0}>
          {moveRows.length > 0 ? (
            <table className="move-history__table">
              <thead className="move-history__table-head">
                <tr>
                  <th scope="col">Nº</th>
                  <th scope="col">Brancas</th>
                  <th scope="col">Pretas</th>
                </tr>
              </thead>
              <tbody>
                {moveRows.map((move) => (
                  <tr key={move.number}>
                    <th scope="row">{move.number}.</th>
                    <td>{move.white ?? '—'}</td>
                    <td>{move.black ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="move-history__empty">
              <Sparkles size={20} aria-hidden="true" />
              <p>O primeiro lance dará início à história.</p>
            </div>
          )}
        </div>
      </section>

      <nav className="game-controls" aria-label="Controles da partida">
        <button
          className="game-controls__button game-controls__button--primary"
          type="button"
          onClick={onNewGame}
        >
          <Plus size={17} aria-hidden="true" />
          <span>Nova partida</span>
        </button>
        <button
          className="game-controls__button"
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 size={17} aria-hidden="true" />
          <span>Desfazer</span>
        </button>
        <button
          className="game-controls__button"
          type="button"
          onClick={onFlipBoard}
          aria-pressed={isBoardFlipped}
        >
          <RefreshCw size={17} aria-hidden="true" />
          <span>Virar tabuleiro</span>
        </button>
        <button
          className="game-controls__button game-controls__button--compact"
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Desativar som' : 'Ativar som'}
          title={soundEnabled ? 'Desativar som' : 'Ativar som'}
        >
          {soundEnabled ? (
            <Volume2 size={17} aria-hidden="true" />
          ) : (
            <VolumeX size={17} aria-hidden="true" />
          )}
          <span>Som</span>
        </button>
        <button
          className="game-controls__button game-controls__button--compact"
          data-enabled={effectsEnabled || undefined}
          type="button"
          onClick={onToggleEffects}
          aria-pressed={effectsEnabled}
          aria-label={effectsEnabled ? 'Desativar efeitos' : 'Ativar efeitos'}
          title={effectsEnabled ? 'Desativar efeitos' : 'Ativar efeitos'}
        >
          <Sparkles size={17} aria-hidden="true" />
          <span>Efeitos</span>
        </button>
      </nav>
    </aside>
  )
})
