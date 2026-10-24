import { useMemo } from 'react';
import * as THREE from 'three';
import { BallEngine } from '../engines/BallEngine';

export function Layers({ engine, simTime, show }: { engine: BallEngine; simTime: number; show: boolean }) {
  const bounce = engine.getBouncePoint();
  const contact = engine.getContactPoint();
  const trail = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let t = 0; t <= Math.max(simTime, 0.1); t += 0.05) {
      pts.push(engine.getPosition(t));
    }
    return pts;
  }, [engine, simTime]);

  if (!show) return null;

  return (
    <>
      {/* Bounce point */}
      <mesh position={[bounce.x, 0.02, bounce.z]}>
        <cylinderGeometry args={[0.25, 0.25, 0.02, 16]} />
        <meshStandardMaterial color="#ff4444" transparent opacity={0.7} />
      </mesh>
      {/* Contact zone */}
      <mesh position={[contact.x, contact.y, contact.z]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#44ff44" transparent opacity={0.25} wireframe />
      </mesh>
      {/* Ball trail */}
      {trail.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={trail.length}
              array={new Float32Array(trail.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </line>
      )}
    </>
  );
}
