export interface PhaseScore {
  phase: string;
  score: number;
  note: string;
}

export interface Drill {
  name: string;
  description: string;
  reps: string;
}

export interface Feedback {
  overallScore: number;
  phases: PhaseScore[];
  topFixes: string[];
  drills: Drill[];
  strengths: string[];
}

export class FeedbackEngine {
  analyze(scenario: any, stance: string, reachOk: boolean): Feedback {
    let score = 72;
    const phases: PhaseScore[] = [];
    const fixes: string[] = [];
    const strengths: string[] = [];
    const drills: Drill[] = [];

    // Base phases for groundstroke
    phases.push({
      phase: 'Подготовка (unit turn)',
      score: stance === 'open' || stance === 'semi-open' ? 78 : 70,
      note: 'Разворот плеч и бедер'
    });
    phases.push({
      phase: 'Контакт',
      score: reachOk ? 82 : 65,
      note: reachOk ? 'Хорошая дистанция' : 'Слишком далеко / близко'
    });
    phases.push({
      phase: 'Завершение',
      score: 75,
      note: 'Проводка ракетки'
    });

    if (!reachOk) {
      score -= 12;
      fixes.push('Улучши позицию и расстояние до мяча');
      drills.push({
        name: 'Работа ног в сторону',
        description: '5 шагов вправо-влево + удар по мячу с подачи',
        reps: '3 × 10'
      });
    } else {
      strengths.push('Хорошая достижимость мяча');
    }

    if (scenario.spin === 'topspin' && stance === 'closed') {
      score -= 6;
      fixes.push('Для топспина лучше полуоткрытая / открытая стойка');
    }

    if (Math.abs(scenario.bounce?.x || 0) > 2.5 && stance !== 'open') {
      score -= 8;
      fixes.push('На широком мяче используй открытую стойку');
      drills.push({
        name: 'Открытая стойка с конусом',
        description: 'Удар с вынесенной вперёд ногой и разворотом корпуса',
        reps: '4 × 8'
      });
    }

    if (fixes.length === 0) {
      strengths.push('Стойка соответствует ситуации');
      score = Math.min(92, score + 8);
    }

    // Default drill if none
    if (drills.length === 0) {
      drills.push({
        name: 'Базовый форхенд / бэкхенд',
        description: '20 ударов по подаче с контролем стойки и завершения',
        reps: '3 сета'
      });
    }

    score = Math.max(40, Math.min(95, score));

    return {
      overallScore: Math.round(score),
      phases,
      topFixes: fixes.slice(0, 3),
      drills: drills.slice(0, 2),
      strengths
    };
  }
}
