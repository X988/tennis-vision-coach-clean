import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BallEngine } from '../engines/BallEngine';

export function Ball({ engine, simTime }: { engine: BallEngine; simTime: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    ref.current.position.copy(engine.getPosition(simTime));
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.067, 16, 16]} />
      <meshStandardMaterial color="#c8e600" />
    </mesh>
  );
}
