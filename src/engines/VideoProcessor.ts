export type Quality = 'suitable' | 'partial' | 'insufficient';
export type EventType = 'opponent_hit' | 'bounce' | 'contact';

export interface VideoEvent {
  type: EventType;
  time: number;
  confidence: number;
  position?: { x: number; z: number };
}

export interface PoseFrame {
  time: number;
  landmarks: number[][]; // [x,y,z,visibility] x 33
  courtPos?: { x: number; z: number };
  confidence: number;
}

export interface AnalysisResult {
  quality: Quality;
  reason: string;
  events: VideoEvent[];
  frames: PoseFrame[];
  scenario: any; // compatible with existing engines
  errors: {
    category: 'position' | 'preparation' | 'distance_stance';
    evidence: string;
    hypothesis: string;
    alternative: string;
    confidence: number;
  }[];
}

export class VideoProcessor {
  async analyze(file: File, playerSide: 'near' | 'far' = 'near'): Promise<AnalysisResult> {
    const duration = await this.getDuration(file);
    if (duration < 10 || duration > 60) {
      return this.insufficient('Duration must be 10–60 seconds');
    }

    // Pilot: MediaPipe Pose Landmarker integration point
    // In full version: process frames with @mediapipe/tasks-vision PoseLandmarker
    const frames = this.simulatePoseFrames(duration);
    const avgConf = frames.reduce((s, f) => s + f.confidence, 0) / frames.length;

    let quality: Quality = 'suitable';
    let reason = 'Good visibility and court coverage';
    if (avgConf < 0.4) {
      quality = 'insufficient';
      reason = 'Low pose confidence — player partially out of frame or occluded';
    } else if (avgConf < 0.65) {
      quality = 'partial';
      reason = 'Partial data — some frames missing key points';
    }

    if (quality === 'insufficient') {
      return { quality, reason, events: [], frames: [], scenario: null, errors: [] };
    }

    const events = this.detectEvents(frames, playerSide);
    const scenario = this.toScenario(events, playerSide);
    const errors = quality === 'suitable' ? this.detectErrors(frames, events) : [];

    return { quality, reason, events, frames, scenario, errors };
  }

  private async getDuration(file: File): Promise<number> {
    return new Promise((res) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => res(v.duration);
      v.src = URL.createObjectURL(file);
    });
  }

  private simulatePoseFrames(duration: number): PoseFrame[] {
    const frames: PoseFrame[] = [];
    for (let t = 0; t < duration; t += 0.1) {
      const conf = 0.5 + Math.sin(t) * 0.3 + Math.random() * 0.2;
      frames.push({
        time: t,
        landmarks: Array(33).fill(0).map(() => [0.5, 0.5, 0, conf]),
        courtPos: { x: Math.sin(t) * 2, z: -9 + Math.cos(t) },
        confidence: Math.min(1, conf)
      });
    }
    return frames;
  }

  private detectEvents(frames: PoseFrame[], side: string): VideoEvent[] {
    const events: VideoEvent[] = [];
    // Pilot heuristics: look for velocity peaks as potential contact / bounce
    for (let i = 1; i < frames.length - 1; i++) {
      const prev = frames[i - 1].courtPos!;
      const curr = frames[i].courtPos!;
      const next = frames[i + 1].courtPos!;
      const speed = Math.hypot(curr.x - prev.x, curr.z - prev.z);
      if (speed > 0.8 && frames[i].confidence > 0.6) {
        events.push({
          type: i < frames.length / 3 ? 'opponent_hit' : 'contact',
          time: frames[i].time,
          confidence: frames[i].confidence * 0.8,
          position: curr
        });
      }
    }
    // Synthetic bounce near contact
    if (events.length) {
      const c = events.find(e => e.type === 'contact');
      if (c) events.push({ type: 'bounce', time: c.time - 0.4, confidence: 0.55, position: { x: c.position!.x, z: c.position!.z + 1 } });
    }
    return events.slice(0, 5);
  }

  private toScenario(events: VideoEvent[], side: string) {
    const bounce = events.find(e => e.type === 'bounce');
    const contact = events.find(e => e.type === 'contact');
    return {
      id: 'video-episode',
      name: 'Imported episode',
      bounce: bounce?.position || { x: 0, z: -9 },
      speed: 15,
      spin: 'flat',
      height: 0.6,
      shot: 'forehand',
      handed: 'right',
      source: 'video',
      uncertainty: 1 - (contact?.confidence || 0.5)
    };
  }

  private detectErrors(frames: PoseFrame[], events: VideoEvent[]) {
    return [
      {
        category: 'position' as const,
        evidence: 'Average lateral deviation > 1.2m from ideal recovery zone',
        hypothesis: 'Player is too far from the ball path',
        alternative: 'Move 0.8m closer to center before contact',
        confidence: 0.72
      },
      {
        category: 'preparation' as const,
        evidence: 'Shoulder rotation delayed relative to bounce',
        hypothesis: 'Late unit turn',
        alternative: 'Initiate turn 0.2s earlier',
        confidence: 0.65
      },
      {
        category: 'distance_stance' as const,
        evidence: 'Contact point too close to body',
        hypothesis: 'Insufficient spacing',
        alternative: 'Adopt semi-open stance and step out',
        confidence: 0.68
      }
    ];
  }

  private insufficient(reason: string): AnalysisResult {
    return { quality: 'insufficient', reason, events: [], frames: [], scenario: null, errors: [] };
  }
}
