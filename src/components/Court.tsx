import * as THREE from 'three';

export function Court() {
  const L = 23.77;
  const W = 8.23;
  const serviceW = 5.48;

  return (
    <group>
      {/* Base court surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W + 1.2, L + 1.2]} />
        <meshStandardMaterial color="#1a4d2e" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Playing area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color="#2d6a3a" roughness={0.8} />
      </mesh>

      {/* Outer lines */}
      {[
        [0, L / 2],
        [0, -L / 2],
      ].map(([x, z], i) => (
        <mesh key={`bl${i}`} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W, 0.08]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      ))}
      {[
        [W / 2, 0],
        [-W / 2, 0],
      ].map(([x, z], i) => (
        <mesh key={`sl${i}`} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, L]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      ))}

      {/* Service lines */}
      <mesh position={[0, 0.012, 6.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[serviceW, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.012, -6.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[serviceW, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>

      {/* Center service line */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.05, 12.8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>

      {/* Net */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[W + 0.3, 1.0, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.65} roughness={0.6} />
      </mesh>
      {/* Net top tape */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[W + 0.4, 0.06, 0.08]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Net posts */}
      {[-W / 2 - 0.15, W / 2 + 0.15].map((x, i) => (
        <mesh key={`post${i}`} position={[x, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.15, 12]} />
          <meshStandardMaterial color="#333" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
