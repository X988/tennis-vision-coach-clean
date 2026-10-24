import * as THREE from 'three';

export type Spin = 'flat' | 'topspin' | 'slice';

export interface BallParams {
  bouncePoint: { x: number; z: number };
  speed: number;
  spin: Spin;
  bounceHeight: number;
  startPos?: THREE.Vector3;
}

export class BallEngine {
  params: BallParams;
  trajectory: THREE.Vector3[] = [];
  times: number[] = [];
  contactTime = 1.2;
  bounceTime = 0.8;
  playerTarget = new THREE.Vector3(0, 0.9, -10.5);

  constructor(params: BallParams) {
    this.params = { ...params };
    this.recalculate();
  }

  updateParams(p: Partial<BallParams>) {
    Object.assign(this.params, p);
    this.recalculate();
  }

  private spinFactor(): number {
    if (this.params.spin === 'topspin') return 1.35;
    if (this.params.spin === 'slice') return 0.65;
    return 1;
  }

  recalculate() {
    this.trajectory = [];
    this.times = [];
    const dt = 0.016;
    let t = 0;
    const start = this.params.startPos || new THREE.Vector3(0, 2.2, 7.5);
    let pos = start.clone();
    const toBounce = new THREE.Vector3(this.params.bouncePoint.x, 0, this.params.bouncePoint.z).sub(start);
    let vel = toBounce.normalize().multiplyScalar(this.params.speed);
    vel.y = 3.5 + this.params.bounceHeight * 2;

    const g = 9.81;
    const rest = 0.7 * this.spinFactor();
    let bounced = false;

    while (t < 4 && pos.z > -13) {
      this.trajectory.push(pos.clone());
      this.times.push(t);
      vel.y -= g * dt;
      pos.add(vel.clone().multiplyScalar(dt));
      if (!bounced && pos.y <= 0 && vel.y < 0) {
        pos.y = 0;
        vel.y *= -rest;
        vel.x *= 0.95;
        vel.z *= 0.95;
        bounced = true;
        this.bounceTime = t;
      }
      const dist = new THREE.Vector2(pos.x, pos.z).distanceTo(new THREE.Vector2(this.playerTarget.x, this.playerTarget.z));
      if (dist < 0.8 && this.contactTime > t) this.contactTime = t;
      t += dt;
    }
    if (this.contactTime > 3) this.contactTime = 1.1;
  }

  getPosition(simTime: number): THREE.Vector3 {
    if (!this.trajectory.length) return new THREE.Vector3(0, 1, 0);
    let i = 0;
    while (i < this.times.length - 1 && this.times[i + 1] < simTime) i++;
    const a = Math.min(1, (simTime - this.times[i]) / (this.times[i + 1] - this.times[i] || 1));
    return this.trajectory[i].clone().lerp(this.trajectory[Math.min(i + 1, this.trajectory.length - 1)], a);
  }

  getContactTime() { return this.contactTime; }
  getBounceTime() { return this.bounceTime; }
  getBouncePoint() { return this.params.bouncePoint; }
  getContactPoint(): THREE.Vector3 {
    return this.getPosition(this.contactTime);
  }
}
