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
    let explanation = 'Нейтральная базовая позиция.';

    if (lateral > 2.5) {
      recommended = 'open';
      explanation = 'Широкий мяч → открытая стойка для лучшего достижения и возврата.';
    } else if (lateral > 1.2) {
      recommended = 'semi-open';
      explanation = 'Полуширокий → полуоткрытая для баланса силы и возврата.';
    } else if (deep || fast) {
      recommended = 'closed';
      explanation = 'Глубокий/быстрый мяч → закрытая стойка для стабильности и контроля.';
    } else if (high && spin === 'topspin') {
      recommended = 'semi-open';
      explanation = 'Высокий топспин → полуоткрытая для работы с отскоком.';
    }

    const all: Stance[] = ['open', 'semi-open', 'neutral', 'closed'];
    const alternatives = all.filter(s => s !== recommended).slice(0, 2);

    return { recommended, alternatives, explanation };
  }
}
