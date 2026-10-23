export type Stance = 'open' | 'semi-open' | 'neutral' | 'closed';

export interface Decision {
  recommended: Stance;
  alternatives: Stance[];
  explanation: string;
}

export class DecisionEngine {
  decide(bounceX: number, bounceZ: number, speed: number, spin: string, height: number, shot: string): Decision {
    const lateral = Math.abs(bounceX);
    const deep = bounceZ < -10.5;
    const high = height > 1;
    const fast = speed > 18;

    let recommended: Stance = 'neutral';
    let explanation = 'Neutral base position.';

    if (lateral > 2.5) {
      recommended = 'open';
      explanation = 'Wide ball → open stance for better reach and recovery.';
    } else if (lateral > 1.2) {
      recommended = 'semi-open';
      explanation = 'Semi-wide → semi-open for balance of power and recovery.';
    } else if (deep || fast) {
      recommended = 'closed';
      explanation = 'Deep/fast ball → closed stance for stability and control.';
    } else if (high && spin === 'topspin') {
      recommended = 'semi-open';
      explanation = 'High topspin → semi-open to handle the bounce.';
    }

    const all: Stance[] = ['open', 'semi-open', 'neutral', 'closed'];
    const alternatives = all.filter(s => s !== recommended).slice(0, 2);

    return { recommended, alternatives, explanation };
  }
}
