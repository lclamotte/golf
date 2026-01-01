import { useState, useEffect } from 'react';
import { trackmanApi, type Activity } from '../api/trackman';

interface SessionListProps {
  onSelectSession: (session: Activity) => void;
  selectedSessionId?: string;
}

// Activity type icons with green/yellow theme
function ActivityIcon({ kind, isSelected }: { kind: string; isSelected: boolean }) {
  const primaryColor = isSelected ? 'var(--green-700)' : 'var(--green-600)';
  const accentColor = 'var(--yellow-500)';

  switch (kind) {
    case 'COURSE_PLAY':
      // Golf flag on green
      return (
        <svg className="activity-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="18" r="4" fill={primaryColor} opacity="0.2" />
          <path d="M12 4v14" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 4l7 4-7 4V4z" fill={accentColor} stroke={primaryColor} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'SHOT_ANALYSIS':
      // Target/crosshair
      return (
        <svg className="activity-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke={primaryColor} strokeWidth="2" opacity="0.3" />
          <circle cx="12" cy="12" r="4" stroke={primaryColor} strokeWidth="2" />
          <circle cx="12" cy="12" r="1.5" fill={accentColor} />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'RANGE_PRACTICE':
      // Golf ball on tee with arc
      return (
        <svg className="activity-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 20c4-8 12-12 16-12" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" opacity="0.4" />
          <circle cx="6" cy="16" r="3" fill={accentColor} stroke={primaryColor} strokeWidth="1.5" />
          <path d="M6 19v3" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'VIRTUAL_RANGE':
      // Screen with ball trajectory
      return (
        <svg className="activity-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="13" rx="2" stroke={primaryColor} strokeWidth="2" fill={primaryColor} fillOpacity="0.1" />
          <path d="M7 13c2-4 6-5 10-5" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
          <circle cx="7" cy="13" r="1.5" fill={accentColor} />
          <path d="M8 20h8" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'SESSION':
    default:
      // Generic practice - golf club
      return (
        <svg className="activity-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M6 20l3-16" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="9" cy="4" rx="3" ry="2" fill={accentColor} stroke={primaryColor} strokeWidth="1.5" />
          <path d="M4 20h6" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
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

function getShotCount(activity: Activity): number | null {
  return activity.strokeCount ?? activity.numberOfStrokes ?? null;
}

export function SessionList({ onSelectSession, selectedSessionId }: SessionListProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivities() {
      try {
        setLoading(true);
        setError(null);
        const response = await trackmanApi.getActivities({ take: 50 });
        setActivities(response.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activities');
        console.error('Failed to load activities:', err);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, []);

  if (loading) {
    return <div className="session-list loading">Loading sessions...</div>;
  }

  if (error) {
    return (
      <div className="session-list error">
        <p>Error: {error}</p>
        <p className="error-hint">
          Check the browser console for details.
        </p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="session-list empty">
        <p>No practice sessions found.</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      <h2>Activities</h2>
      <ul>
        {activities.map((activity) => {
          const isSelected = selectedSessionId === activity.id;
          return (
            <li
              key={activity.id}
              className={`session-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSession(activity)}
            >
              <ActivityIcon kind={activity.kind} isSelected={isSelected} />
              <div className="session-content">
                <div className="session-name">{getActivityLabel(activity)}</div>
                <div className="session-meta">
                  <span className="session-date">
                    {new Date(activity.time).toLocaleDateString()}
                  </span>
                  {getShotCount(activity) !== null && (
                    <span className="session-shots">{getShotCount(activity)} shots</span>
                  )}
                  {activity.grossScore !== undefined && (
                    <span className="session-score">Score: {activity.grossScore}</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
