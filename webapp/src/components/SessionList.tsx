import { useState, useEffect } from 'react';
import { trackmanApi, type Activity } from '../api/trackman';

interface SessionListProps {
  onSelectSession: (session: Activity) => void;
  selectedSessionId?: string;
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
        {activities.map((activity) => (
          <li
            key={activity.id}
            className={`session-item ${selectedSessionId === activity.id ? 'selected' : ''}`}
            onClick={() => onSelectSession(activity)}
          >
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
          </li>
        ))}
      </ul>
    </div>
  );
}
