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
  const shirtMat = useRef<THREE.MeshStandardMaterial>(null!);
  const vel = useRef({ hip: 0, torso: 0, arm: 0, wrist: 0, armY: 0, armX: 0 });
  const [fx1, fz1, fx2, fz2] = footOffsets[stance];
  const side = handed === 'right' ? 1 : -1;
  const isFH = (shot === 'forehand') === (handed === 'right');

  useFrame((_, delta) => {
    if (group.current) group.current.position.copy(pos);
    const p = Math.min(1, Math.max(0, anim.progress()));
    const dt = Math.min(delta, 0.033);

    // Stronger phase curves
    const coilT = Math.min(1, p / 0.25);
    const coil = Math.sin(coilT * Math.PI * 0.5) * 0.75;
    const relT = Math.max(0, (p - 0.2) / 0.8);
    const release = Math.pow(Math.sin(relT * Math.PI * 0.5), 0.65);
    const wristT = Math.max(0, (p - 0.58) / 0.42);
    const targetWrist = Math.sin(wristT * Math.PI) * 1.1;

    const targetHip = (-coil * 0.45 + release * 0.7) * side;
    const targetTorso = (-coil * 0.7 + release * 0.9) * side;
    const targetArmZ = (isFH ? -1 : 1) * release * 1.25 * side * 0.9;
    const targetWristZ = (isFH ? -1 : 1) * targetWrist * side;
    const targetArmY = 1.2 + release * 0.08 - coil * 0.04;
    const targetArmX = -coil * 0.4 + release * 0.1;

    const k = 28;
    const damp = 6.5;
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
      torso.current.rotation.z = release * 0.07 * side;
      torso.current.rotation.x = release * 0.05;
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
      arm.current.rotation.y = (release * 0.8 - coil * 0.2) * side * 0.55;
      arm.current.position.z = release * 0.08 * side;
      arm.current.position.x = 0.38 * side + release * 0.04 * side;
    }
    if (wrist.current) {
      const [r, v] = update(wrist.current.rotation.z, targetWristZ, vel.current.wrist);
      wrist.current.rotation.z = r;
      wrist.current.rotation.x = targetWrist * 0.35;
      wrist.current.rotation.y = release * 0.22 * side;
      vel.current.wrist = v;
    }
    if (armOther.current) {
      const two = shot === 'backhand' ? 0.8 : 0.18;
      armOther.current.rotation.z = (isFH ? 1 : -1) * release * side * 0.35 * two;
      armOther.current.rotation.y = -release * 0.18 * side;
      armOther.current.rotation.x = coil * 0.22;
    }

    // Contact flash on shirt
    if (shirtMat.current) {
      const contactNear = Math.abs(p - 0.62) < 0.06;
      shirtMat.current.emissiveIntensity = contactNear ? 0.35 : 0;
      shirtMat.current.emissive.set(contactNear ? '#ff6600' : '#000');
    }

    const load = coil * 0.06;
    const step = release * 0.1;
    const lift = Math.max(0, Math.sin(relT * Math.PI)) * 0.04;
    if (footL.current) {
      footL.current.position.set(fx1 * side + step * side, 0.04 + load + lift * 0.6, fz1);
      footL.current.rotation.y = step * 0.7 * side;
      footL.current.rotation.x = -lift * 0.3;
    }
    if (footR.current) {
      footR.current.position.set(fx2 * side - step * side, 0.04 + load * 0.3, fz2);
      footR.current.rotation.y = -step * 0.25 * side;
    }
  });

  return (
    <group ref={group}>
      <mesh position={[fx1 * side * 0.5, 0.32, fz1 * 0.5]} castShadow>
        <capsuleGeometry args={[0.09, 0.48, 6, 10]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
      </mesh>
      <mesh position={[fx2 * side * 0.5, 0.32, fz2 * 0.5]} castShadow>
        <capsuleGeometry args={[0.09, 0.48, 6, 10]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
      </mesh>

      <mesh ref={hips} position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[0.40, 0.24, 0.28]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.6} />
      </mesh>

      <mesh ref={torso} position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.27, 0.56, 8, 12]} />
        <meshStandardMaterial ref={shirtMat} color="#e85d04" roughness={0.55} emissive="#000" />
      </mesh>

      <mesh position={[0, 1.82, 0.02]} castShadow>
        <sphereGeometry args={[0.175, 20, 20]} />
        <meshStandardMaterial color="#f5d0a9" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.97, 0.04]} rotation={[0.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.19, 0.09, 16]} />
        <meshStandardMaterial color="#f8f8f8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.96, 0.18]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.22, 0.02, 0.14]} />
        <meshStandardMaterial color="#f8f8f8" />
      </mesh>

      <mesh ref={footL} position={[fx1 * side, 0.05, fz1]} castShadow>
        <boxGeometry args={[0.23, 0.09, 0.36]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>
      <mesh ref={footR} position={[fx2 * side, 0.05, fz2]} castShadow>
        <boxGeometry args={[0.23, 0.09, 0.36]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>

      <mesh ref={arm} position={[0.4 * side, 1.2, 0]} castShadow>
        <capsuleGeometry args={[0.055, 0.50, 6, 10]} />
        <meshStandardMaterial color="#f5d0a9" roughness={0.6} />
      </mesh>
      <mesh ref={wrist} position={[0.52 * side, 1.48, 0]}>
        <boxGeometry args={[0.09, 0.13, 0.09]} />
        <meshStandardMaterial color="#f5d0a9" roughness={0.55} />
      </mesh>

      <group position={[0.68 * side, 1.42, 0.02]} rotation={[0, 0, 0.15 * side]}>
        <mesh castShadow>
          <torusGeometry args={[0.165, 0.016, 8, 24]} />
          <meshStandardMaterial color="#2c2c2c" metalness={0.2} roughness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.24, 0.24, 0.008]} />
          <meshStandardMaterial color="#4a90d9" transparent opacity={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.28, 0]}>
          <cylinderGeometry args={[0.018, 0.022, 0.32, 8]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      </group>

      <mesh ref={armOther} position={[-0.36 * side, 1.18, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.46, 6, 10]} />
        <meshStandardMaterial color="#f5d0a9" roughness={0.6} />
      </mesh>
    </group>
  );
}
