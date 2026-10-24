import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BallEngine } from '../engines/BallEngine';

export function Ball({ engine, simTime }: { engine: BallEngine; simTime: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const pos = engine.getPosition(simTime);
    ref.current.position.copy(pos);
    // Slight spin visual
    ref.current.rotation.x += 0.08;
    ref.current.rotation.z += 0.05;
  });
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.067, 24, 24]} />
      <meshStandardMaterial
        color="#d4e800"
        roughness={0.45}
        metalness={0.05}
      />
    </mesh>
  );
}
