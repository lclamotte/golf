import { useState, useEffect, useMemo } from 'react';
import { trackmanApi, type Activity, type Scorecard, type ActivityReport, type StrokeGroup, type Measurement } from '../api/trackman';
import { generateShotSummary, generateKeyInsights } from '../utils/shotAnalysis';
import { ShotVisualizationPanel, MomentumChart } from './ShotVisualizations';

interface ShotChartProps {
  session: Activity;
}

function getActivityLabel(activity: Activity): string {
  switch (activity.kind) {
    case 'RANGE_PRACTICE':
      return 'Range Practice';
    case 'SHOT_ANALYSIS':
      return 'Shot Analysis';
    case 'SESSION':
      return 'Practice Session';
    case 'VIRTUAL_RANGE':
      return 'Virtual Range';
    case 'COURSE_PLAY':
      return activity.course?.displayName || 'Course Play';
    default:
      return activity.kind;
  }
}

function formatClubName(club: string): string {
  // Convert camelCase to readable format
  return club
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Round Statistics Calculator
function calculateRoundStats(holes: Scorecard['holes']) {
  const stats = {
    eagles: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doubles: 0,
    triplePlus: 0,
    totalShots: 0,
    totalPutts: 0, // Estimated as last 2 shots per hole on avg
    par3s: { count: 0, totalScore: 0, totalPar: 0 },
    par4s: { count: 0, totalScore: 0, totalPar: 0 },
    par5s: { count: 0, totalScore: 0, totalPar: 0 },
    mulligansUsed: 0,
    totalDistance: 0,
  };

  holes.forEach(h => {
    const diff = h.grossScore - h.par;
    if (diff <= -2) stats.eagles++;
    else if (diff === -1) stats.birdies++;
    else if (diff === 0) stats.pars++;
    else if (diff === 1) stats.bogeys++;
    else if (diff === 2) stats.doubles++;
    else stats.triplePlus++;

    stats.totalShots += h.shots?.length || 0;
    stats.mulligansUsed += h.mulligans || 0;
    stats.totalDistance += h.distance || 0;

    if (h.par === 3) {
      stats.par3s.count++;
      stats.par3s.totalScore += h.grossScore;
      stats.par3s.totalPar += h.par;
    } else if (h.par === 4) {
      stats.par4s.count++;
      stats.par4s.totalScore += h.grossScore;
      stats.par4s.totalPar += h.par;
    } else if (h.par === 5) {
      stats.par5s.count++;
      stats.par5s.totalScore += h.grossScore;
      stats.par5s.totalPar += h.par;
    }
  });

  return stats;
}

// Scorecard View Component
function ScorecardView({ scorecard }: { scorecard: Scorecard }) {
  const [showDetails, setShowDetails] = useState(false);

  const front9 = scorecard.holes.filter(h => h.holeNumber <= 9);
  const back9 = scorecard.holes.filter(h => h.holeNumber > 9);

  const front9Par = front9.reduce((sum, h) => sum + h.par, 0);
  const back9Par = back9.reduce((sum, h) => sum + h.par, 0);
  const front9Score = front9.reduce((sum, h) => sum + h.grossScore, 0);
  const back9Score = back9.reduce((sum, h) => sum + h.grossScore, 0);
  const front9Distance = front9.reduce((sum, h) => sum + (h.distance || 0), 0);
  const back9Distance = back9.reduce((sum, h) => sum + (h.distance || 0), 0);

  const totalScore = front9Score + back9Score;
  const totalPar = front9Par + back9Par;
  const stats = calculateRoundStats(scorecard.holes);

  return (
    <div className="scorecard-view">
      {/* Course & Player Header */}
      <div className="round-header">
        <div className="course-info">
          <h3>{scorecard.course.displayName}</h3>
          <span className="tee-info">{scorecard.player.tee || scorecard.course.tee?.name} Tees</span>
        </div>
        <div className="player-badge">
          <span className="player-name">{scorecard.player.name}</span>
          <span className="player-hcp">HCP {scorecard.player.courseHcp >= 0 ? '+' : ''}{scorecard.player.courseHcp}</span>
        </div>
      </div>

      {/* Score Summary Cards */}
      <div className="score-summary">
        <div className="summary-card primary">
          <span className="summary-value">{totalScore}</span>
          <span className="summary-label">Total</span>
          <span className={`summary-sub ${totalScore - totalPar <= 0 ? 'under' : 'over'}`}>
            {formatToPar(totalScore - totalPar)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{front9Score}</span>
          <span className="summary-label">Front 9</span>
          <span className={`summary-sub ${front9Score - front9Par <= 0 ? 'under' : 'over'}`}>
            {formatToPar(front9Score - front9Par)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{back9Score}</span>
          <span className="summary-label">Back 9</span>
          <span className={`summary-sub ${back9Score - back9Par <= 0 ? 'under' : 'over'}`}>
            {formatToPar(back9Score - back9Par)}
          </span>
        </div>
      </div>

      {/* Momentum Chart - Round Narrative */}
      <MomentumChart holes={scorecard.holes} />

      {/* Score Distribution */}
      <div className="score-distribution">
        <h4>Score Distribution</h4>
        <div className="distribution-bars">
          {stats.eagles > 0 && (
            <div className="dist-item eagle">
              <span className="dist-count">{stats.eagles}</span>
              <span className="dist-label">Eagle</span>
            </div>
          )}
          <div className="dist-item birdie">
            <span className="dist-count">{stats.birdies}</span>
            <span className="dist-label">Birdie</span>
          </div>
          <div className="dist-item par">
            <span className="dist-count">{stats.pars}</span>
            <span className="dist-label">Par</span>
          </div>
          <div className="dist-item bogey">
            <span className="dist-count">{stats.bogeys}</span>
            <span className="dist-label">Bogey</span>
          </div>
          <div className="dist-item double">
            <span className="dist-count">{stats.doubles}</span>
            <span className="dist-label">Double</span>
          </div>
          {stats.triplePlus > 0 && (
            <div className="dist-item triple-plus">
              <span className="dist-count">{stats.triplePlus}</span>
              <span className="dist-label">Triple+</span>
            </div>
          )}
        </div>
      </div>

      {/* Par Performance */}
      <div className="par-performance">
        <h4>Performance by Par</h4>
        <div className="par-stats">
          {stats.par3s.count > 0 && (
            <div className="par-stat">
              <span className="par-type">Par 3s</span>
              <span className="par-score">{stats.par3s.totalScore}/{stats.par3s.totalPar}</span>
              <span className={`par-diff ${stats.par3s.totalScore - stats.par3s.totalPar <= 0 ? 'under' : 'over'}`}>
                {formatToPar(stats.par3s.totalScore - stats.par3s.totalPar)}
              </span>
              <span className="par-avg">{(stats.par3s.totalScore / stats.par3s.count).toFixed(2)} avg</span>
            </div>
          )}
          {stats.par4s.count > 0 && (
            <div className="par-stat">
              <span className="par-type">Par 4s</span>
              <span className="par-score">{stats.par4s.totalScore}/{stats.par4s.totalPar}</span>
              <span className={`par-diff ${stats.par4s.totalScore - stats.par4s.totalPar <= 0 ? 'under' : 'over'}`}>
                {formatToPar(stats.par4s.totalScore - stats.par4s.totalPar)}
              </span>
              <span className="par-avg">{(stats.par4s.totalScore / stats.par4s.count).toFixed(2)} avg</span>
            </div>
          )}
          {stats.par5s.count > 0 && (
            <div className="par-stat">
              <span className="par-type">Par 5s</span>
              <span className="par-score">{stats.par5s.totalScore}/{stats.par5s.totalPar}</span>
              <span className={`par-diff ${stats.par5s.totalScore - stats.par5s.totalPar <= 0 ? 'under' : 'over'}`}>
                {formatToPar(stats.par5s.totalScore - stats.par5s.totalPar)}
              </span>
              <span className="par-avg">{(stats.par5s.totalScore / stats.par5s.count).toFixed(2)} avg</span>
            </div>
          )}
        </div>
      </div>

      {/* Toggle for detailed scorecard */}
      <button className="toggle-details" onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? 'Hide Detailed Scorecard' : 'Show Detailed Scorecard'}
      </button>

      {/* Detailed Scorecard Table */}
      {showDetails && (
        <div className="scorecard-table-wrapper">
          <table className="scorecard-table detailed">
            <thead>
              <tr>
                <th>Hole</th>
                {front9.map(h => <th key={h.holeNumber}>{h.holeNumber}</th>)}
                <th className="subtotal">Out</th>
                {back9.map(h => <th key={h.holeNumber}>{h.holeNumber}</th>)}
                <th className="subtotal">In</th>
                <th className="total">Tot</th>
              </tr>
            </thead>
            <tbody>
              {/* Distance Row */}
              <tr className="distance-row">
                <td>Yards</td>
                {front9.map(h => <td key={h.holeNumber}>{Math.round(h.distance)}</td>)}
                <td className="subtotal">{Math.round(front9Distance)}</td>
                {back9.map(h => <td key={h.holeNumber}>{Math.round(h.distance)}</td>)}
                <td className="subtotal">{Math.round(back9Distance)}</td>
                <td className="total">{Math.round(front9Distance + back9Distance)}</td>
              </tr>
              {/* Stroke Index Row */}
              <tr className="hdcp-row">
                <td>HDCP</td>
                {front9.map(h => <td key={h.holeNumber}>{h.strokeIndex}</td>)}
                <td className="subtotal"></td>
                {back9.map(h => <td key={h.holeNumber}>{h.strokeIndex}</td>)}
                <td className="subtotal"></td>
                <td className="total"></td>
              </tr>
              {/* Par Row */}
              <tr className="par-row">
                <td>Par</td>
                {front9.map(h => <td key={h.holeNumber}>{h.par}</td>)}
                <td className="subtotal">{front9Par}</td>
                {back9.map(h => <td key={h.holeNumber}>{h.par}</td>)}
                <td className="subtotal">{back9Par}</td>
                <td className="total">{totalPar}</td>
              </tr>
              {/* Score Row */}
              <tr className="score-row">
                <td>Score</td>
                {front9.map(h => (
                  <td key={h.holeNumber} className={getScoreClass(h.grossScore, h.par)}>
                    {h.grossScore}
                  </td>
                ))}
                <td className="subtotal">{front9Score}</td>
                {back9.map(h => (
                  <td key={h.holeNumber} className={getScoreClass(h.grossScore, h.par)}>
                    {h.grossScore}
                  </td>
                ))}
                <td className="subtotal">{back9Score}</td>
                <td className="total">{totalScore}</td>
              </tr>
              {/* To Par Row */}
              <tr className="to-par-row">
                <td>+/-</td>
                {front9.map(h => (
                  <td key={h.holeNumber} className={getScoreClass(h.grossScore, h.par)}>
                    {formatToPar(h.grossScore - h.par)}
                  </td>
                ))}
                <td className="subtotal">{formatToPar(front9Score - front9Par)}</td>
                {back9.map(h => (
                  <td key={h.holeNumber} className={getScoreClass(h.grossScore, h.par)}>
                    {formatToPar(h.grossScore - h.par)}
                  </td>
                ))}
                <td className="subtotal">{formatToPar(back9Score - back9Par)}</td>
                <td className="total">{formatToPar(totalScore - totalPar)}</td>
              </tr>
              {/* Shots Row */}
              <tr className="shots-row">
                <td>Shots</td>
                {front9.map(h => <td key={h.holeNumber}>{h.shots?.length || '-'}</td>)}
                <td className="subtotal">{front9.reduce((s, h) => s + (h.shots?.length || 0), 0)}</td>
                {back9.map(h => <td key={h.holeNumber}>{h.shots?.length || '-'}</td>)}
                <td className="subtotal">{back9.reduce((s, h) => s + (h.shots?.length || 0), 0)}</td>
                <td className="total">{stats.totalShots}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Round Info Footer */}
      <div className="round-footer">
        <span>Played {new Date(scorecard.startedAt).toLocaleDateString()}</span>
        {stats.mulligansUsed > 0 && <span>{stats.mulligansUsed} mulligan{stats.mulligansUsed > 1 ? 's' : ''} used</span>}
        <span>{Math.round(stats.totalDistance).toLocaleString()} yards</span>
      </div>
    </div>
  );
}

// Shot Analysis View Component
function ShotAnalysisView({ report }: { report: ActivityReport }) {
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  // Get unique clubs from the report
  const availableClubs = useMemo(() => {
    if (!report.StrokeGroups) return [];
    return report.StrokeGroups.map(g => g.Club);
  }, [report.StrokeGroups]);

  // Initialize with first club selected
  useEffect(() => {
    if (availableClubs.length > 0 && selectedClub === null) {
      setSelectedClub(availableClubs[0]);
    }
  }, [availableClubs, selectedClub]);

  if (!report.StrokeGroups || report.StrokeGroups.length === 0) {
    return (
      <div className="shot-analysis-view">
        <p>No shot data found.</p>
      </div>
    );
  }

  const selectedGroup = report.StrokeGroups.find(g => g.Club === selectedClub);

  return (
    <div className="shot-analysis-view">
      {/* Club Selector */}
      {availableClubs.length > 1 && (
        <div className="club-filter">
          <div className="filter-header">
            <span className="filter-label">Select Club</span>
          </div>
          <div className="club-chips">
            {availableClubs.map(club => {
              const group = report.StrokeGroups?.find(g => g.Club === club);
              const shotCount = group?.Strokes?.length || 0;
              const isSelected = selectedClub === club;
              return (
                <button
                  key={club}
                  className={`club-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedClub(club)}
                >
                  <span className="chip-name">{formatClubName(club)}</span>
                  <span className="chip-count">{shotCount}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Club Data */}
      {selectedGroup && (
        <ClubGroupView key={`${selectedGroup.Club}-${selectedGroup.Id}`} group={selectedGroup} />
      )}
    </div>
  );
}

function ClubGroupView({ group }: { group: StrokeGroup }) {
  const strokes = group.Strokes || [];
  const clubName = formatClubName(group.Club);
  const summary = generateShotSummary(strokes, group.Club);
  const insights = generateKeyInsights(strokes, group.Club);

  return (
    <div className="club-section">
      <h3>{clubName} ({strokes.length} shots)</h3>

      {strokes.length >= 3 && (
        <div className="shot-summary">
          <p className="summary-text">{summary}</p>
          {insights.length > 0 && (
            <ul className="key-insights">
              {insights.map((insight, idx) => (
                <li key={idx} className={insight.includes('tendency') || insight.includes('losing') || insight.includes('Inconsistent') || insight.includes('miss') ? 'warning' : 'positive'}>
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ShotVisualizationPanel strokes={strokes} />

      <table className="shots-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Carry</th>
            <th>Total</th>
            <th>Ball Spd</th>
            <th>Club Spd</th>
            <th>Launch</th>
            <th>Spin</th>
            <th>Height</th>
            <th>Side</th>
          </tr>
        </thead>
        <tbody>
          {strokes.map((stroke, idx) => {
            const m = stroke.Measurement || stroke.NormalizedMeasurement;
            return (
              <tr key={stroke.Id}>
                <td>{idx + 1}</td>
                <td>{m?.Carry?.toFixed(1) ?? '-'}</td>
                <td>{m?.Total?.toFixed(1) ?? '-'}</td>
                <td>{m?.BallSpeed?.toFixed(1) ?? '-'}</td>
                <td>{m?.ClubSpeed?.toFixed(1) ?? '-'}</td>
                <td>{m?.LaunchAngle?.toFixed(1) ?? '-'}°</td>
                <td>{m?.SpinRate?.toFixed(0) ?? '-'}</td>
                <td>{m?.MaxHeight?.toFixed(0) ?? '-'}</td>
                <td className={getSideClass(m?.CarrySide)}>{formatSide(m?.CarrySide)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Med</td>
            <td>{medianMeasurement(strokes, 'Carry')}</td>
            <td>{medianMeasurement(strokes, 'Total')}</td>
            <td>{medianMeasurement(strokes, 'BallSpeed')}</td>
            <td>{medianMeasurement(strokes, 'ClubSpeed')}</td>
            <td>{medianMeasurement(strokes, 'LaunchAngle')}°</td>
            <td>{medianMeasurementInt(strokes, 'SpinRate')}</td>
            <td>{medianMeasurementInt(strokes, 'MaxHeight')}</td>
            <td>{medianMeasurement(strokes, 'CarrySide')}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function medianMeasurement(strokes: { Measurement?: Measurement; NormalizedMeasurement?: Measurement }[], key: keyof Measurement): string {
  const values = strokes
    .map(s => (s.Measurement || s.NormalizedMeasurement)?.[key])
    .filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return '-';
  return calculateMedian(values).toFixed(1);
}

function medianMeasurementInt(strokes: { Measurement?: Measurement; NormalizedMeasurement?: Measurement }[], key: keyof Measurement): string {
  const values = strokes
    .map(s => (s.Measurement || s.NormalizedMeasurement)?.[key])
    .filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return '-';
  return Math.round(calculateMedian(values)).toString();
}

function getSideClass(side?: number): string {
  if (side === undefined) return '';
  if (Math.abs(side) < 5) return 'straight';
  return side < 0 ? 'left' : 'right';
}

function formatSide(side?: number): string {
  if (side === undefined) return '-';
  const abs = Math.abs(side).toFixed(1);
  if (side < -0.5) return `${abs}L`;
  if (side > 0.5) return `${abs}R`;
  return abs;
}

function getScoreClass(score: number, par: number): string {
  const diff = score - par;
  if (diff <= -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  if (diff === 2) return 'double';
  return 'triple-plus';
}

function formatToPar(diff: number): string {
  if (diff === 0) return 'E';
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

export function ShotChart({ session }: ShotChartProps) {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [activityReport, setActivityReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shotCount = session.strokeCount ?? session.numberOfStrokes;
  const isCoursePlay = session.kind === 'COURSE_PLAY' && session.scorecard?.id;
  const isShotAnalysis = session.kind === 'SHOT_ANALYSIS' && session.reportLink;

  useEffect(() => {
    setScorecard(null);
    setActivityReport(null);
    setError(null);

    if (isCoursePlay && session.scorecard?.id) {
      setLoading(true);
      trackmanApi.getScorecard(session.scorecard.id)
        .then(setScorecard)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else if (isShotAnalysis && session.reportLink) {
      setLoading(true);
      trackmanApi.getActivityReport(session.reportLink)
        .then(setActivityReport)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [session.id, isCoursePlay, isShotAnalysis, session.scorecard?.id, session.reportLink]);

  return (
    <div className="shot-chart">
      <h2>{getActivityLabel(session)}</h2>
      <p className="session-info">
        {new Date(session.time).toLocaleDateString()}
        {shotCount && ` · ${shotCount} shots`}
        {session.grossScore !== undefined && ` · Score: ${session.grossScore}`}
        {session.toPar !== undefined && ` (${session.toPar > 0 ? '+' : ''}${session.toPar})`}
      </p>

      {loading && <div className="loading">Loading data...</div>}
      {error && <div className="error">Error: {error}</div>}

      {scorecard && <ScorecardView scorecard={scorecard} />}
      {activityReport && <ShotAnalysisView report={activityReport} />}

      {!isCoursePlay && !isShotAnalysis && (
        <div className="activity-details">
          <table>
            <tbody>
              <tr>
                <td>Activity Type</td>
                <td>{session.kind}</td>
              </tr>
              <tr>
                <td>Date</td>
                <td>{new Date(session.time).toLocaleString()}</td>
              </tr>
              {shotCount && (
                <tr>
                  <td>Shots</td>
                  <td>{shotCount}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
