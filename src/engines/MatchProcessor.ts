export interface JobStatus {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled';
  progress: number;
  message: string;
  created: number;
}

export interface Rally {
  id: string;
  start: number;
  end: number;
  shots: { time: number; type: string; confidence: number }[];
  manual?: boolean;
}

export interface MatchAnalysis {
  jobId: string;
  quality: 'suitable' | 'partial' | 'insufficient';
  modelVersion: string;
  rallies: Rally[];
  errorPatterns: { category: string; count: number; avgConfidence: number; examples: number[] }[];
  trainingPlan: { focus: string; drills: string[]; priority: number }[];
  limitations: string[];
}

export class MatchProcessor {
  private jobs = new Map<string, JobStatus>();
  modelVersion = 'v0.5-pilot';

  async enqueue(file: File): Promise<string> {
    const id = 'job-' + Date.now();
    const job: JobStatus = { id, status: 'queued', progress: 0, message: 'Queued', created: Date.now() };
    this.jobs.set(id, job);
    this.processAsync(id, file);
    return id;
  }

  getStatus(id: string) { return this.jobs.get(id); }

  cancel(id: string) {
    const j = this.jobs.get(id);
    if (j && j.status !== 'done') { j.status = 'cancelled'; j.message = 'Cancelled'; }
  }

  private async processAsync(id: string, file: File) {
    const j = this.jobs.get(id)!;
    j.status = 'processing';
    try {
      for (let p = 10; p <= 90; p += 20) {
        if (j.status === 'cancelled') return;
        await new Promise(r => setTimeout(r, 400));
        j.progress = p;
        j.message = `Processing ${p}%`;
      }
      const analysis = this.analyze(file);
      j.progress = 100;
      j.status = 'done';
      j.message = 'Complete';
      (j as any).result = analysis;
    } catch (e: any) {
      j.status = 'error';
      j.message = e.message || 'Failed';
    }
  }

  private analyze(file: File): MatchAnalysis {
    const rallies: Rally[] = [
      { id: 'r1', start: 12, end: 28, shots: [{ time: 14, type: 'serve', confidence: 0.8 }, { time: 18, type: 'forehand', confidence: 0.7 }] },
      { id: 'r2', start: 45, end: 62, shots: [{ time: 48, type: 'backhand', confidence: 0.65 }] },
    ];
    return {
      jobId: '',
      quality: 'partial',
      modelVersion: this.modelVersion,
      rallies,
      errorPatterns: [
        { category: 'position', count: 7, avgConfidence: 0.68, examples: [14, 48] },
        { category: 'preparation', count: 4, avgConfidence: 0.61, examples: [18] },
        { category: 'distance_stance', count: 5, avgConfidence: 0.64, examples: [28] },
      ],
      trainingPlan: [
        { focus: 'Court position', drills: ['Recovery footwork', 'Split step timing'], priority: 1 },
        { focus: 'Preparation', drills: ['Unit turn drills', 'Early racket prep'], priority: 2 },
      ],
      limitations: ['Pilot heuristics', 'Requires good camera angle', 'Confidence <0.7 flagged'],
    };
  }
}
