import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Color, type Move, type Square } from 'chess.js'
import { Maximize2, Minimize2, ShieldCheck, Sparkles } from 'lucide-react'
import {
  GameOverDialog,
  GameSidebar,
  PromotionDialog,
  StartScreen,
  type GameResult,
  type PlayerSide,
  type PromotionPiece,
} from './components/ui'
import { DIFFICULTIES, type ChessMove, type DifficultyLevel } from './game'
import { describeActivePosition } from './game/presentation'
import { useChessAudio } from './hooks/useChessAudio'
import { useGameClock } from './hooks/useGameClock'

type Phase = 'menu' | 'playing'
type BoardOrientation = 'white' | 'black'

interface PendingPromotion {
  from: Square
  to: Square
}

interface WorkerResponse {
  id: number
  fen: string
  move: ChessMove | null
}

interface BoardInteractionState {
  phase: Phase
  thinking: boolean
  isGameOver: boolean
  pendingPromotion: PendingPromotion | null
  playerColor: Color
  selectedSquare: Square | null
  legalMoves: Square[]
  commitMove: (candidate: ChessMove) => Move | null
  playSound: ReturnType<typeof useChessAudio>['playSound']
}

const difficultyOptions = DIFFICULTIES.map((difficulty) => ({
  id: difficulty.level,
  label: difficulty.name,
  description: difficulty.description,
}))

const loadChessScene = () => import('./components/ChessScene')

const ChessScene = lazy(async () => {
  const module = await loadChessScene()
  return { default: module.ChessScene }
})

function colorToSide(color: Color): BoardOrientation {
  return color === 'w' ? 'white' : 'black'
}

function sideToColor(side: Exclude<PlayerSide, 'random'>): Color {
  return side === 'white' ? 'w' : 'b'
}

function getGameResult(game: Chess): { result: GameResult; reason: string } | null {
  if (!game.isGameOver()) return null

  if (game.isCheckmate()) {
    return {
      result: game.turn() === 'w' ? 'black' : 'white',
      reason: 'Xeque-mate — o rei não possui nenhuma resposta legal.',
    }
  }
  if (game.isStalemate()) return { result: 'draw', reason: 'Empate por afogamento.' }
  if (game.isThreefoldRepetition()) return { result: 'draw', reason: 'Empate por repetição tripla da posição.' }
  if (game.isInsufficientMaterial()) return { result: 'draw', reason: 'Empate por material insuficiente.' }
  if (game.isDrawByFiftyMoves()) return { result: 'draw', reason: 'Empate pela regra dos cinquenta lances.' }
  return { result: 'draw', reason: 'A partida terminou empatada.' }
}

function App() {
  const gameRef = useRef<Chess | null>(null)
  const aiRequestRef = useRef(0)
  const aiWorkerRef = useRef<Worker | null>(null)
  const workerFailureFenRef = useRef<string | null>(null)
  const aiDelayRef = useRef<number | null>(null)
  const commitMoveRef = useRef<(candidate: ChessMove) => Move | null>(() => null)
  const boardInteractionRef = useRef<BoardInteractionState | null>(null)
  const gameOverTimerRef = useRef<number | null>(null)
  const [phase, setPhase] = useState<Phase>('menu')
  const [fen, setFen] = useState(() => {
    const game = new Chess()
    gameRef.current = game
    return game.fen()
  })
  const [history, setHistory] = useState<Move[]>([])
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<Square[]>([])
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(3)
  const [sideChoice, setSideChoice] = useState<PlayerSide>('white')
  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [orientation, setOrientation] = useState<BoardOrientation>('white')
  const [thinking, setThinking] = useState(false)
  const [effectsEnabled, setEffectsEnabled] = useState(true)
  const [showGameOver, setShowGameOver] = useState(false)
  const [dismissedResult, setDismissedResult] = useState(false)
  const [timedOutColor, setTimedOutColor] = useState<Color | null>(null)
  const [gameNumber, setGameNumber] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [workerRevision, setWorkerRevision] = useState(0)
  const { audioEnabled, setAudioEnabled, playSound } = useChessAudio()

  const position = useMemo(() => {
    const current = gameRef.current!
    const chessResult = getGameResult(current)
    return {
      chessResult,
      turn: current.turn(),
      inCheck: !chessResult && current.inCheck(),
    }
  }, [fen])
  const timeoutResult = useMemo(
    () => timedOutColor
      ? {
          result: colorToSide(timedOutColor === 'w' ? 'b' : 'w') as GameResult,
          reason: 'O tempo de um dos jogadores se esgotou.',
        }
      : null,
    [timedOutColor],
  )
  const gameResult = timeoutResult ?? position.chessResult
  const isGameOver = Boolean(gameResult)
  const handleTimeout = useCallback((color: Color) => {
    setTimedOutColor((current) => current ?? color)
  }, [])
  const gameClock = useGameClock(
    phase === 'playing' && !isGameOver,
    position.turn,
    gameNumber,
    handleTimeout,
  )

  useEffect(() => {
    if (phase !== 'menu') return
    let cancelled = false
    const prefetch = () => {
      if (!cancelled) void loadChessScene()
    }

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 2_500 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }

    const id = globalThis.setTimeout(prefetch, 1_200)
    return () => {
      cancelled = true
      globalThis.clearTimeout(id)
    }
  }, [phase])

  const syncGame = useCallback((move?: Move | null) => {
    const current = gameRef.current!
    setFen(current.fen())
    if (move) setLastMove({ from: move.from, to: move.to })
    setSelectedSquare(null)
    setLegalMoves([])
    setPendingPromotion(null)
  }, [])

  const commitMove = useCallback(
    (candidate: ChessMove) => {
      if (isGameOver) return null
      let move: Move
      try {
        move = gameRef.current!.move(candidate)
      } catch {
        return null
      }

      setHistory((current) => [...current, move])
      syncGame(move)
      if (move.flags.includes('k') || move.flags.includes('q')) playSound('castle')
      else if (gameRef.current!.inCheck()) playSound('check')
      else playSound(move.captured ? 'capture' : 'move')
      return move
    },
    [isGameOver, playSound, syncGame],
  )

  commitMoveRef.current = commitMove

  const clearAiDelay = useCallback(() => {
    if (aiDelayRef.current === null) return
    window.clearTimeout(aiDelayRef.current)
    aiDelayRef.current = null
  }, [])

  const invalidateAiRequest = useCallback(() => {
    aiRequestRef.current += 1
    clearAiDelay()
    setThinking(false)
  }, [clearAiDelay])

  const terminateAiWorker = useCallback(() => {
    invalidateAiRequest()
    aiWorkerRef.current?.terminate()
    aiWorkerRef.current = null
  }, [invalidateAiRequest])

  const createAiWorker = useCallback(() => {
    aiWorkerRef.current?.terminate()
    const worker = new Worker(new URL('./game/ai.worker.ts', import.meta.url), { type: 'module' })
    aiWorkerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      if (
        worker !== aiWorkerRef.current ||
        response.id !== aiRequestRef.current ||
        response.fen !== gameRef.current?.fen()
      ) return

      setThinking(false)
      workerFailureFenRef.current = null
      if (response.move) commitMoveRef.current(response.move)
    }

    worker.onerror = () => {
      if (worker !== aiWorkerRef.current) return
      setThinking(false)
      worker.terminate()
      aiWorkerRef.current = null
      const failedFen = gameRef.current?.fen() ?? null
      if (failedFen && workerFailureFenRef.current !== failedFen) {
        workerFailureFenRef.current = failedFen
        setWorkerRevision((value) => value + 1)
      }
    }

    return worker
  }, [])

  const startGame = useCallback(() => {
    if (gameOverTimerRef.current) window.clearTimeout(gameOverTimerRef.current)
    terminateAiWorker()
    const resolvedSide = sideChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : sideChoice
    const color = sideToColor(resolvedSide)
    const nextGame = new Chess()
    gameRef.current = nextGame
    workerFailureFenRef.current = null
    createAiWorker()
    setPlayerColor(color)
    setOrientation(colorToSide(color))
    setFen(nextGame.fen())
    setHistory([])
    setLastMove(null)
    setSelectedSquare(null)
    setLegalMoves([])
    setPendingPromotion(null)
    setTimedOutColor(null)
    setThinking(false)
    setShowGameOver(false)
    setDismissedResult(false)
    setGameNumber((value) => value + 1)
    setPhase('playing')
  }, [createAiWorker, sideChoice, terminateAiWorker])

  boardInteractionRef.current = {
    phase,
    thinking,
    isGameOver,
    pendingPromotion,
    playerColor,
    selectedSquare,
    legalMoves,
    commitMove,
    playSound,
  }

  const handleSquareClick = useCallback((square: Square) => {
      const interaction = boardInteractionRef.current!
      const current = gameRef.current!
      if (
        interaction.phase !== 'playing' ||
        interaction.thinking ||
        interaction.isGameOver ||
        interaction.pendingPromotion ||
        current.turn() !== interaction.playerColor
      ) return

      const piece = current.get(square)
      if (interaction.selectedSquare) {
        const targetIsLegal = interaction.legalMoves.includes(square)
        if (targetIsLegal) {
          const movingPiece = current.get(interaction.selectedSquare)
          const isPromotion = movingPiece?.type === 'p' && (square.endsWith('8') || square.endsWith('1'))
          if (isPromotion) {
            setPendingPromotion({ from: interaction.selectedSquare, to: square })
            return
          }
          interaction.commitMove({ from: interaction.selectedSquare, to: square })
          return
        }
      }

      if (piece?.color === interaction.playerColor) {
        const destinations = current
          .moves({ square, verbose: true })
          .map((move) => move.to)
          .filter((value, index, values) => values.indexOf(value) === index)
        setSelectedSquare(square)
        setLegalMoves(destinations)
        interaction.playSound('select')
      } else {
        setSelectedSquare(null)
        setLegalMoves([])
      }
    }, [])

  const handlePromotion = useCallback(
    (piece: PromotionPiece) => {
      if (!pendingPromotion) return
      commitMove({ ...pendingPromotion, promotion: piece })
    },
    [commitMove, pendingPromotion],
  )

  useEffect(() => {
    if (
      phase !== 'playing' ||
      isGameOver ||
      position.turn === playerColor ||
      pendingPromotion
    ) {
      invalidateAiRequest()
      return
    }

    const requestId = ++aiRequestRef.current
    const requestFen = fen
    const worker = aiWorkerRef.current ?? createAiWorker()
    setThinking(true)
    const delay = window.setTimeout(() => {
      if (requestId !== aiRequestRef.current || worker !== aiWorkerRef.current) return
      aiDelayRef.current = null
      worker.postMessage({ id: requestId, fen: requestFen, level: difficulty })
    }, 420)
    aiDelayRef.current = delay

    return () => {
      window.clearTimeout(delay)
      if (aiDelayRef.current === delay) aiDelayRef.current = null
    }
  }, [
    createAiWorker,
    difficulty,
    fen,
    invalidateAiRequest,
    isGameOver,
    pendingPromotion,
    phase,
    playerColor,
    position.turn,
    workerRevision,
  ])

  useEffect(() => {
    if (isGameOver) terminateAiWorker()
  }, [isGameOver, terminateAiWorker])

  useEffect(() => {
    if (!gameResult || dismissedResult) return
    if (gameOverTimerRef.current) window.clearTimeout(gameOverTimerRef.current)
    const humanWon = gameResult.result === colorToSide(playerColor)
    playSound(gameResult.result !== 'draw' && humanWon ? 'win' : 'lose')
    gameOverTimerRef.current = window.setTimeout(() => setShowGameOver(true), 850)
    return () => {
      if (gameOverTimerRef.current) window.clearTimeout(gameOverTimerRef.current)
    }
  }, [dismissedResult, gameResult, playSound, playerColor])

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => () => {
    aiRequestRef.current += 1
    clearAiDelay()
    aiWorkerRef.current?.terminate()
    aiWorkerRef.current = null
  }, [clearAiDelay])

  const undoMove = useCallback(() => {
    if (history.length === 0) return
    terminateAiWorker()
    createAiWorker()
    const current = gameRef.current!
    const wasPlayerTurn = current.turn() === playerColor
    let undoneMoves = 1

    current.undo()
    if (wasPlayerTurn && history.length > 1 && current.turn() !== playerColor) {
      current.undo()
      undoneMoves += 1
    }

    const nextHistory = history.slice(0, -undoneMoves)
    setHistory(nextHistory)
    setTimedOutColor(null)
    setShowGameOver(false)
    setDismissedResult(false)
    const previousMove = nextHistory.at(-1)
    setLastMove(previousMove ? {
      from: previousMove.from,
      to: previousMove.to,
    } : null)
    syncGame()
  }, [createAiWorker, history, playerColor, syncGame, terminateAiWorker])

  const status = useMemo(
    () => describeActivePosition(gameRef.current!, thinking, position.inCheck),
    [fen, position.inCheck, thinking],
  )
  const statusTone = isGameOver
    ? 'finished'
    : thinking
      ? 'thinking'
      : position.inCheck
        ? 'check'
        : 'active'
  const activeColor = colorToSide(position.turn)
  const playerSide = colorToSide(playerColor)
  const chosenDifficulty = DIFFICULTIES[difficulty - 1] ?? DIFFICULTIES[2]
  const sanHistory = useMemo(() => history.map((move) => move.san), [history])

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  }, [])

  const returnToMenu = useCallback(() => {
    terminateAiWorker()
    setPhase('menu')
  }, [terminateAiWorker])

  const flipBoard = useCallback(() => {
    setOrientation((value) => value === 'white' ? 'black' : 'white')
  }, [])

  const toggleSound = useCallback(() => {
    setAudioEnabled((value) => !value)
  }, [setAudioEnabled])

  const toggleEffects = useCallback(() => {
    setEffectsEnabled((value) => !value)
  }, [])

  const cancelPromotion = useCallback(() => setPendingPromotion(null), [])
  const closeGameOver = useCallback(() => {
    setShowGameOver(false)
    setDismissedResult(true)
  }, [])

  if (phase === 'menu') {
    return (
      <StartScreen
        difficulties={difficultyOptions}
        selectedDifficulty={difficulty}
        selectedSide={sideChoice}
        onDifficultyChange={setDifficulty}
        onSideChange={setSideChoice}
        onStart={startGame}
      />
    )
  }

  return (
    <main className="game-app">
      <div className="game-app__backdrop" aria-hidden="true" />
      <section className="game-stage" aria-label="Tabuleiro de xadrez tridimensional">
        <header className="game-stage__topbar">
          <div className="game-stage__context">
            <span className="game-stage__context-icon" aria-hidden="true"><ShieldCheck size={16} /></span>
            <span><small>Partida clássica</small><strong>Você contra AUREUS</strong></span>
          </div>
          <div className="game-stage__actions">
            <span className="game-stage__secure"><Sparkles size={13} /> IA local</span>
            <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}>
              {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          </div>
        </header>

        <div className="game-stage__canvas">
          <Suspense
            fallback={(
              <div className="game-stage__loading" role="status">
                <span aria-hidden="true" />
                <strong>Preparando o salão</strong>
                <small>Polindo o tabuleiro e posicionando as peças…</small>
              </div>
            )}
          >
            <ChessScene
              fen={fen}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              lastMove={lastMove}
              onSquareClick={handleSquareClick}
              orientation={orientation}
              effectsEnabled={effectsEnabled}
            />
          </Suspense>
          <div className="game-stage__hint" aria-live="polite">
            <span className="game-stage__hint-key">{thinking ? '•••' : '↗'}</span>
            {thinking ? 'AUREUS está calculando' : selectedSquare ? `${selectedSquare.toUpperCase()} selecionada` : 'Arraste para orbitar · Role para aproximar'}
          </div>
        </div>
      </section>

      <GameSidebar
        status={isGameOver && gameResult ? (gameResult.result === 'draw' ? 'Partida empatada' : 'Xeque-mate') : status.title}
        statusDetail={isGameOver && gameResult ? gameResult.reason : status.detail}
        statusTone={statusTone}
        playerSide={playerSide}
        activeColor={activeColor}
        difficultyLabel={`${chosenDifficulty.level} · ${chosenDifficulty.name}`}
        clock={gameClock}
        moveHistory={sanHistory}
        onNewGame={returnToMenu}
        onUndo={undoMove}
        onFlipBoard={flipBoard}
        onToggleSound={toggleSound}
        onToggleEffects={toggleEffects}
        canUndo={history.length > 0 && !pendingPromotion && !timedOutColor}
        isBoardFlipped={orientation !== playerSide}
        soundEnabled={audioEnabled}
        effectsEnabled={effectsEnabled}
      />

      <PromotionDialog
        open={Boolean(pendingPromotion)}
        color={playerSide}
        onSelect={handlePromotion}
        onCancel={cancelPromotion}
      />

      <GameOverDialog
        open={showGameOver && Boolean(gameResult)}
        result={gameResult?.result ?? 'draw'}
        reason={gameResult?.reason ?? ''}
        playerSide={playerSide}
        onPlayAgain={startGame}
        onBackToMenu={returnToMenu}
        onClose={closeGameOver}
      />
    </main>
  )
}

export default App
