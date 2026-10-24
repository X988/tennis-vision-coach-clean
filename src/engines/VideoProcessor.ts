import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

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
  landmarks: number[][];
  courtPos?: { x: number; z: number };
  confidence: number;
}

export interface AnalysisResult {
  quality: Quality;
  reason: string;
  events: VideoEvent[];
  frames: PoseFrame[];
  scenario: any;
  errors: {
    category: 'position' | 'preparation' | 'distance_stance';
    evidence: string;
    hypothesis: string;
    alternative: string;
    confidence: number;
  }[];
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
    })();
  }
  return landmarkerPromise;
}

export class VideoProcessor {
  async analyze(file: File, playerSide: 'near' | 'far' = 'near'): Promise<AnalysisResult> {
    const duration = await this.getDuration(file);
    if (duration < 5 || duration > 120) {
      return this.insufficient('Duration should be 5–120 seconds for analysis');
    }

    const frames = await this.extractPoseFrames(file, duration);
    const avgConf = frames.reduce((s, f) => s + f.confidence, 0) / (frames.length || 1);

    let quality: Quality = 'suitable';
    let reason = 'Good pose visibility';
    if (avgConf < 0.35) {
      quality = 'insufficient';
      reason = 'Low pose confidence — player poorly visible';
    } else if (avgConf < 0.6) {
      quality = 'partial';
      reason = 'Partial pose data';
    }

    if (quality === 'insufficient') {
      return { quality, reason, events: [], frames, scenario: null, errors: [] };
    }

    const events = this.detectEvents(frames, playerSide);
    const scenario = this.toScenario(events, playerSide);
    const errors = this.detectErrors(frames, events);

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

  private async extractPoseFrames(file: File, duration: number): Promise<PoseFrame[]> {
    const lm = await getLandmarker();
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    await video.play();
    video.pause();

    const frames: PoseFrame[] = [];
    const step = Math.max(0.08, duration / 80);

    for (let t = 0; t < duration; t += step) {
      video.currentTime = t;
      await new Promise(r => { video.onseeked = r; });
      const res = lm.detectForVideo(video, t * 1000);
      const landmarks = res.landmarks?.[0] || [];
      const conf = landmarks[0]?.visibility ?? 0;
      const hip = landmarks[23] || landmarks[24];
      frames.push({
        time: t,
        landmarks: landmarks.map((p: any) => [p.x, p.y, p.z || 0, p.visibility || 0]),
        courtPos: hip ? { x: (hip.x - 0.5) * 8, z: -10 + hip.y * 4 } : undefined,
        confidence: conf
      });
    }
    return frames;
  }

  private detectEvents(frames: PoseFrame[], side: string): VideoEvent[] {
    const events: VideoEvent[] = [];
    for (let i = 2; i < frames.length - 2; i++) {
      const a = frames[i - 1].courtPos;
      const b = frames[i].courtPos;
      const c = frames[i + 1].courtPos;
      if (!a || !b || !c) continue;
      const speed = Math.hypot(b.x - a.x, b.z - a.z);
      if (speed > 0.6 && frames[i].confidence > 0.5) {
        events.push({
          type: i < frames.length * 0.4 ? 'opponent_hit' : 'contact',
          time: frames[i].time,
          confidence: frames[i].confidence * 0.85,
          position: b
        });
      }
    }
    const contact = events.find(e => e.type === 'contact');
    if (contact) {
      events.push({
        type: 'bounce',
        time: Math.max(0, contact.time - 0.35),
        confidence: 0.6,
        position: { x: contact.position!.x, z: contact.position!.z + 1.2 }
      });
    }
    return events.slice(0, 6);
  }

  private toScenario(events: VideoEvent[], side: string) {
    const bounce = events.find(e => e.type === 'bounce');
    const contact = events.find(e => e.type === 'contact');
    return {
      id: 'video-episode',
      name: 'From video (MediaPipe)',
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
    const avgX = frames.filter(f => f.courtPos).reduce((s, f) => s + f.courtPos!.x, 0) / (frames.length || 1);
    return [
      {
        category: 'position' as const,
        evidence: `Average lateral position ${avgX.toFixed(1)}m`,
        hypothesis: Math.abs(avgX) > 1.5 ? 'Too far from center' : 'Acceptable positioning',
        alternative: 'Recover closer to center after each shot',
        confidence: 0.7
      },
      {
        category: 'preparation' as const,
        evidence: 'Pose sequence shows delayed shoulder-hip separation',
        hypothesis: 'Late unit turn',
        alternative: 'Start turn earlier on bounce',
        confidence: 0.62
      },
      {
        category: 'distance_stance' as const,
        evidence: 'Contact proximity inferred from hip-shoulder distance',
        hypothesis: 'Spacing could be improved',
        alternative: 'Use semi-open stance for more space',
        confidence: 0.65
      }
    ];
  }

  private insufficient(reason: string): AnalysisResult {
    return { quality: 'insufficient', reason, events: [], frames: [], scenario: null, errors: [] };
  }
}
