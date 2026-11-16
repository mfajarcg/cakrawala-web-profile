import { STATIONS, type StationId } from '../journey/stations'

const BRAND = '#408fb4'
const BRAND_DARK = '#2e6f8e'
const INK = '#22303a'
const PAPER = '#ffffff'
const WARM = '#f2b23c'
const GREEN = '#5aa66f'

function Box({
  args,
  position,
  color,
  rotation,
}: {
  args: [number, number, number]
  position: [number, number, number]
  color: string
  rotation?: [number, number, number]
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

function Cylinder({
  args,
  position,
  color,
  rotation,
}: {
  args: [number, number, number, number]
  position: [number, number, number]
  color: string
  rotation?: [number, number, number]
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Cylinder args={[0.12, 0.16, 0.7, 6]} position={[0, 0.35, 0]} color="#8a6b4a" />
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.75, 1.4, 6]} />
        <meshStandardMaterial color={GREEN} flatShading />
      </mesh>
    </group>
  )
}

function StationProp({ id }: { id: StationId }) {
  switch (id) {
    case 'hero':
      return (
        <group>
          <Cylinder args={[0.35, 0.45, 4.4, 8]} position={[-3.4, 2.2, 0]} color={BRAND_DARK} />
          <Cylinder args={[0.35, 0.45, 4.4, 8]} position={[3.4, 2.2, 0]} color={BRAND_DARK} />
          <Box args={[8.4, 1, 0.8]} position={[0, 4.7, 0]} color={BRAND} />
          <Box args={[7, 0.6, 0.5]} position={[0, 4.7, 0.2]} color={PAPER} />
        </group>
      )
    case 'story':
      return (
        <group>
          {[0, 1, 2, 3, 4].map((i) => (
            <group key={i} position={[i * 2.6 - 5.2, 0, i % 2 === 0 ? 1.6 : -1.6]}>
              <Box args={[1.6, 0.12, 1]} position={[0, 0.85, 0]} color={PAPER} />
              <Box args={[0.12, 0.85, 0.12]} position={[-0.7, 0.42, 0]} color={INK} />
              <Box args={[0.12, 0.85, 0.12]} position={[0.7, 0.42, 0]} color={INK} />
              <Box args={[0.6, 0.4, 0.06]} position={[0, 1.15, -0.2]} color={[BRAND, WARM, GREEN, BRAND_DARK, INK][i]} />
            </group>
          ))}
        </group>
      )
    case 'services':
      return (
        <group>
          <Box args={[6, 3.4, 0.5]} position={[0, 1.7, -0.8]} color={BRAND_DARK} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <Box
                key={`${r}-${c}`}
                args={[1.4, 0.9, 0.9]}
                position={[c * 1.8 - 1.8, r * 1.05 + 0.7, 0]}
                color={[BRAND, PAPER, WARM][(r + c) % 3]}
              />
            )),
          )}
        </group>
      )
    case 'credibility':
      return (
        <group>
          <Box args={[7, 3.2, 0.4]} position={[0, 1.8, -0.6]} color={BRAND_DARK} />
          <Box args={[6.4, 2.4, 0.15]} position={[0, 1.9, -0.35]} color={PAPER} />
          {[0, 1, 2, 3].map((i) => (
            <group key={i} position={[i * 1.9 - 2.85, 2.4, 0]}>
              <Cylinder args={[0.55, 0.55, 0.15, 16]} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={WARM} />
              <Box args={[0.22, 0.7, 0.06]} position={[0, -0.7, 0]} color={[BRAND, WARM, GREEN, BRAND_DARK][i]} />
            </group>
          ))}
        </group>
      )
    case 'numbers':
      return (
        <group>
          <Cylinder args={[0.18, 0.24, 3.2, 8]} position={[-2.6, 1.6, 0]} color={INK} />
          <Cylinder args={[0.18, 0.24, 3.2, 8]} position={[2.6, 1.6, 0]} color={INK} />
          <Box args={[6.6, 2.6, 0.4]} position={[0, 3.6, 0]} color={BRAND} />
          <Box args={[5.8, 1.8, 0.2]} position={[0, 3.6, 0.15]} color={PAPER} />
        </group>
      )
    case 'signature':
      return (
        <group>
          <Box args={[5.4, 0.18, 2.6]} position={[0, 0.9, 0]} color={PAPER} />
          {[0, 1, 2].map((i) => (
            <group key={i} position={[i * 1.9 - 1.9, 0, i % 2 === 0 ? 1.4 : -1.3]}>
              <Cylinder args={[0.3, 0.3, 0.1, 10]} position={[0, 0.45, 0]} color={INK} />
              <Box args={[0.1, 0.45, 0.1]} position={[0, 0.22, 0]} color={INK} />
            </group>
          ))}
          {[0, 1, 2].map((i) => (
            <Box key={`m${i}`} args={[1.3, 0.85, 0.08]} position={[i * 1.9 - 1.9, 1.55, -0.9]} color={i === 1 ? WARM : BRAND} />
          ))}
          <Box args={[5.4, 1.1, 0.15]} position={[0, 1.5, -1]} color={INK} />
        </group>
      )
    case 'market':
      return (
        <group>
          <Box args={[6.4, 3.6, 0.3]} position={[0, 2, -0.5]} color={BRAND_DARK} rotation={[-0.12, 0, 0]} />
          {[
            [-2.2, 2.9, 0],
            [-0.8, 2.2, 0],
            [0.4, 3.2, 0],
            [1.6, 2.4, 0],
            [2.5, 3, 0],
          ].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0.2]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.22, 0.7, 8]} />
              <meshStandardMaterial color={i % 2 ? WARM : BRAND} flatShading />
            </mesh>
          ))}
        </group>
      )
    case 'about':
      return (
        <group>
          <Box args={[4.6, 2.6, 3.4]} position={[0, 1.3, 0]} color={'#e3d7c3'} />
          <mesh position={[0, 3.1, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[3.2, 1.4, 4]} />
            <meshStandardMaterial color={BRAND} flatShading />
          </mesh>
          <Cylinder args={[0.06, 0.06, 2.2, 6]} position={[2.9, 3.4, 0]} color={INK} />
          <Box args={[1.3, 0.7, 0.05]} position={[3.55, 4.1, 0]} color={WARM} />
        </group>
      )
    case 'play':
      return (
        <group>
          {/* no plaza slab: the build zone is the same ground the character walks */}
          <Cylinder args={[0.08, 0.1, 3, 6]} position={[6.2, 1.5, -5]} color={INK} />
          <Box args={[2.8, 1.2, 0.1]} position={[6.2, 2.9, -5]} color={BRAND} />
        </group>
      )
    case 'contact':
      return (
        <group>
          <Box args={[4.8, 1.1, 1.2]} position={[0, 0.55, 0.8]} color={PAPER} />
          <Box args={[4.8, 0.16, 1.4]} position={[0, 1.18, 0.8]} color={BRAND} />
          <Cylinder args={[0.5, 0.6, 1.3, 10]} position={[-2.6, 0.65, -0.8]} color={INK} />
          <Box args={[0.9, 0.5, 0.5]} position={[-2.6, 1.55, -0.8]} color={WARM} />
          <group position={[2.6, 0, -0.8]}>
            <Cylinder args={[0.06, 0.06, 2.4, 6]} position={[0, 1.2, 0]} color={INK} />
            <mesh position={[0, 2.6, 0]}>
              <sphereGeometry args={[0.45, 10, 8]} />
              <meshStandardMaterial color={BRAND} flatShading />
            </mesh>
          </group>
        </group>
      )
    case 'footer':
      return (
        <group>
          <Cylinder args={[0.35, 0.45, 5, 8]} position={[-3, 2.5, 0]} color={BRAND_DARK} />
          <Cylinder args={[0.35, 0.45, 5, 8]} position={[3, 2.5, 0]} color={BRAND_DARK} />
          <Box args={[7.4, 1.1, 0.8]} position={[0, 5.2, 0]} color={WARM} />
          <group position={[0, 0, -2.5]}>
            <Cylinder args={[0.08, 0.08, 6, 6]} position={[0, 3, 0]} color={INK} />
            <Box args={[2.6, 1.5, 0.06]} position={[1.35, 5.2, 0]} color={BRAND} />
          </group>
        </group>
      )
  }
}

export function Stations() {
  return (
    <group>
      {STATIONS.map((s) => {
        const dir = s.side === 'left' ? -1 : 1
        return (
          <group key={s.id} position={[s.x, 0, s.z + dir * 7.5]}>
            <group rotation={[0, s.side === 'left' ? 0.5 : -0.5, 0]}>
              <StationProp id={s.id} />
            </group>
          </group>
        )
      })}
      {/* scattered trees */}
      {STATIONS.map((s, i) => (
        <Tree
          key={`t${i}`}
          position={[s.x + (i % 2 === 0 ? 9 : -9), 0, s.z + (i % 3 === 0 ? -11 : 12)]}
          scale={0.8 + (i % 3) * 0.25}
        />
      ))}
    </group>
  )
}
