import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimationEngine } from '../engines/AnimationEngine';
import type { Stance } from '../engines/DecisionEngine';

const footOffsets: Record<Stance, [number, number, number, number]> = {
  open: [0.38, 0.58, -0.12, 0.22],
  'semi-open': [0.28, 0.42, -0.04, 0.16],
  neutral: [0.16, 0.16, 0.02, 0.02],
  closed: [-0.08, 0.28, 0.18, -0.06],
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

    // More realistic phase curves (ease-in-out)
    const coilT = Math.min(1, p / 0.28);
    const coil = Math.sin(coilT * Math.PI * 0.5) * 0.58;
    const relT = Math.max(0, (p - 0.22) / 0.78);
    const release = Math.pow(Math.sin(relT * Math.PI * 0.5), 0.75);
    const wristT = Math.max(0, (p - 0.62) / 0.38);
    const targetWrist = Math.sin(wristT * Math.PI) * 0.95;

    // Kinetic chain targets with better timing
    const targetHip = (-coil * 0.38 + release * 0.62) * side;
    const targetTorso = (-coil * 0.62 + release * 0.78) * side;
    const targetArmZ = (isFH ? -1 : 1) * release * 1.15 * side * 0.88;
    const targetWristZ = (isFH ? -1 : 1) * targetWrist * side * 0.95;
    const targetArmY = 1.15 + release * 0.06 - coil * 0.03;
    const targetArmX = -coil * 0.35 + release * 0.08;

    const k = 26;
    const damp = 8.2;
    const update = (current: number, target: number, v: number) => {
      const force = (target - current) * k - v * damp;
      const nv = v + force * dt;
      return [current + nv * dt, nv] as const;
    };

    if (hips.current) {
      const [r, v] = update(hips.current.rotation.y, targetHip, vel.current.hip);
      hips.current.rotation.y = r;
      hips.current.rotation.z = release * 0.04 * side;
      vel.current.hip = v;
    }
    if (torso.current) {
      const [r, v] = update(torso.current.rotation.y, targetTorso, vel.current.torso);
      torso.current.rotation.y = r;
      torso.current.rotation.z = release * 0.06 * side;
      torso.current.rotation.x = release * 0.05;
      vel.current.torso = v;
    }
    if (arm.current) {
      const [rz, vz] = update(arm.current.rotation.z, targetArmZ, vel.current.arm);
      arm.current.rotation.z = rz;
      vel.current.arm = vz;

      const [ry, vy] = update(arm.current.position.y, targetArmY, vel.current.armY);
      arm.current.position.y = Math.max(1.02, ry);
      vel.current.armY = vy;

      const [rx, vx] = update(arm.current.rotation.x, targetArmX, vel.current.armX);
      arm.current.rotation.x = rx;
      vel.current.armX = vx;

      arm.current.rotation.y = (release * 0.75 - coil * 0.18) * side * 0.55;
      arm.current.position.z = release * 0.08 * side;
      arm.current.position.x = 0.42 * side + release * 0.04 * side;
    }
    if (wrist.current) {
      const [r, v] = update(wrist.current.rotation.z, targetWristZ, vel.current.wrist);
      wrist.current.rotation.z = r;
      wrist.current.rotation.x = targetWrist * 0.32;
      wrist.current.rotation.y = release * 0.22 * side;
      vel.current.wrist = v;
    }

    if (armOther.current) {
      const two = shot === 'backhand' ? 0.8 : 0.18;
      armOther.current.rotation.z = (isFH ? 1 : -1) * release * side * 0.35 * two;
      armOther.current.rotation.y = -release * 0.18 * side;
      armOther.current.rotation.x = coil * 0.22;
    }

    // More natural footwork
    const load = coil * 0.055;
    const step = release * 0.1;
    const lift = Math.max(0, Math.sin(relT * Math.PI)) * 0.04;
    if (footL.current) {
      footL.current.position.set(fx1 * side + step * side, 0.05 + load + lift * 0.6, fz1);
      footL.current.rotation.y = step * 0.7 * side;
      footL.current.rotation.x = -lift * 0.3;
    }
    if (footR.current) {
      footR.current.position.set(fx2 * side - step * side, 0.05 + load * 0.3, fz2);
      footR.current.rotation.y = -step * 0.25 * side;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={hips} position={[0, 0.55, 0]}>
        <boxGeometry args={[0.34, 0.2, 0.24]} />
        <meshStandardMaterial color="#2a5a9a" />
      </mesh>
      <mesh ref={torso} position={[0, 1.08, 0]}>
        <capsuleGeometry args={[0.28, 0.52, 4, 8]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.19]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      <mesh ref={footL} position={[fx1 * side, 0.05, fz1]}>
        <boxGeometry args={[0.2, 0.07, 0.32]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh ref={footR} position={[fx2 * side, 0.05, fz2]}>
        <boxGeometry args={[0.2, 0.07, 0.32]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh ref={arm} position={[0.45 * side, 1.18, 0]}>
        <boxGeometry args={[0.09, 0.52, 0.09]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh ref={wrist} position={[0.54 * side, 1.46, 0]}>
        <boxGeometry args={[0.07, 0.11, 0.07]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      <mesh ref={armOther} position={[-0.38 * side, 1.14, 0]}>
        <boxGeometry args={[0.08, 0.48, 0.08]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.64 * side, 1.42, 0]}>
        <torusGeometry args={[0.15, 0.016, 8, 16]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
    </group>
  );
}
