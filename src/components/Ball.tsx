import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BallEngine } from '../engines/BallEngine';

export function Ball({ engine, simTime }: { engine: BallEngine; simTime: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const spinAccum = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;

    const pos = engine.getPosition(simTime);
    ref.current.position.copy(pos);

    const spin = engine.params.spin;
    let spinSpeed = 8;
    if (spin === 'topspin') spinSpeed = 18;
    else if (spin === 'slice') spinSpeed = -12;

    spinAccum.current += delta * spinSpeed;

    // Topspin / slice mainly around X axis, with some side spin
    ref.current.rotation.x = spinAccum.current;
    ref.current.rotation.z = spinAccum.current * 0.35;
    if (spin === 'slice') {
      ref.current.rotation.y = spinAccum.current * 0.6;
    } else {
      ref.current.rotation.y = spinAccum.current * 0.15;
    }
  });

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.067, 32, 32]} />
      <meshStandardMaterial
        color="#d4e800"
        roughness={0.4}
        metalness={0.08}
      />
      {/* Simple seam lines for visual spin feedback */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.067, 0.004, 8, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.067, 0.003, 8, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
    </mesh>
  );
}
