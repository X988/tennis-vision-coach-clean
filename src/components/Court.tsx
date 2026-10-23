import * as THREE from 'three';

export function Court() {
  const L = 23.77, W = 8.23;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>
      {[[0, L / 2], [0, -L / 2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W, 0.05]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
      {[[W / 2, 0], [-W / 2, 0]].map(([x, z], i) => (
        <mesh key={'s' + i} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, L]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[W, 0.91, 0.04]} />
        <meshStandardMaterial color="#222" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
