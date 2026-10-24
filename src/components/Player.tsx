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
  const vel = useRef({ hip: 0, torso: 0, arm: 0, wrist: 0 });
  const [fx1, fz1, fx2, fz2] = footOffsets[stance];
  const side = handed === 'right' ? 1 : -1;
  const isFH = (shot === 'forehand') === (handed === 'right');

  useFrame((_, delta) => {
    if (group.current) group.current.position.copy(pos);
    const p = Math.min(1, Math.max(0, anim.progress()));
    const dt = Math.min(delta, 0.05);

    const coilT = Math.min(1, p / 0.32);
    const coil = Math.sin(coilT * Math.PI * 0.5) * 0.65;
    const relT = Math.max(0, (p - 0.28) / 0.72);
    const release = Math.sin(relT * Math.PI * 0.5);
    const wristT = Math.max(0, (p - 0.58) / 0.42);
    const targetWrist = Math.sin(wristT * Math.PI) * 1.15;

    // Target rotations (kinetic chain + SSC)
    const targetHip = (-coil * 0.45 + release * 0.7) * side;
    const targetTorso = (-coil * 0.7 + release * 0.85) * side;
    const targetArmZ = (isFH ? -1 : 1) * release * 1.35 * side * 0.92;
    const targetWristZ = (isFH ? -1 : 1) * targetWrist * side * 1.1;

    // Simple inertia (spring-damper toward target)
    const k = 18;
    const damp = 6;
    const update = (current: number, target: number, v: number) => {
      const force = (target - current) * k - v * damp;
      const nv = v + force * dt;
      return [current + nv * dt, nv] as const;
    };

    if (hips.current) {
      const [r, v] = update(hips.current.rotation.y, targetHip, vel.current.hip);
      hips.current.rotation.y = r;
      vel.current.hip = v;
    }
    if (torso.current) {
      const [r, v] = update(torso.current.rotation.y, targetTorso, vel.current.torso);
      torso.current.rotation.y = r;
      torso.current.rotation.z = release * 0.08 * side;
      vel.current.torso = v;
    }
    if (arm.current) {
      const [r, v] = update(arm.current.rotation.z, targetArmZ, vel.current.arm);
      arm.current.rotation.z = r;
      arm.current.rotation.y = (release - coil * 0.25) * side * 0.65;
      arm.current.rotation.x = -coil * 0.45 + release * 0.12;
      arm.current.position.y = 1.18 + release * 0.09;
      arm.current.position.z = release * 0.12 * side;
      vel.current.arm = v;
    }
    if (wrist.current) {
      const [r, v] = update(wrist.current.rotation.z, targetWristZ, vel.current.wrist);
      wrist.current.rotation.z = r;
      wrist.current.rotation.x = targetWrist * 0.42;
      wrist.current.rotation.y = release * 0.3 * side;
      vel.current.wrist = v;
    }

    if (armOther.current) {
      const two = shot === 'backhand' ? 0.9 : 0.25;
      armOther.current.rotation.z = (isFH ? 1 : -1) * release * side * 0.45 * two;
      armOther.current.rotation.y = -release * 0.25 * side;
      armOther.current.rotation.x = coil * 0.28;
    }

    const load = coil * 0.07;
    const step = release * 0.13;
    if (footL.current) {
      footL.current.position.set(fx1 * side + step * side, 0.05 + load, fz1);
      footL.current.rotation.y = step * 0.85 * side;
    }
    if (footR.current) {
      footR.current.position.set(fx2 * side - step * side, 0.05 + load * 0.4, fz2);
      footR.current.rotation.y = -step * 0.35 * side;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={hips} position={[0, 0.55, 0]}>
        <boxGeometry args={[0.32, 0.18, 0.22]} />
        <meshStandardMaterial color="#2a5a9a" />
      </mesh>
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
