import * as THREE from 'three';

export class ReachabilityEngine {
  maxSpeed = 4.5; // m/s
  reaction = 0.25;

  canReach(bounce: { x: number; z: number }, contactTime: number, playerStart: THREE.Vector3): { ok: boolean; timeNeeded: number; reason: string } {
    const target = new THREE.Vector3(bounce.x, 0, bounce.z + 0.4);
    const dist = playerStart.distanceTo(target);
    const timeNeeded = this.reaction + dist / this.maxSpeed;
    const ok = timeNeeded <= contactTime + 0.15;
    const reason = ok
      ? `Reachable (${timeNeeded.toFixed(2)}s / ${contactTime.toFixed(2)}s)`
      : `Too far (${timeNeeded.toFixed(2)}s needed, only ${contactTime.toFixed(2)}s)`;
    return { ok, timeNeeded, reason };
  }

  suggestPosition(bounce: { x: number; z: number }, handed: 'right' | 'left', shot: 'forehand' | 'backhand'): THREE.Vector3 {
    const side = handed === 'right' ? (shot === 'forehand' ? 0.6 : -0.6) : (shot === 'forehand' ? -0.6 : 0.6);
    return new THREE.Vector3(bounce.x + side, 0, Math.max(-11.8, bounce.z - 0.8));
  }
}
