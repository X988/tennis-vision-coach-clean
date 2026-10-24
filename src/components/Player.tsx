import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimationEngine } from '../engines/AnimationEngine';
import type { Stance } from '../engines/DecisionEngine';

const footOffsets: Record<Stance, [number, number, number, number]> = {
  open: [0.42, 0.62, -0.14, 0.24],
  'semi-open': [0.32, 0.48, -0.06, 0.18],
  neutral: [0.22, 0.22, 0.04, 0.04],
  closed: [-0.06, 0.32, 0.20, -0.04],
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
  const vel = useRef({ hip: 0, torso: 0, arm: 0, wrist: 0, armY: 0, armX: 0 });
  const [fx1, fz1, fx2, fz2] = footOffsets[stance];
  const side = handed === 'right' ? 1 : -1;
  const isFH = (shot === 'forehand') === (handed === 'right');

  useFrame((_, delta) => {
    if (group.current) group.current.position.copy(pos);
    const p = Math.min(1, Math.max(0, anim.progress()));
    const dt = Math.min(delta, 0.033);

    const coilT = Math.min(1, p / 0.28);
    const coil = Math.sin(coilT * Math.PI * 0.5) * 0.55;
    const relT = Math.max(0, (p - 0.22) / 0.78);
    const release = Math.pow(Math.sin(relT * Math.PI * 0.5), 0.7);
    const wristT = Math.max(0, (p - 0.62) / 0.38);
    const targetWrist = Math.sin(wristT * Math.PI) * 0.9;

    const targetHip = (-coil * 0.35 + release * 0.55) * side;
    const targetTorso = (-coil * 0.55 + release * 0.7) * side;
    const targetArmZ = (isFH ? -1 : 1) * release * 1.05 * side * 0.85;
    const targetWristZ = (isFH ? -1 : 1) * targetWrist * side * 0.9;
    const targetArmY = 1.22 + release * 0.05 - coil * 0.02;
    const targetArmX = -coil * 0.3 + release * 0.06;

    const k = 24;
    const damp = 7.5;
    const update = (current: number, target: number, v: number) => {
      const force = (target - current) * k - v * damp;
      const nv = v + force * dt;
      return [current + nv * dt, nv] as const;
    };

    if (hips.current) {
      const [r, v] = update(hips.current.rotation.y, targetHip, vel.current.hip);
      hips.current.rotation.y = r;
      hips.current.rotation.z = release * 0.03 * side;
      vel.current.hip = v;
    }
    if (torso.current) {
      const [r, v] = update(torso.current.rotation.y, targetTorso, vel.current.torso);
      torso.current.rotation.y = r;
      torso.current.rotation.z = release * 0.05 * side;
      torso.current.rotation.x = release * 0.04;
      vel.current.torso = v;
    }
    if (arm.current) {
      const [rz, vz] = update(arm.current.rotation.z, targetArmZ, vel.current.arm);
      arm.current.rotation.z = rz;
      vel.current.arm = vz;
      const [ry, vy] = update(arm.current.position.y, targetArmY, vel.current.armY);
      arm.current.position.y = Math.max(1.05, ry);
      vel.current.armY = vy;
      const [rx, vx] = update(arm.current.rotation.x, targetArmX, vel.current.armX);
      arm.current.rotation.x = rx;
      vel.current.armX = vx;
      arm.current.rotation.y = (release * 0.65 - coil * 0.15) * side * 0.5;
      arm.current.position.z = release * 0.06 * side;
      arm.current.position.x = 0.38 * side + release * 0.03 * side;
    }
    if (wrist.current) {
      const [r, v] = update(wrist.current.rotation.z, targetWristZ, vel.current.wrist);
      wrist.current.rotation.z = r;
      wrist.current.rotation.x = targetWrist * 0.28;
      wrist.current.rotation.y = release * 0.18 * side;
      vel.current.wrist = v;
    }
    if (armOther.current) {
      const two = shot === 'backhand' ? 0.75 : 0.15;
      armOther.current.rotation.z = (isFH ? 1 : -1) * release * side * 0.3 * two;
      armOther.current.rotation.y = -release * 0.15 * side;
      armOther.current.rotation.x = coil * 0.18;
    }

    const load = coil * 0.05;
    const step = release * 0.08;
    const lift = Math.max(0, Math.sin(relT * Math.PI)) * 0.035;
    if (footL.current) {
      footL.current.position.set(fx1 * side + step * side, 0.04 + load + lift * 0.5, fz1);
      footL.current.rotation.y = step * 0.6 * side;
      footL.current.rotation.x = -lift * 0.25;
    }
    if (footR.current) {
      footR.current.position.set(fx2 * side - step * side, 0.04 + load * 0.25, fz2);
      footR.current.rotation.y = -step * 0.2 * side;
    }
  });

  return (
    <group ref={group}>
      {/* Legs */}
      <mesh position={[fx1 * side * 0.5, 0.32, fz1 * 0.5]}>
        <capsuleGeometry args={[0.09, 0.48, 4, 8]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[fx2 * side * 0.5, 0.32, fz2 * 0.5]}>
        <capsuleGeometry args={[0.09, 0.48, 4, 8]} />
        <meshStandardMaterial color="#555" />
      </mesh>

      {/* Hips */}
      <mesh ref={hips} position={[0, 0.58, 0]}>
        <boxGeometry args={[0.38, 0.22, 0.26]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>

      {/* Torso */}
      <mesh ref={torso} position={[0, 1.15, 0]}>
        <capsuleGeometry args={[0.26, 0.58, 6, 10]} />
        <meshStandardMaterial color="#ff4d2e" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.82, 0.02]}>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 1.96, 0.02]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.08, 16]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>

      {/* Feet */}
      <mesh ref={footL} position={[fx1 * side, 0.05, fz1]}>
        <boxGeometry args={[0.22, 0.08, 0.34]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh ref={footR} position={[fx2 * side, 0.05, fz2]}>
        <boxGeometry args={[0.22, 0.08, 0.34]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Main arm + racket */}
      <mesh ref={arm} position={[0.4 * side, 1.2, 0]}>
        <capsuleGeometry args={[0.055, 0.48, 4, 8]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      <mesh ref={wrist} position={[0.52 * side, 1.48, 0]}>
        <boxGeometry args={[0.08, 0.12, 0.08]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      {/* Racket */}
      <mesh position={[0.68 * side, 1.42, 0.02]} rotation={[0, 0, 0.2 * side]}>
        <torusGeometry args={[0.16, 0.018, 8, 20]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.68 * side, 1.42, 0.02]}>
        <boxGeometry args={[0.22, 0.22, 0.01]} />
        <meshStandardMaterial color="#4a90d9" transparent opacity={0.6} />
      </mesh>

      {/* Other arm */}
      <mesh ref={armOther} position={[-0.36 * side, 1.18, 0]}>
        <capsuleGeometry args={[0.05, 0.44, 4, 8]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
    </group>
  );
}
