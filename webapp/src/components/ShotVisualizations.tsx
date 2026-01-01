// Shot Visualizations - SVG-based charts for impact, launch, and dispersion

import { useState, useRef } from 'react';
import type { Stroke, Measurement } from '../api/trackman';

interface VisualizationProps {
  strokes: Stroke[];
}

interface TooltipData {
  x: number;
  y: number;
  content: React.ReactNode;
}

function getMeasurement(stroke: Stroke): Measurement | undefined {
  return stroke.Measurement || stroke.NormalizedMeasurement;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Shared Tooltip Component
function Tooltip({ data }: { data: TooltipData | null }) {
  if (!data) return null;

  return (
    <div
      className="chart-tooltip"
      style={{
        left: data.x,
        top: data.y,
      }}
    >
      {data.content}
    </div>
  );
}

// ============================================
// DISPERSION CHART - Bird's eye view of landing spots
// ============================================
export function DispersionChart({ strokes }: VisualizationProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data = strokes
    .map((s, idx) => {
      const m = getMeasurement(s);
      if (m?.Carry === undefined || m?.CarrySide === undefined) return null;
      return {
        carry: m.Carry,
        side: m.CarrySide,
        total: m.Total,
        idx: idx + 1
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (data.length < 2) {
    return <div className="viz-placeholder">Need 2+ shots for dispersion chart</div>;
  }

  // Calculate bounds
  const carries = data.map(d => d.carry);
  const sides = data.map(d => d.side);
  const medianCarry = calculateMedian(carries);
  const maxSide = Math.max(Math.abs(Math.min(...sides)), Math.abs(Math.max(...sides)), 15);
  const carryRange = Math.max(...carries) - Math.min(...carries);
  const minCarry = Math.min(...carries) - carryRange * 0.2;
  const maxCarry = Math.max(...carries) + carryRange * 0.2;

  // SVG dimensions
  const width = 280;
  const height = 320;
  const padding = { top: 30, right: 40, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const scaleX = (side: number) => padding.left + ((side + maxSide) / (maxSide * 2)) * chartWidth;
  const scaleY = (carry: number) => padding.top + chartHeight - ((carry - minCarry) / (maxCarry - minCarry)) * chartHeight;

  // Grid lines
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    minCarry + (i / (yTicks - 1)) * (maxCarry - minCarry)
  );

  const handleMouseEnter = (d: typeof data[0], event: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const sideLabel = d.side < -0.5 ? `${Math.abs(d.side).toFixed(1)} left` :
                      d.side > 0.5 ? `${d.side.toFixed(1)} right` : 'center';

    setTooltip({
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      content: (
        <>
          <div className="tooltip-title">Shot {d.idx}</div>
          <div className="tooltip-row"><span>Carry:</span> <strong>{d.carry.toFixed(1)} yds</strong></div>
          {d.total && <div className="tooltip-row"><span>Total:</span> <strong>{d.total.toFixed(1)} yds</strong></div>}
          <div className="tooltip-row"><span>Offline:</span> <strong>{sideLabel}</strong></div>
        </>
      )
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div className="visualization dispersion-chart">
      <h4>Shot Dispersion</h4>
      <div className="chart-container">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          {/* Background */}
          <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="var(--green-50)" rx="4" />

          {/* Fairway center line */}
          <line
            x1={scaleX(0)} y1={padding.top}
            x2={scaleX(0)} y2={padding.top + chartHeight}
            stroke="var(--green-300)"
            strokeWidth="2"
            strokeDasharray="8,4"
          />

          {/* Median carry line */}
          <line
            x1={padding.left} y1={scaleY(medianCarry)}
            x2={padding.left + chartWidth} y2={scaleY(medianCarry)}
            stroke="var(--green-400)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          <text
            x={padding.left + chartWidth + 4}
            y={scaleY(medianCarry) + 4}
            fontSize="10"
            fill="var(--green-600)"
          >
            med
          </text>

          {/* Y-axis grid and labels */}
          {yTickValues.map((val, i) => (
            <g key={i}>
              <line
                x1={padding.left} y1={scaleY(val)}
                x2={padding.left + chartWidth} y2={scaleY(val)}
                stroke="var(--gray-200)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={scaleY(val) + 4}
                fontSize="10"
                fill="var(--gray-500)"
                textAnchor="end"
              >
                {Math.round(val)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          <text x={padding.left} y={height - 8} fontSize="10" fill="var(--gray-500)" textAnchor="middle">
            {Math.round(-maxSide)}L
          </text>
          <text x={scaleX(0)} y={height - 8} fontSize="10" fill="var(--gray-500)" textAnchor="middle">
            0
          </text>
          <text x={padding.left + chartWidth} y={height - 8} fontSize="10" fill="var(--gray-500)" textAnchor="middle">
            {Math.round(maxSide)}R
          </text>

          {/* Axis labels */}
          <text x={width / 2} y={height - 2} fontSize="11" fill="var(--gray-600)" textAnchor="middle">
            Lateral (yards)
          </text>
          <text
            x={12} y={height / 2}
            fontSize="11"
            fill="var(--gray-600)"
            textAnchor="middle"
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            Carry (yards)
          </text>

          {/* Shot dots */}
          {data.map((d, i) => {
            const x = scaleX(d.side);
            const y = scaleY(d.carry);
            const color = Math.abs(d.side) < 10 ? 'var(--green-500)' :
                          d.side < 0 ? 'var(--red)' : 'var(--blue)';
            return (
              <g
                key={i}
                className="data-point"
                onMouseEnter={(e) => handleMouseEnter(d, e)}
                onMouseLeave={handleMouseLeave}
              >
                <circle
                  cx={x} cy={y} r="6"
                  fill={color}
                  fillOpacity="0.7"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <text
                  x={x} y={y + 3.5}
                  fontSize="8"
                  fill="white"
                  textAnchor="middle"
                  fontWeight="600"
                  style={{ pointerEvents: 'none' }}
                >
                  {d.idx}
                </text>
              </g>
            );
          })}
        </svg>
        <Tooltip data={tooltip} />
      </div>
      <div className="viz-legend">
        <span className="legend-item"><span className="dot straight"></span> Center</span>
        <span className="legend-item"><span className="dot left"></span> Left</span>
        <span className="legend-item"><span className="dot right"></span> Right</span>
      </div>
    </div>
  );
}

// ============================================
// IMPACT CHART - Club path vs face angle
// ============================================
export function ImpactChart({ strokes }: VisualizationProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data = strokes
    .map((s, idx) => {
      const m = getMeasurement(s);
      if (m?.ClubPath === undefined || m?.FaceAngle === undefined) return null;
      return {
        path: m.ClubPath,
        face: m.FaceAngle,
        faceToPath: m.FaceToPath ?? (m.FaceAngle - m.ClubPath),
        attackAngle: m.AttackAngle,
        idx: idx + 1
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (data.length < 2) {
    return <div className="viz-placeholder">Need 2+ shots with impact data</div>;
  }

  // Calculate bounds (typically within ±10°)
  const allAngles = [...data.map(d => d.path), ...data.map(d => d.face)];
  const maxAngle = Math.max(Math.abs(Math.min(...allAngles)), Math.abs(Math.max(...allAngles)), 8);
  const bound = Math.ceil(maxAngle / 2) * 2; // Round up to even number

  const medianPath = calculateMedian(data.map(d => d.path));
  const medianFace = calculateMedian(data.map(d => d.face));

  // SVG dimensions
  const size = 260;
  const padding = 40;
  const chartSize = size - padding * 2;
  const center = size / 2;

  // Scale function
  const scale = (val: number) => center + (val / bound) * (chartSize / 2);

  const handleMouseEnter = (d: typeof data[0], event: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pathLabel = d.path > 0 ? 'out-to-in' : d.path < 0 ? 'in-to-out' : 'neutral';
    const faceLabel = d.face > 0 ? 'open' : d.face < 0 ? 'closed' : 'square';
    const shapeLabel = d.faceToPath < -2 ? 'draw' : d.faceToPath > 2 ? 'fade' : 'straight';

    setTooltip({
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      content: (
        <>
          <div className="tooltip-title">Shot {d.idx}</div>
          <div className="tooltip-row"><span>Club Path:</span> <strong>{d.path > 0 ? '+' : ''}{d.path.toFixed(1)}° ({pathLabel})</strong></div>
          <div className="tooltip-row"><span>Face Angle:</span> <strong>{d.face > 0 ? '+' : ''}{d.face.toFixed(1)}° ({faceLabel})</strong></div>
          <div className="tooltip-row"><span>Face to Path:</span> <strong>{d.faceToPath > 0 ? '+' : ''}{d.faceToPath.toFixed(1)}°</strong></div>
          <div className="tooltip-row"><span>Shot Shape:</span> <strong>{shapeLabel}</strong></div>
          {d.attackAngle !== undefined && (
            <div className="tooltip-row"><span>Attack Angle:</span> <strong>{d.attackAngle > 0 ? '+' : ''}{d.attackAngle.toFixed(1)}°</strong></div>
          )}
        </>
      )
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div className="visualization impact-chart">
      <h4>Impact Pattern</h4>
      <div className="chart-container">
        <svg ref={svgRef} viewBox={`0 0 ${size} ${size}`} className="chart-svg">
          {/* Background */}
          <rect x={padding} y={padding} width={chartSize} height={chartSize} fill="var(--gray-50)" rx="4" />

          {/* Grid */}
          <line x1={center} y1={padding} x2={center} y2={size - padding} stroke="var(--gray-300)" strokeWidth="1" />
          <line x1={padding} y1={center} x2={size - padding} y2={center} stroke="var(--gray-300)" strokeWidth="1" />

          {/* Quadrant labels */}
          <text x={padding + 8} y={padding + 16} fontSize="9" fill="var(--gray-400)">Pull</text>
          <text x={size - padding - 28} y={padding + 16} fontSize="9" fill="var(--gray-400)">Push</text>
          <text x={padding + 8} y={size - padding - 8} fontSize="9" fill="var(--gray-400)">Draw</text>
          <text x={size - padding - 28} y={size - padding - 8} fontSize="9" fill="var(--gray-400)">Fade</text>

          {/* Axis labels */}
          <text x={center} y={padding - 8} fontSize="10" fill="var(--gray-600)" textAnchor="middle">
            Open Face (+{bound}°)
          </text>
          <text x={center} y={size - padding + 16} fontSize="10" fill="var(--gray-600)" textAnchor="middle">
            Closed Face (-{bound}°)
          </text>
          <text x={padding - 4} y={center} fontSize="10" fill="var(--gray-600)" textAnchor="end" dominantBaseline="middle">
            In-Out
          </text>
          <text x={size - padding + 4} y={center} fontSize="10" fill="var(--gray-600)" textAnchor="start" dominantBaseline="middle">
            Out-In
          </text>

          {/* Median crosshair */}
          <line
            x1={scale(medianPath) - 8} y1={scale(-medianFace)}
            x2={scale(medianPath) + 8} y2={scale(-medianFace)}
            stroke="var(--green-500)" strokeWidth="2"
          />
          <line
            x1={scale(medianPath)} y1={scale(-medianFace) - 8}
            x2={scale(medianPath)} y2={scale(-medianFace) + 8}
            stroke="var(--green-500)" strokeWidth="2"
          />

          {/* Shot dots - X is path, Y is face (inverted so open is up) */}
          {data.map((d, i) => {
            const x = scale(d.path);
            const y = scale(-d.face); // Invert so open face is at top
            // Color based on face-to-path (determines curve)
            const color = Math.abs(d.faceToPath) < 2 ? 'var(--green-500)' :
                          d.faceToPath < 0 ? 'var(--red)' : 'var(--blue)';
            return (
              <circle
                key={i}
                className="data-point"
                cx={x} cy={y} r="5"
                fill={color}
                fillOpacity="0.6"
                stroke="white"
                strokeWidth="1"
                onMouseEnter={(e) => handleMouseEnter(d, e)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </svg>
        <Tooltip data={tooltip} />
      </div>
      <div className="viz-stats">
        <span>Med Path: <strong>{medianPath > 0 ? '+' : ''}{medianPath.toFixed(1)}°</strong></span>
        <span>Med Face: <strong>{medianFace > 0 ? '+' : ''}{medianFace.toFixed(1)}°</strong></span>
      </div>
    </div>
  );
}

// ============================================
// LAUNCH CHART - Launch angle and ball speed
// ============================================
export function LaunchChart({ strokes }: VisualizationProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data = strokes
    .map((s, idx) => {
      const m = getMeasurement(s);
      if (m?.LaunchAngle === undefined || m?.BallSpeed === undefined) return null;
      return {
        angle: m.LaunchAngle,
        speed: m.BallSpeed,
        spin: m.SpinRate,
        smash: m.SmashFactor,
        clubSpeed: m.ClubSpeed,
        idx: idx + 1
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (data.length < 2) {
    return <div className="viz-placeholder">Need 2+ shots with launch data</div>;
  }

  // Calculate bounds
  const angles = data.map(d => d.angle);
  const speeds = data.map(d => d.speed);
  const minAngle = Math.max(0, Math.min(...angles) - 2);
  const maxAngle = Math.max(...angles) + 2;
  const minSpeed = Math.min(...speeds) - 5;
  const maxSpeed = Math.max(...speeds) + 5;

  const medianAngle = calculateMedian(angles);
  const medianSpeed = calculateMedian(speeds);

  // SVG dimensions
  const width = 280;
  const height = 200;
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const scaleX = (angle: number) => padding.left + ((angle - minAngle) / (maxAngle - minAngle)) * chartWidth;
  const scaleY = (speed: number) => padding.top + chartHeight - ((speed - minSpeed) / (maxSpeed - minSpeed)) * chartHeight;

  const handleMouseEnter = (d: typeof data[0], event: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      content: (
        <>
          <div className="tooltip-title">Shot {d.idx}</div>
          <div className="tooltip-row"><span>Launch Angle:</span> <strong>{d.angle.toFixed(1)}°</strong></div>
          <div className="tooltip-row"><span>Ball Speed:</span> <strong>{d.speed.toFixed(1)} mph</strong></div>
          {d.clubSpeed !== undefined && (
            <div className="tooltip-row"><span>Club Speed:</span> <strong>{d.clubSpeed.toFixed(1)} mph</strong></div>
          )}
          {d.smash !== undefined && (
            <div className="tooltip-row"><span>Smash Factor:</span> <strong>{d.smash.toFixed(2)}</strong></div>
          )}
          {d.spin !== undefined && (
            <div className="tooltip-row"><span>Spin Rate:</span> <strong>{d.spin.toFixed(0)} rpm</strong></div>
          )}
        </>
      )
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div className="visualization launch-chart">
      <h4>Launch Conditions</h4>
      <div className="chart-container">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          {/* Background */}
          <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="var(--gray-50)" rx="4" />

          {/* Median lines */}
          <line
            x1={scaleX(medianAngle)} y1={padding.top}
            x2={scaleX(medianAngle)} y2={padding.top + chartHeight}
            stroke="var(--green-300)" strokeWidth="1" strokeDasharray="4,4"
          />
          <line
            x1={padding.left} y1={scaleY(medianSpeed)}
            x2={padding.left + chartWidth} y2={scaleY(medianSpeed)}
            stroke="var(--green-300)" strokeWidth="1" strokeDasharray="4,4"
          />

          {/* Axis labels */}
          <text x={width / 2} y={height - 4} fontSize="11" fill="var(--gray-600)" textAnchor="middle">
            Launch Angle (°)
          </text>
          <text
            x={12} y={height / 2}
            fontSize="11"
            fill="var(--gray-600)"
            textAnchor="middle"
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            Ball Speed (mph)
          </text>

          {/* X-axis ticks */}
          {[minAngle, (minAngle + maxAngle) / 2, maxAngle].map((val, i) => (
            <text key={i} x={scaleX(val)} y={height - padding.bottom + 16} fontSize="10" fill="var(--gray-500)" textAnchor="middle">
              {val.toFixed(0)}°
            </text>
          ))}

          {/* Y-axis ticks */}
          {[minSpeed, (minSpeed + maxSpeed) / 2, maxSpeed].map((val, i) => (
            <text key={i} x={padding.left - 8} y={scaleY(val) + 4} fontSize="10" fill="var(--gray-500)" textAnchor="end">
              {val.toFixed(0)}
            </text>
          ))}

          {/* Shot dots */}
          {data.map((d, i) => {
            const x = scaleX(d.angle);
            const y = scaleY(d.speed);
            // Color by spin if available
            let color = 'var(--green-500)';
            if (d.spin !== undefined) {
              color = d.spin < 2500 ? 'var(--blue)' : d.spin > 3500 ? 'var(--red)' : 'var(--green-500)';
            }
            return (
              <circle
                key={i}
                className="data-point"
                cx={x} cy={y} r="5"
                fill={color}
                fillOpacity="0.7"
                stroke="white"
                strokeWidth="1"
                onMouseEnter={(e) => handleMouseEnter(d, e)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* Median point highlight */}
          <circle
            cx={scaleX(medianAngle)} cy={scaleY(medianSpeed)} r="8"
            fill="none"
            stroke="var(--green-600)"
            strokeWidth="2"
          />
        </svg>
        <Tooltip data={tooltip} />
      </div>
      <div className="viz-stats">
        <span>Med Launch: <strong>{medianAngle.toFixed(1)}°</strong></span>
        <span>Med Speed: <strong>{medianSpeed.toFixed(1)} mph</strong></span>
      </div>
    </div>
  );
}

// ============================================
// TRAJECTORY SIDE VIEW - Visual flight path
// ============================================
export function TrajectoryChart({ strokes }: VisualizationProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data = strokes
    .map((s, idx) => {
      const m = getMeasurement(s);
      if (m?.Carry === undefined || m?.MaxHeight === undefined || m?.LaunchAngle === undefined) return null;
      return {
        carry: m.Carry,
        height: m.MaxHeight,
        launch: m.LaunchAngle,
        landing: m.LandingAngle ?? 40,
        hangTime: m.HangTime,
        total: m.Total,
        idx: idx + 1
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (data.length < 1) {
    return <div className="viz-placeholder">Need trajectory data</div>;
  }

  // Find max values for scaling
  const maxCarry = Math.max(...data.map(d => d.carry));
  const maxHeight = Math.max(...data.map(d => d.height));

  // SVG dimensions
  const width = 320;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const scaleX = (dist: number) => padding.left + (dist / (maxCarry * 1.1)) * chartWidth;
  const scaleY = (h: number) => padding.top + chartHeight - (h / (maxHeight * 1.2)) * chartHeight;

  // Generate parabolic path for each shot
  function generatePath(d: { carry: number; height: number }): string {
    const points: string[] = [];
    const steps = 30;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Parabolic approximation
      const x = t * d.carry;
      const h = 4 * d.height * t * (1 - t); // Parabola peaking at midpoint
      points.push(`${scaleX(x)},${scaleY(h)}`);
    }

    return `M ${points.join(' L ')}`;
  }

  // Calculate median trajectory
  const medianCarry = calculateMedian(data.map(d => d.carry));
  const medianHeight = calculateMedian(data.map(d => d.height));
  const medianPath = generatePath({ carry: medianCarry, height: medianHeight });

  const handleMouseEnter = (d: typeof data[0], event: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      content: (
        <>
          <div className="tooltip-title">Shot {d.idx}</div>
          <div className="tooltip-row"><span>Carry:</span> <strong>{d.carry.toFixed(1)} yds</strong></div>
          {d.total !== undefined && (
            <div className="tooltip-row"><span>Total:</span> <strong>{d.total.toFixed(1)} yds</strong></div>
          )}
          <div className="tooltip-row"><span>Max Height:</span> <strong>{d.height.toFixed(0)} yds</strong></div>
          <div className="tooltip-row"><span>Launch:</span> <strong>{d.launch.toFixed(1)}°</strong></div>
          <div className="tooltip-row"><span>Landing:</span> <strong>{d.landing.toFixed(1)}°</strong></div>
          {d.hangTime !== undefined && (
            <div className="tooltip-row"><span>Hang Time:</span> <strong>{d.hangTime.toFixed(1)}s</strong></div>
          )}
        </>
      )
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div className="visualization trajectory-chart">
      <h4>Ball Flight</h4>
      <div className="chart-container">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          {/* Ground */}
          <rect x={padding.left} y={scaleY(0)} width={chartWidth} height={2} fill="var(--green-600)" />

          {/* Grid lines */}
          <line x1={padding.left} y1={scaleY(maxHeight/2)} x2={width - padding.right} y2={scaleY(maxHeight/2)} stroke="var(--gray-200)" strokeDasharray="4,4" />

          {/* Height label */}
          <text x={padding.left - 8} y={scaleY(maxHeight) + 4} fontSize="10" fill="var(--gray-500)" textAnchor="end">
            {Math.round(maxHeight)}
          </text>
          <text x={padding.left - 8} y={scaleY(0) + 4} fontSize="10" fill="var(--gray-500)" textAnchor="end">
            0
          </text>

          {/* Distance labels */}
          <text x={scaleX(0)} y={height - 8} fontSize="10" fill="var(--gray-500)" textAnchor="middle">0</text>
          <text x={scaleX(maxCarry)} y={height - 8} fontSize="10" fill="var(--gray-500)" textAnchor="middle">{Math.round(maxCarry)}</text>

          {/* Axis label */}
          <text x={width / 2} y={height - 2} fontSize="10" fill="var(--gray-600)" textAnchor="middle">yards</text>

          {/* Individual trajectories */}
          {data.map((d, i) => (
            <path
              key={i}
              className="trajectory-path"
              d={generatePath(d)}
              fill="none"
              stroke="var(--green-400)"
              strokeWidth="2"
              strokeOpacity="0.5"
              onMouseEnter={(e) => handleMouseEnter(d, e)}
              onMouseLeave={handleMouseLeave}
            />
          ))}

          {/* Median trajectory */}
          <path
            d={medianPath}
            fill="none"
            stroke="var(--green-600)"
            strokeWidth="2.5"
            style={{ pointerEvents: 'none' }}
          />

          {/* Peak height marker */}
          <circle cx={scaleX(medianCarry / 2)} cy={scaleY(medianHeight)} r="4" fill="var(--green-600)" />
          <text x={scaleX(medianCarry / 2) + 8} y={scaleY(medianHeight) + 4} fontSize="10" fill="var(--green-700)">
            {Math.round(medianHeight)} yds
          </text>

          {/* Landing points - interactive */}
          {data.map((d, i) => (
            <circle
              key={`landing-${i}`}
              className="data-point"
              cx={scaleX(d.carry)}
              cy={scaleY(0)}
              r="4"
              fill="var(--green-500)"
              fillOpacity="0.7"
              stroke="white"
              strokeWidth="1"
              onMouseEnter={(e) => handleMouseEnter(d, e)}
              onMouseLeave={handleMouseLeave}
            />
          ))}
        </svg>
        <Tooltip data={tooltip} />
      </div>
      <div className="viz-stats">
        <span>Med Apex: <strong>{medianHeight.toFixed(0)} yds</strong></span>
        <span>Med Carry: <strong>{medianCarry.toFixed(0)} yds</strong></span>
      </div>
    </div>
  );
}

// ============================================
// MOMENTUM CHART - Cumulative score relative to par
// ============================================
interface MomentumChartProps {
  holes: Array<{
    holeNumber: number;
    par: number;
    grossScore: number;
  }>;
}

export function MomentumChart({ holes }: MomentumChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (holes.length < 2) {
    return <div className="viz-placeholder">Need at least 2 holes for momentum chart</div>;
  }

  // Calculate cumulative score relative to par for each hole
  const data = holes.map((hole, idx) => {
    const cumulativeScore = holes.slice(0, idx + 1).reduce((sum, h) => sum + h.grossScore, 0);
    const cumulativePar = holes.slice(0, idx + 1).reduce((sum, h) => sum + h.par, 0);
    const relativeToPar = cumulativeScore - cumulativePar;
    const holeDiff = hole.grossScore - hole.par;
    return {
      holeNumber: hole.holeNumber,
      relativeToPar,
      holeDiff,
      score: hole.grossScore,
      par: hole.par,
    };
  });

  // SVG dimensions
  const width = 600;
  const height = 200;
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate bounds - ensure 0 (par) is always visible and centered if possible
  const minRelative = Math.min(...data.map(d => d.relativeToPar), 0);
  const maxRelative = Math.max(...data.map(d => d.relativeToPar), 0);
  const range = Math.max(Math.abs(minRelative), Math.abs(maxRelative), 3);
  const yMin = -range - 1;
  const yMax = range + 1;

  // Scale functions
  const scaleX = (holeNum: number) => padding.left + ((holeNum - 1) / (holes.length - 1)) * chartWidth;
  const scaleY = (val: number) => padding.top + ((yMax - val) / (yMax - yMin)) * chartHeight;

  // Generate line path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.holeNumber)},${scaleY(d.relativeToPar)}`)
    .join(' ');

  // Generate area fill path (from line to par line)
  const areaPath = `${linePath} L ${scaleX(data[data.length - 1].holeNumber)},${scaleY(0)} L ${scaleX(data[0].holeNumber)},${scaleY(0)} Z`;

  // Y-axis tick values
  const yTicks: number[] = [];
  for (let i = Math.ceil(yMin); i <= Math.floor(yMax); i++) {
    if (i % 2 === 0 || Math.abs(yMax - yMin) <= 6) {
      yTicks.push(i);
    }
  }

  const handleMouseEnter = (d: typeof data[0], event: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const diffLabel = d.holeDiff === 0 ? 'Par' :
                      d.holeDiff === -1 ? 'Birdie' :
                      d.holeDiff === -2 ? 'Eagle' :
                      d.holeDiff === 1 ? 'Bogey' :
                      d.holeDiff === 2 ? 'Double' :
                      d.holeDiff < -2 ? `${Math.abs(d.holeDiff)} under` : `+${d.holeDiff}`;

    const overallLabel = d.relativeToPar === 0 ? 'Even' :
                         d.relativeToPar > 0 ? `+${d.relativeToPar}` : `${d.relativeToPar}`;

    setTooltip({
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      content: (
        <>
          <div className="tooltip-title">Hole {d.holeNumber}</div>
          <div className="tooltip-row"><span>Score:</span> <strong>{d.score} (Par {d.par})</strong></div>
          <div className="tooltip-row"><span>This Hole:</span> <strong>{diffLabel}</strong></div>
          <div className="tooltip-row"><span>Overall:</span> <strong>{overallLabel}</strong></div>
        </>
      )
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  // Final score display
  const finalRelative = data[data.length - 1].relativeToPar;
  const finalLabel = finalRelative === 0 ? 'Even' : finalRelative > 0 ? `+${finalRelative}` : `${finalRelative}`;

  return (
    <div className="visualization momentum-chart">
      <h4>Round Momentum</h4>
      <div className="chart-container momentum-container">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="chart-svg momentum-svg">
          {/* Background */}
          <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="var(--gray-50)" rx="4" />

          {/* Under par zone (green tint) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={scaleY(0) - padding.top}
            fill="var(--green-50)"
            opacity="0.5"
          />

          {/* Over par zone (red tint) */}
          <rect
            x={padding.left}
            y={scaleY(0)}
            width={chartWidth}
            height={padding.top + chartHeight - scaleY(0)}
            fill="var(--red-light)"
            opacity="0.3"
          />

          {/* Grid lines */}
          {yTicks.map(val => (
            <line
              key={val}
              x1={padding.left}
              y1={scaleY(val)}
              x2={padding.left + chartWidth}
              y2={scaleY(val)}
              stroke={val === 0 ? 'var(--gray-400)' : 'var(--gray-200)'}
              strokeWidth={val === 0 ? 2 : 1}
              strokeDasharray={val === 0 ? undefined : '4,4'}
            />
          ))}

          {/* Hole markers on x-axis */}
          {data.map((d, i) => {
            // Show every hole for 9 holes, every other for 18
            if (holes.length <= 9 || i % 2 === 0 || i === holes.length - 1) {
              return (
                <text
                  key={d.holeNumber}
                  x={scaleX(d.holeNumber)}
                  y={height - padding.bottom + 16}
                  fontSize="10"
                  fill="var(--gray-500)"
                  textAnchor="middle"
                >
                  {d.holeNumber}
                </text>
              );
            }
            return null;
          })}

          {/* Y-axis labels */}
          {yTicks.map(val => (
            <text
              key={val}
              x={padding.left - 8}
              y={scaleY(val) + 4}
              fontSize="10"
              fill={val === 0 ? 'var(--gray-600)' : 'var(--gray-500)'}
              textAnchor="end"
              fontWeight={val === 0 ? '600' : '400'}
            >
              {val === 0 ? 'E' : val > 0 ? `+${val}` : val}
            </text>
          ))}

          {/* Axis labels */}
          <text x={width / 2} y={height - 4} fontSize="11" fill="var(--gray-600)" textAnchor="middle">
            Hole
          </text>
          <text
            x={12}
            y={height / 2}
            fontSize="11"
            fill="var(--gray-600)"
            textAnchor="middle"
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            Score vs Par
          </text>

          {/* Area fill */}
          <path
            d={areaPath}
            fill={finalRelative <= 0 ? 'var(--green-200)' : 'var(--red-light)'}
            opacity="0.4"
          />

          {/* Line path */}
          <path
            d={linePath}
            fill="none"
            stroke={finalRelative <= 0 ? 'var(--green-600)' : 'var(--red)'}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {data.map((d) => {
            const x = scaleX(d.holeNumber);
            const y = scaleY(d.relativeToPar);
            const color = d.holeDiff < 0 ? 'var(--green-500)' :
                          d.holeDiff === 0 ? 'var(--gray-400)' :
                          d.holeDiff === 1 ? 'var(--yellow-500)' : 'var(--red)';
            return (
              <g
                key={d.holeNumber}
                className="data-point"
                onMouseEnter={(e) => handleMouseEnter(d, e)}
                onMouseLeave={handleMouseLeave}
              >
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {/* Final score annotation */}
          <text
            x={scaleX(data[data.length - 1].holeNumber) + 12}
            y={scaleY(finalRelative) + 4}
            fontSize="12"
            fill={finalRelative <= 0 ? 'var(--green-700)' : 'var(--red)'}
            fontWeight="600"
          >
            {finalLabel}
          </text>
        </svg>
        <Tooltip data={tooltip} />
      </div>
      <div className="viz-legend momentum-legend">
        <span className="legend-item"><span className="dot birdie-dot"></span> Birdie+</span>
        <span className="legend-item"><span className="dot par-dot"></span> Par</span>
        <span className="legend-item"><span className="dot bogey-dot"></span> Bogey</span>
        <span className="legend-item"><span className="dot double-dot"></span> Double+</span>
      </div>
    </div>
  );
}

// ============================================
// COMBINED VISUALIZATION PANEL
// ============================================
export function ShotVisualizationPanel({ strokes }: VisualizationProps) {
  if (strokes.length < 2) {
    return null;
  }

  return (
    <div className="shot-visualizations">
      <div className="viz-grid">
        <DispersionChart strokes={strokes} />
        <ImpactChart strokes={strokes} />
        <LaunchChart strokes={strokes} />
        <TrajectoryChart strokes={strokes} />
      </div>
    </div>
  );
}
