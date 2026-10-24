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
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    })();
  }
  return landmarkerPromise;
}

export class VideoProcessor {
  async analyze(file: File, playerSide: 'near' | 'far' = 'near'): Promise<AnalysisResult> {
    const duration = await this.getDuration(file);
    if (duration < 3 || duration > 180) {
      return this.insufficient('Длительность должна быть 3–180 секунд');
    }

    const frames = await this.extractPoseFrames(file, duration);
    const validFrames = frames.filter(f => f.confidence > 0.3);
    const avgConf = validFrames.reduce((s, f) => s + f.confidence, 0) / (validFrames.length || 1);

    let quality: Quality = 'suitable';
    let reason = 'Хорошая видимость позы';
    if (validFrames.length < 8 || avgConf < 0.4) {
      quality = 'insufficient';
      reason = 'Низкая уверенность позы — игрок плохо виден или видео слишком короткое';
    } else if (avgConf < 0.65 || validFrames.length < 15) {
      quality = 'partial';
      reason = 'Частичные данные позы — некоторые кадры пропущены';
    }

    if (quality === 'insufficient') {
      return { quality, reason, events: [], frames, scenario: null, errors: [] };
    }

    const events = this.detectEvents(frames, playerSide);
    const scenario = this.toScenario(events, playerSide, frames);
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
    const step = Math.max(0.06, duration / 100);

    for (let t = 0; t < duration; t += step) {
      video.currentTime = t;
      await new Promise(r => { video.onseeked = r; });
      const res = lm.detectForVideo(video, t * 1000);
      const landmarks = res.landmarks?.[0] || [];
      const conf = landmarks.length > 0 ? (landmarks[0]?.visibility ?? 0.5) : 0;
      const hipL = landmarks[23];
      const hipR = landmarks[24];
      const hip = hipL && hipR ? { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 } : hipL || hipR;
      frames.push({
        time: t,
        landmarks: landmarks.map((p: any) => [p.x, p.y, p.z || 0, p.visibility || 0]),
        courtPos: hip ? { x: (hip.x - 0.5) * 10, z: -11 + hip.y * 5 } : undefined,
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
      const accel = Math.hypot(c.x - b.x, c.z - b.z) - speed;
      if (speed > 0.45 && frames[i].confidence > 0.45 && Math.abs(accel) > 0.15) {
        events.push({
          type: i < frames.length * 0.35 ? 'opponent_hit' : 'contact',
          time: frames[i].time,
          confidence: Math.min(0.95, frames[i].confidence * 0.9),
          position: b
        });
      }
    }
    const contact = events.find(e => e.type === 'contact');
    if (contact && contact.position) {
      events.push({
        type: 'bounce',
        time: Math.max(0, contact.time - 0.4),
        confidence: 0.65,
        position: { x: contact.position.x * 0.9, z: contact.position.z + 1.5 }
      });
    }
    return events.slice(0, 8);
  }

  private toScenario(events: VideoEvent[], side: string, frames: PoseFrame[]) {
    const bounce = events.find(e => e.type === 'bounce');
    const contact = events.find(e => e.type === 'contact');
    const avgConf = frames.reduce((s, f) => s + f.confidence, 0) / (frames.length || 1);
    return {
      id: 'video-episode',
      name: 'Из видео (AI анализ)',
      bounce: bounce?.position || { x: 0, z: -9 },
      speed: contact ? Math.min(28, 12 + contact.confidence * 10) : 15,
      spin: 'flat',
      height: 0.55 + (avgConf > 0.7 ? 0.15 : 0),
      shot: 'forehand',
      handed: 'right',
      source: 'video',
      uncertainty: Math.max(0.1, 1 - avgConf)
    };
  }

  private detectErrors(frames: PoseFrame[], events: VideoEvent[]) {
    const valid = frames.filter(f => f.courtPos && f.confidence > 0.4);
    if (valid.length < 5) {
      return [{
        category: 'position' as const,
        evidence: 'Недостаточно данных позы',
        hypothesis: 'Невозможно надёжно оценить',
        alternative: 'Снимайте с лучшим освещением и полным телом в кадре',
        confidence: 0.3
      }];
    }

    const avgX = valid.reduce((s, f) => s + f.courtPos!.x, 0) / valid.length;
    const maxAbsX = Math.max(...valid.map(f => Math.abs(f.courtPos!.x)));
    const earlyFrames = valid.slice(0, Math.floor(valid.length * 0.4));
    const lateFrames = valid.slice(Math.floor(valid.length * 0.6));
    const earlyX = earlyFrames.reduce((s, f) => s + f.courtPos!.x, 0) / (earlyFrames.length || 1);
    const lateX = lateFrames.reduce((s, f) => s + f.courtPos!.x, 0) / (lateFrames.length || 1);
    const recovery = Math.abs(lateX) - Math.abs(earlyX);

    const errors = [];

    if (Math.abs(avgX) > 1.8) {
      errors.push({
        category: 'position' as const,
        evidence: `Средняя позиция ${avgX.toFixed(1)}м от центра (макс ${maxAbsX.toFixed(1)}м)`,
        hypothesis: 'Стоите слишком широко — плохое восстановление',
        alternative: 'Возвращайтесь к центру после каждого удара',
        confidence: Math.min(0.92, 0.55 + Math.abs(avgX) * 0.15)
      });
    } else if (recovery > 0.8) {
      errors.push({
        category: 'position' as const,
        evidence: `Позиция сместилась на ${recovery.toFixed(1)}м за розыгрыш`,
        hypothesis: 'Позднее или неполное восстановление',
        alternative: 'Делайте меньшие шаги и восстанавливайтесь раньше',
        confidence: 0.75
      });
    } else {
      errors.push({
        category: 'position' as const,
        evidence: `Средняя позиция ${avgX.toFixed(1)}м — в хорошем диапазоне`,
        hypothesis: 'Позиционирование приемлемое',
        alternative: 'Продолжайте восстанавливаться к центру',
        confidence: 0.8
      });
    }

    const hasShoulders = valid.some(f => f.landmarks.length > 12);
    if (hasShoulders) {
      errors.push({
        category: 'preparation' as const,
        evidence: 'Движение линии плеч обнаружено',
        hypothesis: recovery > 0.5 ? 'Unit turn может начинаться поздно' : 'Время подготовки выглядит разумно',
        alternative: 'Начинайте разворот плеч как только мяч уходит с ракетки соперника',
        confidence: 0.68
      });
    } else {
      errors.push({
        category: 'preparation' as const,
        evidence: 'Мало данных по верхней части тела',
        hypothesis: 'Сложно оценить время подготовки',
        alternative: 'Снимайте с боку для лучшей видимости плеч',
        confidence: 0.45
      });
    }

    const contact = events.find(e => e.type === 'contact');
    if (contact && contact.position) {
      const contactFrame = valid.find(f => Math.abs(f.time - contact.time) < 0.15);
      const dist = contactFrame?.courtPos
        ? Math.hypot(contactFrame.courtPos.x - contact.position.x, contactFrame.courtPos.z - contact.position.z)
        : 1.2;
      errors.push({
        category: 'distance_stance' as const,
        evidence: `Дистанция до контакта примерно ${dist.toFixed(1)}м`,
        hypothesis: dist > 1.8 ? 'Слишком далеко от мяча' : dist < 0.6 ? 'Слишком близко к мячу' : 'Дистанция приемлемая',
        alternative: dist > 1.8 ? 'Корректируйте ноги раньше и используйте открытую стойку при необходимости' : 'Сохраняйте разгиб руки',
        confidence: 0.7
      });
    } else {
      errors.push({
        category: 'distance_stance' as const,
        evidence: 'Контакт не обнаружен чётко',
        hypothesis: 'Невозможно надёжно оценить дистанцию',
        alternative: 'Снимайте полный удар с видимым мячом',
        confidence: 0.4
      });
    }

    return errors;
  }

  private insufficient(reason: string): AnalysisResult {
    return { quality: 'insufficient', reason, events: [], frames: [], scenario: null, errors: [] };
  }
}
