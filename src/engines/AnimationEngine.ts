export class AnimationEngine {
  duration = 1.4;
  contactRatio = 0.62;
  speed = 1;
  time = 0;
  playing = false;

  setContactTime(ct: number) {
    this.speed = (this.duration * this.contactRatio) / Math.max(ct, 0.15);
  }

  update(dt: number) {
    if (!this.playing) return;
    this.time += dt * this.speed;
    if (this.time > this.duration) this.time -= this.duration;
  }

  progress() { return (this.time % this.duration) / this.duration; }

  reset() { this.time = 0; }
}
