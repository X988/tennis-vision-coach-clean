import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimationEngine } from '../engines/AnimationEngine';
import type { Stance } from '../engines/DecisionEngine';

const footOffsets: Record<Stance, [number, number, number, number]> = {
  open: [0.35, 0.55, -0.15, 0.2],
  'semi-open': [0.25, 0.4, -0.05, 0.15],
  neutral: [0.15, 0.15, 0, 0],
  closed: [-0.1, 0.25, 0.15, -0.1],
};

export function Player({
  pos, stance, shot, handed, anim, simTime
}: {
  pos: THREE.Vector3;
  stance: Stance;
  shot: 'forehand' | 'backhand';
  handed: 'right' | 'left';
  anim: AnimationEngine;
  simTime: number;
}) {
  const arm = useRef<THREE.Mesh>(null!);
  const armOther = useRef<THREE.Mesh>(null!);
  const wrist = useRef<THREE.Mesh>(null!);
  const torso = useRef<THREE.Mesh>(null!);
  const hips = useRef<THREE.Mesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const footL = useRef<THREE.Mesh>(null!);
  const footR = useRef<THREE.Mesh>(null!);
  const [fx1, fz1, fx2, fz2] = footOffsets[stance];
  const side = handed === 'right' ? 1 : -1;
  const isFH = (shot === 'forehand') === (handed === 'right');

  useFrame(() => {
    if (group.current) group.current.position.copy(pos);
    const p = anim.progress();
    const swing = Math.sin(p * Math.PI * 2) * 1.4;
    const prep = Math.sin(p * Math.PI) * 0.8;
    const wristSnap = Math.sin((p - 0.15) * Math.PI * 2.2) * 0.9;
    // Kinetic chain: hips lead, then torso
    const hipRot = Math.sin((p - 0.08) * Math.PI * 2) * 0.55 * side;
    const torsoRot = Math.sin(p * Math.PI * 2) * 0.7 * side;

    if (hips.current) hips.current.rotation.y = hipRot;
    if (torso.current) torso.current.rotation.y = torsoRot;

    if (arm.current) {
      arm.current.rotation.z = (isFH ? -1 : 1) * swing * side * 0.9;
      arm.current.rotation.y = swing * 0.6 * side;
      arm.current.rotation.x = -prep * 0.4;
      arm.current.position.y = 1.2 + Math.abs(swing) * 0.08;
    }

    if (wrist.current) {
      wrist.current.rotation.z = (isFH ? -1 : 1) * wristSnap * side * 1.1;
      wrist.current.rotation.x = wristSnap * 0.4;
      wrist.current.rotation.y = swing * 0.3 * side;
    }

    if (armOther.current) {
      const twoHand = shot === 'backhand' ? 1 : 0.3;
      armOther.current.rotation.z = (isFH ? 1 : -1) * swing * side * 0.5 * twoHand;
      armOther.current.rotation.y = -swing * 0.3 * side;
      armOther.current.rotation.x = prep * 0.25;
    }

    const step = Math.sin(p * Math.PI * 2) * 0.12;
    const lift = Math.max(0, Math.sin(p * Math.PI * 2)) * 0.06;

    if (footL.current) {
      footL.current.position.set(fx1 * side + step * side, 0.05 + lift, fz1);
      footL.current.rotation.y = step * 0.8 * side;
    }
    if (footR.current) {
      footR.current.position.set(fx2 * side - step * side, 0.05 + (lift * 0.6), fz2);
      footR.current.rotation.y = -step * 0.5 * side;
    }
  });

  return (
    <group ref={group}>
      {/* Hips */}
      <mesh ref={hips} position={[0, 0.55, 0]}>
        <boxGeometry args={[0.32, 0.18, 0.22]} />
        <meshStandardMaterial color="#2a5a9a" />
      </mesh>
      {/* Torso */}
      <mesh ref={torso} position={[0, 1.05, 0]}>
        <capsuleGeometry args={[0.26, 0.55, 4, 8]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <sphereGeometry args={[0.18]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      <mesh ref={footL} position={[fx1 * side, 0.05, fz1]}>
        <boxGeometry args={[0.18, 0.08, 0.3]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh ref={footR} position={[fx2 * side, 0.05, fz2]}>
        <boxGeometry args={[0.18, 0.08, 0.3]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh ref={arm} position={[0.45 * side, 1.2, 0]}>
        <boxGeometry args={[0.08, 0.55, 0.08]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh ref={wrist} position={[0.52 * side, 1.48, 0]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      <mesh ref={armOther} position={[-0.4 * side, 1.15, 0]}>
        <boxGeometry args={[0.07, 0.5, 0.07]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.62 * side, 1.45, 0]}>
        <torusGeometry args={[0.14, 0.018, 8, 16]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
    </group>
  );
}
