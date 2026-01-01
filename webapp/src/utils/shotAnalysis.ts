// Shot Analysis Utility - Generates natural language summaries from Trackman data

import type { Stroke, Measurement } from '../api/trackman';

interface Stats {
  avg: number;
  min: number;
  max: number;
  stdDev: number;
  values: number[];
}

interface ClubAnalysis {
  shotCount: number;
  // Distance
  carryStats?: Stats;
  totalStats?: Stats;
  // Dispersion
  carrySideStats?: Stats;
  totalSideStats?: Stats;
  // Speed
  clubSpeedStats?: Stats;
  ballSpeedStats?: Stats;
  smashFactorStats?: Stats;
  // Launch
  launchAngleStats?: Stats;
  launchDirectionStats?: Stats;
  // Spin
  spinRateStats?: Stats;
  spinAxisStats?: Stats;
  // Swing Path
  clubPathStats?: Stats;
  faceAngleStats?: Stats;
  faceToPathStats?: Stats;
  // Other
  attackAngleStats?: Stats;
  maxHeightStats?: Stats;
  landingAngleStats?: Stats;
}

function calculateStats(values: number[]): Stats | undefined {
  if (values.length === 0) return undefined;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return { avg, min, max, stdDev, values };
}

function extractValues(strokes: Stroke[], key: keyof Measurement): number[] {
  return strokes
    .map(s => (s.Measurement || s.NormalizedMeasurement)?.[key])
    .filter((v): v is number => typeof v === 'number');
}

export function analyzeClubGroup(strokes: Stroke[]): ClubAnalysis {
  return {
    shotCount: strokes.length,
    carryStats: calculateStats(extractValues(strokes, 'Carry')),
    totalStats: calculateStats(extractValues(strokes, 'Total')),
    carrySideStats: calculateStats(extractValues(strokes, 'CarrySide')),
    totalSideStats: calculateStats(extractValues(strokes, 'TotalSide')),
    clubSpeedStats: calculateStats(extractValues(strokes, 'ClubSpeed')),
    ballSpeedStats: calculateStats(extractValues(strokes, 'BallSpeed')),
    smashFactorStats: calculateStats(extractValues(strokes, 'SmashFactor')),
    launchAngleStats: calculateStats(extractValues(strokes, 'LaunchAngle')),
    launchDirectionStats: calculateStats(extractValues(strokes, 'LaunchDirection')),
    spinRateStats: calculateStats(extractValues(strokes, 'SpinRate')),
    spinAxisStats: calculateStats(extractValues(strokes, 'SpinAxis')),
    clubPathStats: calculateStats(extractValues(strokes, 'ClubPath')),
    faceAngleStats: calculateStats(extractValues(strokes, 'FaceAngle')),
    faceToPathStats: calculateStats(extractValues(strokes, 'FaceToPath')),
    attackAngleStats: calculateStats(extractValues(strokes, 'AttackAngle')),
    maxHeightStats: calculateStats(extractValues(strokes, 'MaxHeight')),
    landingAngleStats: calculateStats(extractValues(strokes, 'LandingAngle')),
  };
}

function formatNum(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function getConsistencyRating(stdDev: number, avg: number): 'excellent' | 'good' | 'moderate' | 'inconsistent' {
  const cv = (stdDev / Math.abs(avg)) * 100; // Coefficient of variation
  if (cv < 3) return 'excellent';
  if (cv < 6) return 'good';
  if (cv < 10) return 'moderate';
  return 'inconsistent';
}

function getDispersionRating(stdDev: number): 'tight' | 'good' | 'moderate' | 'wide' {
  if (stdDev < 5) return 'tight';
  if (stdDev < 10) return 'good';
  if (stdDev < 18) return 'moderate';
  return 'wide';
}

function getPathTendency(avg: number): string {
  if (avg < -3) return 'strongly in-to-out';
  if (avg < -1) return 'slightly in-to-out';
  if (avg > 3) return 'strongly out-to-in';
  if (avg > 1) return 'slightly out-to-in';
  return 'neutral';
}

function getFaceTendency(avg: number): string {
  if (avg < -3) return 'significantly closed';
  if (avg < -1) return 'slightly closed';
  if (avg > 3) return 'significantly open';
  if (avg > 1) return 'slightly open';
  return 'square';
}

function getShotShape(_clubPath: number, faceToPath: number): string {
  // Negative face-to-path = face closed to path = draw/hook
  // Positive face-to-path = face open to path = fade/slice
  // Note: clubPath affects curve direction but faceToPath determines magnitude
  const shape = faceToPath < -2 ? 'draw' : faceToPath > 2 ? 'fade' : 'straight';
  const severity = Math.abs(faceToPath) > 5 ? 'strong ' : '';
  return severity + shape;
}

function getSpinAssessment(spinRate: number, club: string): string {
  const clubLower = club.toLowerCase();

  // Driver spin assessment
  if (clubLower.includes('driver')) {
    if (spinRate < 2000) return 'very low (may balloon or have limited carry)';
    if (spinRate < 2500) return 'optimal for distance';
    if (spinRate < 3000) return 'slightly high';
    return 'too high (losing distance)';
  }

  // Iron spin (rough estimates)
  if (clubLower.includes('iron') || clubLower.includes('wedge')) {
    if (spinRate < 4000) return 'low (may struggle to hold greens)';
    if (spinRate < 7000) return 'good';
    if (spinRate < 9000) return 'high (good stopping power)';
    return 'very high';
  }

  return 'within normal range';
}

function getLaunchAssessment(launchAngle: number, club: string): string {
  const clubLower = club.toLowerCase();

  if (clubLower.includes('driver')) {
    if (launchAngle < 9) return 'too low for optimal carry';
    if (launchAngle < 12) return 'slightly low';
    if (launchAngle < 15) return 'optimal';
    if (launchAngle < 18) return 'slightly high';
    return 'too high';
  }

  // Simplified for other clubs
  if (launchAngle < 10) return 'low';
  if (launchAngle < 20) return 'mid';
  if (launchAngle < 30) return 'high';
  return 'very high';
}

function getSmashFactorAssessment(smashFactor: number, club: string): string {
  const clubLower = club.toLowerCase();

  if (clubLower.includes('driver')) {
    if (smashFactor >= 1.50) return 'excellent (tour-level efficiency)';
    if (smashFactor >= 1.48) return 'very good';
    if (smashFactor >= 1.45) return 'good';
    if (smashFactor >= 1.40) return 'below average';
    return 'poor (check strike quality)';
  }

  // Irons have lower smash factors due to loft
  if (smashFactor >= 1.38) return 'excellent';
  if (smashFactor >= 1.33) return 'good';
  if (smashFactor >= 1.28) return 'average';
  return 'below average';
}

export function generateShotSummary(strokes: Stroke[], clubName: string): string {
  const analysis = analyzeClubGroup(strokes);
  const parts: string[] = [];

  if (analysis.shotCount < 3) {
    return `Only ${analysis.shotCount} shot${analysis.shotCount === 1 ? '' : 's'} recorded—more data needed for meaningful analysis.`;
  }

  // Distance summary
  if (analysis.carryStats) {
    const distConsistency = getConsistencyRating(analysis.carryStats.stdDev, analysis.carryStats.avg);
    parts.push(`Averaging ${formatNum(analysis.carryStats.avg)} yards carry with ${distConsistency} consistency (${formatNum(analysis.carryStats.min)}–${formatNum(analysis.carryStats.max)} range).`);
  }

  // Dispersion analysis
  if (analysis.carrySideStats) {
    const dispersion = getDispersionRating(analysis.carrySideStats.stdDev);
    const avgSide = analysis.carrySideStats.avg;
    let tendency = '';
    if (Math.abs(avgSide) > 5) {
      tendency = avgSide < 0 ? ` with a tendency left` : ` with a tendency right`;
    }
    parts.push(`Dispersion is ${dispersion} (±${formatNum(analysis.carrySideStats.stdDev)} yards)${tendency}.`);
  }

  // Swing path and face analysis
  if (analysis.clubPathStats && analysis.faceAngleStats && analysis.faceToPathStats) {
    const pathTendency = getPathTendency(analysis.clubPathStats.avg);
    const faceTendency = getFaceTendency(analysis.faceAngleStats.avg);
    const shotShape = getShotShape(analysis.clubPathStats.avg, analysis.faceToPathStats.avg);

    parts.push(`Swing path is ${pathTendency} (${formatNum(analysis.clubPathStats.avg)}°) with a ${faceTendency} face (${formatNum(analysis.faceAngleStats.avg)}°), producing a ${shotShape}.`);

    // Path consistency
    if (analysis.clubPathStats.stdDev > 3) {
      parts.push(`Path consistency could improve—varying by ±${formatNum(analysis.clubPathStats.stdDev)}°.`);
    }
  }

  // Speed and efficiency
  if (analysis.clubSpeedStats && analysis.smashFactorStats) {
    const speedConsistency = getConsistencyRating(analysis.clubSpeedStats.stdDev, analysis.clubSpeedStats.avg);
    const smashAssessment = getSmashFactorAssessment(analysis.smashFactorStats.avg, clubName);

    parts.push(`Club speed averaging ${formatNum(analysis.clubSpeedStats.avg)} mph (${speedConsistency} consistency). Smash factor of ${formatNum(analysis.smashFactorStats.avg, 2)} is ${smashAssessment}.`);
  }

  // Launch conditions
  if (analysis.launchAngleStats) {
    const launchAssessment = getLaunchAssessment(analysis.launchAngleStats.avg, clubName);
    parts.push(`Launch angle averaging ${formatNum(analysis.launchAngleStats.avg)}° (${launchAssessment}).`);
  }

  // Spin analysis
  if (analysis.spinRateStats) {
    const spinAssessment = getSpinAssessment(analysis.spinRateStats.avg, clubName);
    const spinConsistency = getConsistencyRating(analysis.spinRateStats.stdDev, analysis.spinRateStats.avg);
    parts.push(`Spin rate averaging ${formatNum(analysis.spinRateStats.avg, 0)} rpm—${spinAssessment}. Spin consistency is ${spinConsistency}.`);
  }

  // Spin axis (affects curve)
  if (analysis.spinAxisStats && Math.abs(analysis.spinAxisStats.avg) > 5) {
    const tilt = analysis.spinAxisStats.avg < 0 ? 'left (draw spin)' : 'right (fade spin)';
    parts.push(`Spin axis tilted ${formatNum(Math.abs(analysis.spinAxisStats.avg))}° ${tilt}.`);
  }

  // Attack angle (important for driver)
  if (analysis.attackAngleStats && clubName.toLowerCase().includes('driver')) {
    const attack = analysis.attackAngleStats.avg;
    let attackNote = '';
    if (attack < -2) {
      attackNote = 'hitting down too much—try teeing higher or ball forward';
    } else if (attack < 2) {
      attackNote = 'slightly ascending or level';
    } else if (attack < 5) {
      attackNote = 'good ascending strike for distance';
    } else {
      attackNote = 'very steep upward—may be sacrificing control';
    }
    parts.push(`Attack angle of ${formatNum(attack)}° (${attackNote}).`);
  }

  // Overall consistency score
  const consistencyScores: number[] = [];
  if (analysis.carryStats) consistencyScores.push(analysis.carryStats.stdDev / analysis.carryStats.avg);
  if (analysis.carrySideStats) consistencyScores.push(analysis.carrySideStats.stdDev / 20); // Normalize
  if (analysis.clubSpeedStats) consistencyScores.push(analysis.clubSpeedStats.stdDev / analysis.clubSpeedStats.avg);
  if (analysis.spinRateStats) consistencyScores.push(analysis.spinRateStats.stdDev / analysis.spinRateStats.avg);

  if (consistencyScores.length >= 3) {
    const avgCV = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;
    let overallConsistency: string;
    if (avgCV < 0.03) overallConsistency = 'Excellent';
    else if (avgCV < 0.06) overallConsistency = 'Good';
    else if (avgCV < 0.10) overallConsistency = 'Moderate';
    else overallConsistency = 'Work needed on';

    parts.push(`${overallConsistency} overall shot-to-shot repeatability.`);
  }

  return parts.join(' ');
}

// Generate key insights (bullet points) for quick reference
export function generateKeyInsights(strokes: Stroke[], clubName: string): string[] {
  const analysis = analyzeClubGroup(strokes);
  const insights: string[] = [];

  if (analysis.shotCount < 3) return [];

  // Highlight strengths
  if (analysis.smashFactorStats && analysis.smashFactorStats.avg >= 1.48) {
    insights.push('Strong ball striking efficiency');
  }

  if (analysis.carrySideStats && analysis.carrySideStats.stdDev < 8) {
    insights.push('Tight lateral dispersion');
  }

  if (analysis.clubSpeedStats && analysis.clubSpeedStats.stdDev / analysis.clubSpeedStats.avg < 0.03) {
    insights.push('Very consistent swing speed');
  }

  // Highlight areas to work on
  if (analysis.faceToPathStats && Math.abs(analysis.faceToPathStats.avg) > 4) {
    const issue = analysis.faceToPathStats.avg > 0 ? 'Face open to path (slice tendency)' : 'Face closed to path (hook tendency)';
    insights.push(issue);
  }

  if (analysis.carrySideStats && Math.abs(analysis.carrySideStats.avg) > 10) {
    const direction = analysis.carrySideStats.avg < 0 ? 'left' : 'right';
    insights.push(`Consistent miss ${direction}—check alignment`);
  }

  if (analysis.spinRateStats && clubName.toLowerCase().includes('driver') && analysis.spinRateStats.avg > 3000) {
    insights.push('High driver spin—losing distance');
  }

  if (analysis.clubPathStats && analysis.clubPathStats.stdDev > 4) {
    insights.push('Inconsistent swing path');
  }

  return insights;
}
