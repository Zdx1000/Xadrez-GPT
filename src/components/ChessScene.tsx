import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { Square } from 'chess.js'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface ChessSceneProps {
  fen: string
  selectedSquare: Square | null
  legalMoves: Square[]
  lastMove?: { from: Square; to: Square } | null
  onSquareClick: (square: Square) => void
  orientation: 'white' | 'black'
  effectsEnabled: boolean
}

type PieceColor = 'w' | 'b'
type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

interface PositionPiece {
  square: Square
  color: PieceColor
  type: PieceKind
}

interface AnimatedPieceData extends PositionPiece {
  id: string
  exiting?: boolean
}

type Vector3Tuple = [number, number, number]

const BOARD_TOP = 0.34
const FILES = 'abcdefgh'
let pieceId = 0

function nextPieceId(piece: PositionPiece) {
  pieceId += 1
  return `${piece.color}${piece.type}-${piece.square}-${pieceId}`
}

function parseFen(fen: string): PositionPiece[] {
  const placement = fen.trim().split(/\s+/)[0]
  const rows = placement?.split('/') ?? []

  if (rows.length !== 8) return []

  const pieces: PositionPiece[] = []

  rows.forEach((row, rowIndex) => {
    let fileIndex = 0

    for (const symbol of row) {
      if (/\d/.test(symbol)) {
        fileIndex += Number(symbol)
        continue
      }

      const type = symbol.toLowerCase() as PieceKind
      if (!'pnbrqk'.includes(type) || fileIndex > 7) continue

      pieces.push({
        square: `${FILES[fileIndex]}${8 - rowIndex}` as Square,
        color: symbol === symbol.toUpperCase() ? 'w' : 'b',
        type,
      })
      fileIndex += 1
    }
  })

  return pieces
}

function squareToWorld(square: Square): [number, number] {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  return [file - 3.5, 3.5 - rank]
}

function squareDistance(a: Square, b: Square) {
  const [ax, az] = squareToWorld(a)
  const [bx, bz] = squareToWorld(b)
  return (ax - bx) ** 2 + (az - bz) ** 2
}

function reconcilePieces(
  previous: AnimatedPieceData[],
  position: PositionPiece[],
  lastMove?: { from: Square; to: Square } | null,
) {
  const active = previous.filter((piece) => !piece.exiting)
  const oldExits = previous.filter((piece) => piece.exiting)
  const usedPrevious = new Set<string>()
  const usedSquares = new Set<Square>()
  const reconciled: AnimatedPieceData[] = []

  const connect = (oldPiece: AnimatedPieceData, newPiece: PositionPiece) => {
    usedPrevious.add(oldPiece.id)
    usedSquares.add(newPiece.square)
    reconciled.push({
      ...oldPiece,
      square: newPiece.square,
      color: newPiece.color,
      type: newPiece.type,
      exiting: false,
    })
  }

  if (lastMove) {
    const movingPiece = active.find((piece) => piece.square === lastMove.from)
    const destinationPiece = position.find((piece) => piece.square === lastMove.to)

    // The type may change here because a promotion is still the same animated piece.
    if (movingPiece && destinationPiece && movingPiece.color === destinationPiece.color) {
      connect(movingPiece, destinationPiece)
    }
  }

  // Pieces that did not move retain their identity first.
  position.forEach((newPiece) => {
    if (usedSquares.has(newPiece.square)) return
    const exactMatch = active.find(
      (piece) =>
        !usedPrevious.has(piece.id) &&
        piece.square === newPiece.square &&
        piece.color === newPiece.color &&
        piece.type === newPiece.type,
    )
    if (exactMatch) connect(exactMatch, newPiece)
  })

  // This also pairs the rook during castling when only the king move was supplied.
  position.forEach((newPiece) => {
    if (usedSquares.has(newPiece.square)) return
    const closest = active
      .filter(
        (piece) =>
          !usedPrevious.has(piece.id) &&
          piece.color === newPiece.color &&
          piece.type === newPiece.type,
      )
      .sort(
        (left, right) =>
          squareDistance(left.square, newPiece.square) -
          squareDistance(right.square, newPiece.square),
      )[0]

    if (closest) {
      connect(closest, newPiece)
    } else {
      usedSquares.add(newPiece.square)
      reconciled.push({ ...newPiece, id: nextPieceId(newPiece) })
    }
  })

  const newExits = active
    .filter((piece) => !usedPrevious.has(piece.id))
    .map((piece) => ({ ...piece, exiting: true }))

  return [...reconciled, ...oldExits, ...newExits]
}

interface CameraSnapshot {
  orientation: ChessSceneProps['orientation']
  position: Vector3Tuple
}

interface CameraSnapshotRef {
  current: CameraSnapshot | null
}

function CameraRig({
  orientation,
  snapshotRef,
}: Pick<ChessSceneProps, 'orientation'> & { snapshotRef: CameraSnapshotRef }) {
  const { camera, size } = useThree()

  useEffect(() => {
    const preserved = snapshotRef.current
    if (preserved?.orientation === orientation) {
      snapshotRef.current = null
      camera.position.set(...preserved.position)
      camera.lookAt(0, 0.45, 0)
      camera.updateProjectionMatrix()
      return
    }

    const isPortrait = size.height > size.width * 1.12
    const distanceScale = isPortrait ? 1.28 : 1
    const side = orientation === 'white' ? 1 : -1
    camera.position.set(
      8.25 * side * distanceScale,
      8.1 * distanceScale,
      10.4 * side * distanceScale,
    )
    camera.lookAt(0, 0.35, 0)
    camera.updateProjectionMatrix()
  }, [camera, orientation, size.height, size.width, snapshotRef])

  useEffect(
    () => () => {
      snapshotRef.current = {
        orientation,
        position: camera.position.toArray() as Vector3Tuple,
      }
    },
    [camera, orientation, snapshotRef],
  )

  return null
}

interface PieceModelProps {
  type: PieceKind
  color: PieceColor
  material: THREE.Material
  accent: THREE.Material
}

type PieceSurface = 'body' | 'accent'

interface PieceGeometryPart {
  surface: PieceSurface
  geometry: THREE.BufferGeometry
  position?: Vector3Tuple
  rotation?: Vector3Tuple
  scale?: Vector3Tuple
}

const NO_RAYCAST: THREE.Mesh['raycast'] = () => {}

function bakeGeometryPart({
  geometry,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}: PieceGeometryPart) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  )
  return geometry.applyMatrix4(matrix)
}

/**
 * Builds the exact primitives used by the original JSX models, but bakes their
 * transforms and merges them into one body buffer and one accent buffer. The
 * buffers are shared by every piece of the same kind for the lifetime of the app.
 */
function buildPieceGeometry(type: PieceKind) {
  const parts: PieceGeometryPart[] = []
  const add = (
    surface: PieceSurface,
    geometry: THREE.BufferGeometry,
    position?: Vector3Tuple,
    rotation?: Vector3Tuple,
    scale?: Vector3Tuple,
  ) => parts.push({ surface, geometry, position, rotation, scale })

  add('body', new THREE.CylinderGeometry(0.39, 0.43, 0.11, 48), [0, 0.055, 0])
  add('body', new THREE.TorusGeometry(0.32, 0.065, 16, 48), [0, 0.13, 0], [Math.PI / 2, 0, 0])
  add('body', new THREE.CylinderGeometry(0.29, 0.36, 0.15, 48), [0, 0.205, 0])
  add('accent', new THREE.TorusGeometry(0.285, 0.018, 12, 48), [0, 0.287, 0], [Math.PI / 2, 0, 0])

  if (type === 'p') {
    add('body', new THREE.CylinderGeometry(0.255, 0.13, 0.48, 48), [0, 0.52, 0])
    add('accent', new THREE.TorusGeometry(0.15, 0.025, 12, 40), [0, 0.765, 0], [Math.PI / 2, 0, 0])
    add('body', new THREE.SphereGeometry(0.19, 36, 24), [0, 0.955, 0])
  } else if (type === 'r') {
    add('body', new THREE.CylinderGeometry(0.245, 0.3, 0.57, 40), [0, 0.57, 0])
    add('accent', new THREE.TorusGeometry(0.27, 0.027, 12, 48), [0, 0.855, 0], [Math.PI / 2, 0, 0])
    add('body', new THREE.CylinderGeometry(0.32, 0.29, 0.2, 32), [0, 0.965, 0])
    for (const offset of [-0.225, -0.075, 0.075, 0.225]) {
      add('body', new THREE.BoxGeometry(0.105, 0.18, 0.13), [offset, 1.105, -0.245])
      add('body', new THREE.BoxGeometry(0.13, 0.18, 0.105), [-0.245, 1.105, offset])
    }
  } else if (type === 'n') {
    add('body', new THREE.CylinderGeometry(0.29, 0.145, 0.72, 40), [0, 0.635, 0.035], [-0.18, 0, 0])
    add('accent', new THREE.TorusGeometry(0.205, 0.023, 12, 40), [0, 0.77, 0.015], [Math.PI / 2, 0, 0])
    add('body', new THREE.SphereGeometry(1, 36, 24), [0, 1.015, -0.12], [0.22, 0, 0], [0.22, 0.3, 0.31])
    add('body', new THREE.BoxGeometry(0.3, 0.2, 0.32), [0, 1.01, -0.355], [0.22, 0, 0])
    add('body', new THREE.CylinderGeometry(0.065, 0, 0.25, 24), [-0.105, 1.315, -0.05], [0.08, 0, -0.13])
    add('body', new THREE.CylinderGeometry(0.065, 0, 0.25, 24), [0.105, 1.315, -0.05], [0.08, 0, 0.13])
    add('accent', new THREE.SphereGeometry(1, 20, 14), [0, 1.05, 0.17], undefined, [0.055, 0.31, 0.09])
    add('accent', new THREE.SphereGeometry(0.024, 16, 12), [-0.118, 1.085, -0.43])
    add('accent', new THREE.SphereGeometry(0.024, 16, 12), [0.118, 1.085, -0.43])
  } else if (type === 'b') {
    add('body', new THREE.CylinderGeometry(0.29, 0.115, 0.66, 48), [0, 0.605, 0])
    add('accent', new THREE.TorusGeometry(0.2, 0.03, 12, 44), [0, 0.91, 0], [Math.PI / 2, 0, 0])
    add('body', new THREE.SphereGeometry(1, 40, 28), [0, 1.12, 0], undefined, [0.18, 0.27, 0.18])
    add('accent', new THREE.BoxGeometry(0.027, 0.3, 0.035), [0.035, 1.14, -0.165], [0.2, 0, -0.46])
    add('accent', new THREE.CylinderGeometry(0.075, 0, 0.18, 28), [0, 1.415, 0])
  } else if (type === 'q') {
    add('body', new THREE.CylinderGeometry(0.3, 0.105, 0.77, 56), [0, 0.66, 0])
    add('accent', new THREE.TorusGeometry(0.225, 0.035, 14, 48), [0, 1.02, 0], [Math.PI / 2, 0, 0])
    add('body', new THREE.CylinderGeometry(0.255, 0.18, 0.24, 40), [0, 1.17, 0])
    add('accent', new THREE.TorusGeometry(0.255, 0.025, 12, 48), [0, 1.29, 0], [Math.PI / 2, 0, 0])
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2
      add('accent', new THREE.SphereGeometry(0.064, 20, 14), [Math.sin(angle) * 0.24, 1.42, Math.cos(angle) * 0.24])
    }
    add('body', new THREE.SphereGeometry(0.15, 32, 22), [0, 1.47, 0])
    add('accent', new THREE.SphereGeometry(0.065, 24, 16), [0, 1.665, 0])
  } else {
    add('body', new THREE.CylinderGeometry(0.305, 0.11, 0.81, 56), [0, 0.68, 0])
    add('accent', new THREE.TorusGeometry(0.23, 0.035, 14, 48), [0, 1.055, 0], [Math.PI / 2, 0, 0])
    add('body', new THREE.CylinderGeometry(0.24, 0.18, 0.25, 40), [0, 1.2, 0])
    add('accent', new THREE.TorusGeometry(0.22, 0.024, 12, 44), [0, 1.335, 0], [Math.PI / 2, 0, 0])
    add('body', new THREE.SphereGeometry(0.13, 28, 20), [0, 1.46, 0])
    add('accent', new THREE.BoxGeometry(0.1, 0.39, 0.085), [0, 1.71, 0])
    add('accent', new THREE.BoxGeometry(0.32, 0.095, 0.085), [0, 1.76, 0])
  }

  const mergeSurface = (surface: PieceSurface) => {
    const geometries = parts.filter((part) => part.surface === surface).map(bakeGeometryPart)
    const merged = mergeGeometries(geometries, false)
    if (!merged) throw new Error(`Could not merge ${type} ${surface} geometry`)
    merged.computeBoundingBox()
    merged.computeBoundingSphere()
    geometries.forEach((geometry) => geometry.dispose())
    return merged
  }

  return { body: mergeSurface('body'), accent: mergeSurface('accent') }
}

const PIECE_GEOMETRIES = (['p', 'n', 'b', 'r', 'q', 'k'] as const).reduce(
  (geometries, type) => {
    geometries[type] = buildPieceGeometry(type)
    return geometries
  },
  {} as Record<PieceKind, { body: THREE.BufferGeometry; accent: THREE.BufferGeometry }>,
)

const PIECE_HIT_SHAPES: Record<
  PieceKind,
  { topRadius: number; bottomRadius: number; height: number }
> = {
  p: { topRadius: 0.2, bottomRadius: 0.42, height: 1.15 },
  n: { topRadius: 0.52, bottomRadius: 0.42, height: 1.47 },
  b: { topRadius: 0.17, bottomRadius: 0.42, height: 1.51 },
  r: { topRadius: 0.34, bottomRadius: 0.42, height: 1.2 },
  q: { topRadius: 0.34, bottomRadius: 0.42, height: 1.74 },
  k: { topRadius: 0.18, bottomRadius: 0.42, height: 1.82 },
}

function PieceModel({ type, color, material, accent }: PieceModelProps) {
  const geometry = PIECE_GEOMETRIES[type]
  return (
    <group rotation={[0, color === 'w' ? 0 : Math.PI, 0]} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={geometry.body}
        material={material}
        raycast={NO_RAYCAST}
        dispose={null}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={geometry.accent}
        material={accent}
        raycast={NO_RAYCAST}
        dispose={null}
      />
    </group>
  )
}

interface AnimatedPieceProps extends AnimatedPieceData {
  selected: boolean
  effectsEnabled: boolean
  onClick: (square: Square) => void
  onExited: (id: string) => void
}

function AnimatedPiece({
  id,
  square,
  color,
  type,
  exiting = false,
  selected,
  effectsEnabled,
  onClick,
  onExited,
}: AnimatedPieceProps) {
  const [x, z] = squareToWorld(square)
  const initialPosition = useRef<Vector3Tuple>([x, BOARD_TOP, z])
  const hitShape = PIECE_HIT_SHAPES[type]
  const group = useRef<THREE.Group>(null)
  const model = useRef<THREE.Group>(null)
  const motionStart = useRef(new THREE.Vector2(x, z))
  const motionEnd = useRef(new THREE.Vector2(x, z))
  const motionProgress = useRef(1)
  const exitProgress = useRef(0)
  const reportedExit = useRef(false)
  const [hovered, setHovered] = useState(false)

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: color === 'w' ? '#ebe3cf' : '#10252d',
        roughness: color === 'w' ? 0.25 : 0.2,
        metalness: color === 'w' ? 0.34 : 0.62,
        clearcoat: 0.82,
        clearcoatRoughness: 0.14,
        envMapIntensity: color === 'w' ? 1.05 : 1.3,
        emissive: color === 'w' ? '#6b5223' : '#0a4855',
        emissiveIntensity: 0,
        transparent: false,
      }),
    [color],
  )

  const accent = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: color === 'w' ? '#d5af58' : '#bd8138',
        roughness: 0.18,
        metalness: 0.92,
        clearcoat: 0.65,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.65,
        emissive: '#9d6724',
        emissiveIntensity: 0.08,
        transparent: false,
      }),
    [color],
  )

  useEffect(
    () => () => {
      material.dispose()
      accent.dispose()
    },
    [accent, material],
  )

  useEffect(() => {
    if (!group.current) return
    const current = group.current.position
    if (Math.abs(current.x - x) < 0.001 && Math.abs(current.z - z) < 0.001) return
    motionStart.current.set(current.x, current.z)
    motionEnd.current.set(x, z)
    motionProgress.current = 0
  }, [x, z])

  useEffect(() => {
    if (!exiting) return
    exitProgress.current = 0
    reportedExit.current = false
    // Opaque materials stay on Three's faster opaque path during normal play.
    // Captured pieces opt into blending only for their short exit animation.
    material.transparent = true
    accent.transparent = true
    material.needsUpdate = true
    accent.needsUpdate = true
  }, [accent, exiting, material])

  useFrame((state, delta) => {
    const pieceGroup = group.current
    const modelGroup = model.current
    if (!pieceGroup || !modelGroup) return

    const moving = motionProgress.current < 1 && !exiting
    const animatedSelection = selected && effectsEnabled
    const targetScale = selected ? 1.055 : hovered ? 1.025 : 1
    const targetEmissive = selected || hovered ? 0.16 : 0
    const settlingScale = Math.abs(modelGroup.scale.x - targetScale) > 0.0005
    const settlingRotation = !animatedSelection && Math.abs(modelGroup.rotation.y) > 0.0005
    const settlingHeight = !animatedSelection && Math.abs(pieceGroup.position.y - BOARD_TOP) > 0.0005
    const settlingEmissive = Math.abs(material.emissiveIntensity - targetEmissive) > 0.0005

    // The initial position contains 32 completely static pieces. Avoid all
    // per-piece trigonometry and matrix writes until a piece is actually active.
    if (
      !moving &&
      !exiting &&
      !animatedSelection &&
      !settlingScale &&
      !settlingRotation &&
      !settlingHeight &&
      !settlingEmissive
    ) {
      return
    }

    let lift = 0
    if (moving) {
      motionProgress.current = Math.min(1, motionProgress.current + delta / 0.46)
      const t = motionProgress.current
      const eased = t * t * (3 - 2 * t)
      pieceGroup.position.x = THREE.MathUtils.lerp(
        motionStart.current.x,
        motionEnd.current.x,
        eased,
      )
      pieceGroup.position.z = THREE.MathUtils.lerp(
        motionStart.current.y,
        motionEnd.current.y,
        eased,
      )
      lift = Math.sin(t * Math.PI) * 0.52
    } else {
      pieceGroup.position.x = THREE.MathUtils.damp(pieceGroup.position.x, x, 14, delta)
      pieceGroup.position.z = THREE.MathUtils.damp(pieceGroup.position.z, z, 14, delta)
    }

    const selectedBob = animatedSelection ? Math.sin(state.clock.elapsedTime * 3.2) * 0.045 : 0
    pieceGroup.position.y = BOARD_TOP + lift + selectedBob

    const currentScale = modelGroup.scale.x
    const nextScale = THREE.MathUtils.damp(currentScale, targetScale, 10, delta)
    modelGroup.scale.setScalar(nextScale)
    modelGroup.rotation.y = THREE.MathUtils.damp(
      modelGroup.rotation.y,
      animatedSelection ? Math.sin(state.clock.elapsedTime * 1.5) * 0.035 : 0,
      9,
      delta,
    )

    material.emissiveIntensity = THREE.MathUtils.damp(
      material.emissiveIntensity,
      targetEmissive,
      8,
      delta,
    )

    // Shadows only need another 2K render while a shadow-casting transform is
    // changing. Emissive-only settling deliberately does not invalidate them.
    if (moving || exiting || animatedSelection || settlingScale || settlingRotation || settlingHeight) {
      state.gl.shadowMap.needsUpdate = true
    }

    if (!exiting) return

    exitProgress.current = Math.min(1, exitProgress.current + delta / 0.48)
    const exit = exitProgress.current
    const easedExit = 1 - (1 - exit) ** 3
    const exitScale = Math.max(0.04, 1 - easedExit * 0.82)
    modelGroup.scale.setScalar(exitScale)
    modelGroup.rotation.y += delta * 4.2
    modelGroup.rotation.z = easedExit * (color === 'w' ? 0.48 : -0.48)
    pieceGroup.position.y = BOARD_TOP - easedExit * 0.28
    material.opacity = 1 - easedExit
    accent.opacity = 1 - easedExit
    material.depthWrite = exit < 0.45
    accent.depthWrite = exit < 0.45

    if (exit >= 1 && !reportedExit.current) {
      reportedExit.current = true
      onExited(id)
    }
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (exiting) return
    event.stopPropagation()
    onClick(square)
  }

  return (
    <group
      ref={group}
      position={initialPosition.current}
      onClick={handleClick}
      onPointerOver={(event) => {
        if (exiting) return
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {selected && !exiting && (
        <group position={[0, 0.025, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
            <torusGeometry args={[0.36, 0.025, 12, 64]} />
            <meshBasicMaterial
              color="#f4c96b"
              transparent
              opacity={0.8}
              toneMapped={false}
            />
          </mesh>
          {effectsEnabled && (
            <pointLight color="#f4bb55" intensity={3.5} distance={2.2} decay={2} />
          )}
        </group>
      )}
      <mesh visible={false} position={[0, hitShape.height / 2, 0]}>
        <cylinderGeometry
          args={[hitShape.topRadius, hitShape.bottomRadius, hitShape.height, 10]}
        />
        <meshBasicMaterial />
      </mesh>
      <group ref={model}>
        <PieceModel type={type} color={color} material={material} accent={accent} />
      </group>
    </group>
  )
}

interface BoardSquareData {
  square: Square
  isLight: boolean
}

const BOARD_SQUARES: BoardSquareData[] = Array.from({ length: 64 }, (_, index) => {
  const file = index % 8
  const rank = Math.floor(index / 8)
  return {
    square: `${FILES[file]}${rank + 1}` as Square,
    isLight: (file + rank) % 2 === 1,
  }
})
const LIGHT_SQUARES = BOARD_SQUARES.filter(({ isLight }) => isLight)
const DARK_SQUARES = BOARD_SQUARES.filter(({ isLight }) => !isLight)

function setInstanceMatrices(
  mesh: THREE.InstancedMesh,
  transforms: Array<{
    position: Vector3Tuple
    rotation?: Vector3Tuple
    scale?: Vector3Tuple
  }>,
) {
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const euler = new THREE.Euler()

  transforms.forEach((transform, index) => {
    position.set(...transform.position)
    euler.set(...(transform.rotation ?? [0, 0, 0]))
    quaternion.setFromEuler(euler)
    scale.set(...(transform.scale ?? [1, 1, 1]))
    mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale))
  })
  mesh.count = transforms.length
  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()
}

function BoardTileInstances({
  squares,
  geometry,
  material,
  onHover,
  onClick,
}: {
  squares: BoardSquareData[]
  geometry: THREE.BufferGeometry
  material: THREE.Material
  onHover: (square: Square | null) => void
  onClick: (square: Square) => void
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    if (!mesh.current) return
    setInstanceMatrices(
      mesh.current,
      squares.map(({ square }) => {
        const [x, z] = squareToWorld(square)
        return { position: [x, 0.28, z] }
      }),
    )
    mesh.current.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  }, [squares])

  const squareFromEvent = (event: ThreeEvent<MouseEvent | PointerEvent>) =>
    event.instanceId === undefined ? undefined : squares[event.instanceId]?.square

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, squares.length]}
      castShadow
      receiveShadow
      dispose={null}
      onClick={(event) => {
        const square = squareFromEvent(event)
        if (!square) return
        event.stopPropagation()
        onClick(square)
      }}
      onPointerMove={(event) => {
        const square = squareFromEvent(event)
        if (!square) return
        event.stopPropagation()
        onHover(square)
      }}
      onPointerOut={() => onHover(null)}
    />
  )
}

function MarkerInstances({
  capacity,
  transforms,
  geometry,
  material,
}: {
  capacity: number
  transforms: Array<{
    position: Vector3Tuple
    rotation?: Vector3Tuple
    scale?: Vector3Tuple
  }>
  geometry: THREE.BufferGeometry
  material: THREE.Material
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    if (mesh.current) setInstanceMatrices(mesh.current, transforms)
  }, [transforms])

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, capacity]}
      count={transforms.length}
      raycast={NO_RAYCAST}
      dispose={null}
    />
  )
}

function createCoordinateAtlas() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  const labels = [...FILES, ...Array.from({ length: 8 }, (_, index) => String(index + 1))]

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '700 62px ui-sans-serif, system-ui, sans-serif'
    context.shadowColor = 'rgba(0, 0, 0, 0.72)'
    context.shadowBlur = 9
    context.fillStyle = '#d8bb7b'
    labels.forEach((label, index) => {
      context.fillText(label.toUpperCase(), (index % 4) * 128 + 64, Math.floor(index / 4) * 128 + 66)
    })
  }

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  map.needsUpdate = true
  return map
}

function createCoordinatesGeometry(orientation: ChessSceneProps['orientation']) {
  const side = orientation === 'white' ? 1 : -1
  const rotation: Vector3Tuple = [-Math.PI / 2, 0, orientation === 'white' ? 0 : Math.PI]
  const positions: Vector3Tuple[] = [
    ...Array.from({ length: 8 }, (_, index) => [index - 3.5, 0.365, 4.28 * side] as Vector3Tuple),
    ...Array.from({ length: 8 }, (_, index) => [-4.28 * side, 0.365, 3.5 - index] as Vector3Tuple),
  ]

  const geometries = positions.map((position, index) => {
    const geometry = new THREE.PlaneGeometry(0.25, 0.25)
    const uv = geometry.getAttribute('uv')
    const column = index % 4
    const rowFromBottom = 3 - Math.floor(index / 4)
    for (let vertex = 0; vertex < uv.count; vertex += 1) {
      uv.setXY(
        vertex,
        (column + uv.getX(vertex)) / 4,
        (rowFromBottom + uv.getY(vertex)) / 4,
      )
    }
    uv.needsUpdate = true
    geometry.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(1, 1, 1),
      ),
    )
    return geometry
  })

  const merged = mergeGeometries(geometries, false)
  if (!merged) throw new Error('Could not merge coordinate label geometry')
  geometries.forEach((geometry) => geometry.dispose())
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function Coordinates({ orientation }: Pick<ChessSceneProps, 'orientation'>) {
  const texture = useMemo(createCoordinateAtlas, [])
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        toneMapped: false,
      }),
    [texture],
  )
  const geometry = useMemo(() => createCoordinatesGeometry(orientation), [orientation])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(
    () => () => {
      material.dispose()
      texture.dispose()
    },
    [material, texture],
  )

  return (
    <mesh
      geometry={geometry}
      material={material}
      raycast={NO_RAYCAST}
      dispose={null}
    />
  )
}

const BOARD_TRIMS = [
  { position: [0, 0.258, 4.12], scale: [8.23, 0.07, 0.055] },
  { position: [0, 0.258, -4.12], scale: [8.23, 0.07, 0.055] },
  { position: [4.12, 0.258, 0], scale: [0.055, 0.07, 8.23] },
  { position: [-4.12, 0.258, 0], scale: [0.055, 0.07, 8.23] },
] as Array<{ position: Vector3Tuple; scale: Vector3Tuple }>

function BoardTrims() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#b78237',
        metalness: 0.94,
        roughness: 0.16,
        clearcoat: 0.6,
      }),
    [],
  )

  useLayoutEffect(() => {
    if (!mesh.current) return
    setInstanceMatrices(mesh.current, BOARD_TRIMS)
    mesh.current.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, BOARD_TRIMS.length]}
      raycast={NO_RAYCAST}
      dispose={null}
    />
  )
}

function Board({
  position,
  selectedSquare,
  legalMoves,
  lastMove,
  orientation,
  onSquareClick,
}: {
  position: PositionPiece[]
  selectedSquare: Square | null
  legalMoves: Square[]
  lastMove?: { from: Square; to: Square } | null
  orientation: ChessSceneProps['orientation']
  onSquareClick: (square: Square) => void
}) {
  const [hoveredSquare, setHoveredSquare] = useState<Square | null>(null)
  const legalSet = useMemo(() => new Set(legalMoves), [legalMoves])
  const occupiedSet = useMemo(() => new Set(position.map((piece) => piece.square)), [position])
  const lightMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d7d1bd',
        roughness: 0.3,
        metalness: 0.18,
        clearcoat: 0.74,
        clearcoatRoughness: 0.18,
        envMapIntensity: 0.9,
      }),
    [],
  )
  const darkMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#17363c',
        roughness: 0.24,
        metalness: 0.46,
        clearcoat: 0.88,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.15,
      }),
    [],
  )
  const tileGeometry = useMemo(() => new THREE.BoxGeometry(0.968, 0.12, 0.968), [])
  const markerGeometries = useMemo(
    () => ({
      last: new THREE.PlaneGeometry(0.91, 0.91),
      selected: new THREE.PlaneGeometry(0.9, 0.9),
      hover: new THREE.PlaneGeometry(0.88, 0.88),
      occupied: new THREE.TorusGeometry(0.36, 0.045, 14, 56),
      empty: new THREE.CylinderGeometry(0.105, 0.105, 0.025, 32),
    }),
    [],
  )
  const markerMaterials = useMemo(
    () => ({
      lastLight: new THREE.MeshBasicMaterial({
        color: '#42a9b6',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        toneMapped: false,
      }),
      lastDark: new THREE.MeshBasicMaterial({
        color: '#66d3d0',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        toneMapped: false,
      }),
      selected: new THREE.MeshBasicMaterial({
        color: '#edbd59',
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        toneMapped: false,
      }),
      hover: new THREE.MeshBasicMaterial({
        color: '#dbe9e7',
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
        toneMapped: false,
      }),
      occupied: new THREE.MeshBasicMaterial({
        color: '#f5c967',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      }),
      empty: new THREE.MeshBasicMaterial({
        color: '#f5c967',
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [],
  )

  useEffect(
    () => () => {
      lightMaterial.dispose()
      darkMaterial.dispose()
      tileGeometry.dispose()
      Object.values(markerGeometries).forEach((geometry) => geometry.dispose())
      Object.values(markerMaterials).forEach((material) => material.dispose())
    },
    [darkMaterial, lightMaterial, markerGeometries, markerMaterials, tileGeometry],
  )

  const markers = useMemo(() => {
    type MarkerTransform = {
      position: Vector3Tuple
      rotation?: Vector3Tuple
    }
    const result: Record<
      'lastLight' | 'lastDark' | 'selected' | 'hover' | 'occupied' | 'empty',
      MarkerTransform[]
    > = {
      lastLight: [],
      lastDark: [],
      selected: [],
      hover: [],
      occupied: [],
      empty: [],
    }

    BOARD_SQUARES.forEach(({ square, isLight }) => {
      const [x, z] = squareToWorld(square)
      const isSelected = selectedSquare === square
      const isLegal = legalSet.has(square)

      if (lastMove?.from === square || lastMove?.to === square) {
        result[isLight ? 'lastLight' : 'lastDark'].push({
          position: [x, 0.346, z],
          rotation: [-Math.PI / 2, 0, 0],
        })
      }
      if (isSelected) {
        result.selected.push({
          position: [x, 0.35, z],
          rotation: [-Math.PI / 2, 0, 0],
        })
      }
      if (hoveredSquare === square && !isSelected && !isLegal) {
        result.hover.push({
          position: [x, 0.352, z],
          rotation: [-Math.PI / 2, 0, 0],
        })
      }
      if (isLegal) {
        result[occupiedSet.has(square) ? 'occupied' : 'empty'].push({
          position: [x, occupiedSet.has(square) ? 0.39 : 0.38, z],
          rotation: occupiedSet.has(square) ? [Math.PI / 2, 0, 0] : undefined,
        })
      }
    })

    return result
  },
    [hoveredSquare, lastMove?.from, lastMove?.to, legalSet, occupiedSet, selectedSquare],
  )

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, -0.055, 0]} raycast={NO_RAYCAST}>
        <boxGeometry args={[9.72, 0.35, 9.72]} />
        <meshPhysicalMaterial
          color="#07161c"
          metalness={0.72}
          roughness={0.24}
          clearcoat={0.85}
          clearcoatRoughness={0.13}
          envMapIntensity={1.3}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.14, 0]} raycast={NO_RAYCAST}>
        <boxGeometry args={[9.38, 0.2, 9.38]} />
        <meshPhysicalMaterial
          color="#142a30"
          metalness={0.58}
          roughness={0.2}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
        />
      </mesh>

      <BoardTrims />

      <BoardTileInstances
        squares={LIGHT_SQUARES}
        geometry={tileGeometry}
        material={lightMaterial}
        onHover={setHoveredSquare}
        onClick={onSquareClick}
      />
      <BoardTileInstances
        squares={DARK_SQUARES}
        geometry={tileGeometry}
        material={darkMaterial}
        onHover={setHoveredSquare}
        onClick={onSquareClick}
      />

      <MarkerInstances capacity={2} transforms={markers.lastLight} geometry={markerGeometries.last} material={markerMaterials.lastLight} />
      <MarkerInstances capacity={2} transforms={markers.lastDark} geometry={markerGeometries.last} material={markerMaterials.lastDark} />
      <MarkerInstances capacity={1} transforms={markers.selected} geometry={markerGeometries.selected} material={markerMaterials.selected} />
      <MarkerInstances capacity={1} transforms={markers.hover} geometry={markerGeometries.hover} material={markerMaterials.hover} />
      <MarkerInstances capacity={32} transforms={markers.occupied} geometry={markerGeometries.occupied} material={markerMaterials.occupied} />
      <MarkerInstances capacity={32} transforms={markers.empty} geometry={markerGeometries.empty} material={markerMaterials.empty} />

      <Coordinates orientation={orientation} />
    </group>
  )
}

function PillarInstances({ positions }: { positions: Vector3Tuple[] }) {
  const pillars = useRef<THREE.InstancedMesh>(null)
  const rings = useRef<THREE.InstancedMesh>(null)
  const resources = useMemo(
    () => ({
      pillarGeometry: new THREE.CylinderGeometry(0.11, 0.18, 4.2, 18),
      pillarMaterial: new THREE.MeshPhysicalMaterial({
        color: '#122932',
        metalness: 0.72,
        roughness: 0.24,
        transparent: true,
        opacity: 0.72,
      }),
      ringGeometry: new THREE.TorusGeometry(0.16, 0.025, 10, 32),
      ringMaterial: new THREE.MeshBasicMaterial({ color: '#b58039', toneMapped: false }),
    }),
    [],
  )

  useLayoutEffect(() => {
    if (pillars.current) {
      setInstanceMatrices(
        pillars.current,
        positions.map((position) => ({ position })),
      )
      pillars.current.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    }
    if (rings.current) {
      setInstanceMatrices(
        rings.current,
        positions.map(([x, y, z]) => ({
          position: [x, y + 1.6, z],
          rotation: [Math.PI / 2, 0, 0],
        })),
      )
      rings.current.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    }
  }, [positions])

  useEffect(
    () => () => {
      resources.pillarGeometry.dispose()
      resources.pillarMaterial.dispose()
      resources.ringGeometry.dispose()
      resources.ringMaterial.dispose()
    },
    [resources],
  )

  return (
    <>
      <instancedMesh
        ref={pillars}
        args={[resources.pillarGeometry, resources.pillarMaterial, positions.length]}
        castShadow
        raycast={NO_RAYCAST}
        dispose={null}
      />
      <instancedMesh
        ref={rings}
        args={[resources.ringGeometry, resources.ringMaterial, positions.length]}
        raycast={NO_RAYCAST}
        dispose={null}
      />
    </>
  )
}

function Pedestal({ effectsEnabled }: Pick<ChessSceneProps, 'effectsEnabled'>) {
  const pillars = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2 + Math.PI / 8
        return [Math.sin(angle) * 9.2, 1.35, Math.cos(angle) * 9.2] as Vector3Tuple
      }),
    [],
  )

  return (
    <group>
      <mesh receiveShadow position={[0, -0.78, 0]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[12.5, 13.2, 0.3, 96]} />
        <meshPhysicalMaterial color="#050d12" roughness={0.27} metalness={0.62} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.48, 0]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[7.15, 7.55, 0.48, 96]} />
        <meshPhysicalMaterial
          color="#0a1c23"
          roughness={0.22}
          metalness={0.7}
          clearcoat={0.82}
          clearcoatRoughness={0.16}
        />
      </mesh>
      <mesh position={[0, -0.225, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
        <torusGeometry args={[7.08, 0.045, 12, 128]} />
        <meshBasicMaterial color="#a97432" toneMapped={false} />
      </mesh>
      {[8.2, 10.2, 12.1].map((radius, index) => (
        <mesh key={radius} position={[0, -0.605 + index * 0.018, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
          <torusGeometry args={[radius, 0.018, 8, 160]} />
          <meshBasicMaterial
            color={index === 1 ? '#285865' : '#805c2e'}
            transparent
            opacity={0.4 - index * 0.06}
            toneMapped={false}
          />
        </mesh>
      ))}

      {effectsEnabled && <PillarInstances positions={pillars} />}

      <mesh receiveShadow position={[0, -0.94, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
        <planeGeometry args={[70, 70]} />
        <meshPhysicalMaterial
          color="#03090d"
          roughness={0.3}
          metalness={0.48}
          clearcoat={0.35}
          clearcoatRoughness={0.25}
          envMapIntensity={0.6}
        />
      </mesh>
    </group>
  )
}

function Lighting({ effectsEnabled }: Pick<ChessSceneProps, 'effectsEnabled'>) {
  return (
    <>
      <ambientLight intensity={0.34} color="#b9d3d6" />
      <hemisphereLight intensity={0.62} color="#bce6eb" groundColor="#071015" />
      <spotLight
        castShadow
        position={[4.8, 10.5, 6.5]}
        color="#ffe2ad"
        intensity={78}
        distance={28}
        angle={0.48}
        penumbra={0.86}
        decay={2}
        shadow-mapSize-width={effectsEnabled ? 2048 : 1024}
        shadow-mapSize-height={effectsEnabled ? 2048 : 1024}
        shadow-bias={-0.00012}
        shadow-normalBias={0.025}
      />
      <spotLight
        position={[-6.5, 7.2, -4.5]}
        color="#54bed1"
        intensity={48}
        distance={25}
        angle={0.55}
        penumbra={0.92}
        decay={2}
      />
      <pointLight position={[-5.5, 2.2, 5.5]} color="#d18c40" intensity={14} distance={12} decay={2} />
      <pointLight position={[6.5, 1.3, -5]} color="#268ca2" intensity={18} distance={13} decay={2} />

      <Environment resolution={effectsEnabled ? 256 : 128} frames={1}>
        <Lightformer
          form="rect"
          color="#ffe3b2"
          intensity={2.2}
          position={[0, 7, -7]}
          rotation={[Math.PI / 4, 0, 0]}
          scale={[8, 5, 1]}
        />
        <Lightformer
          form="rect"
          color="#61c8d7"
          intensity={1.8}
          position={[-7, 3, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[5, 4, 1]}
        />
        <Lightformer
          form="ring"
          color="#b97a35"
          intensity={1.6}
          position={[6, 2, 4]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[3, 3, 1]}
        />
      </Environment>
    </>
  )
}

function ShadowInvalidator({
  fen,
  selectedSquare,
  effectsEnabled,
}: Pick<ChessSceneProps, 'fen' | 'selectedSquare' | 'effectsEnabled'>) {
  const { gl } = useThree()

  useLayoutEffect(() => {
    gl.shadowMap.needsUpdate = true
  }, [effectsEnabled, fen, gl, selectedSquare])

  return null
}

function ChessWorld({
  fen,
  selectedSquare,
  legalMoves,
  lastMove,
  onSquareClick,
  orientation,
  effectsEnabled,
  cameraSnapshotRef,
}: ChessSceneProps & { cameraSnapshotRef: CameraSnapshotRef }) {
  const { gl } = useThree()
  const position = useMemo(() => parseFen(fen), [fen])
  const [pieces, setPieces] = useState<AnimatedPieceData[]>(() =>
    position.map((piece) => ({ ...piece, id: nextPieceId(piece) })),
  )

  useEffect(() => {
    setPieces((previous) => reconcilePieces(previous, position, lastMove))
  }, [lastMove?.from, lastMove?.to, position])

  const removeExited = useCallback((id: string) => {
    setPieces((current) => current.filter((piece) => piece.id !== id))
  }, [])

  // The final exit frame still contains the captured mesh. Invalidate again
  // after React commits its removal so the cached shadow cannot retain a ghost.
  useLayoutEffect(() => {
    gl.shadowMap.needsUpdate = true
  }, [gl, pieces])

  return (
    <>
      <color attach="background" args={['#030b10']} />
      <fog attach="fog" args={['#030b10', 15, 32]} />
      <CameraRig orientation={orientation} snapshotRef={cameraSnapshotRef} />
      <ShadowInvalidator
        fen={fen}
        selectedSquare={selectedSquare}
        effectsEnabled={effectsEnabled}
      />
      <Lighting effectsEnabled={effectsEnabled} />
      <Pedestal effectsEnabled={effectsEnabled} />
      <Board
        position={position}
        selectedSquare={selectedSquare}
        legalMoves={legalMoves}
        lastMove={lastMove}
        orientation={orientation}
        onSquareClick={onSquareClick}
      />

      {pieces.map((piece) => (
        <AnimatedPiece
          key={piece.id}
          {...piece}
          selected={!piece.exiting && selectedSquare === piece.square}
          effectsEnabled={effectsEnabled}
          onClick={onSquareClick}
          onExited={removeExited}
        />
      ))}

      {effectsEnabled && (
        <Sparkles
          count={58}
          scale={[20, 7, 20]}
          position={[0, 1.8, 0]}
          size={1.15}
          speed={0.18}
          opacity={0.22}
          color="#d5aa62"
          noise={1.4}
        />
      )}

      <OrbitControls
        makeDefault
        target={[0, 0.45, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.48}
        zoomSpeed={0.65}
        minDistance={8.8}
        maxDistance={22}
        minPolarAngle={0.42}
        maxPolarAngle={1.27}
      />

      {effectsEnabled && (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom
            mipmapBlur
            intensity={0.32}
            luminanceThreshold={1.05}
            luminanceSmoothing={0.25}
          />
          <Vignette eskil={false} offset={0.15} darkness={0.72} />
        </EffectComposer>
      )}
    </>
  )
}

export const ChessScene = memo(function ChessScene(props: ChessSceneProps) {
  const cameraSnapshotRef = useRef<CameraSnapshot | null>(null)

  return (
    <div
      role="img"
      aria-label="Tabuleiro de xadrez tridimensional interativo"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 420,
        overflow: 'hidden',
        background: '#030b10',
        touchAction: 'none',
      }}
    >
      <Canvas
        key={props.effectsEnabled ? 'postprocessed' : 'direct'}
        shadows
        dpr={[1, props.effectsEnabled ? 1.75 : 1.35]}
        camera={{ fov: 39, near: 0.1, far: 70, position: [8.25, 8.1, 10.4] }}
        gl={{
          // The effect composer owns 4x MSAA when enabled. The direct renderer
          // keeps native context AA, so neither path pays for two MSAA buffers.
          antialias: !props.effectsEnabled,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
          gl.shadowMap.type = THREE.PCFSoftShadowMap
          gl.shadowMap.autoUpdate = false
          gl.shadowMap.needsUpdate = true
        }}
      >
        <ChessWorld {...props} cameraSnapshotRef={cameraSnapshotRef} />
      </Canvas>
    </div>
  )
})

export default ChessScene
