import type { TrackmanAuthState } from '../types/trackman';

interface AuthStatusProps {
  auth: TrackmanAuthState & { refresh: () => void; extensionId: string };
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function AuthStatus({ auth }: AuthStatusProps) {
  if (auth.isLoading) {
    return (
      <div className="auth-status loading">
        <div className="status-indicator" />
        <span>Connecting to extension...</span>
      </div>
    );
  }

  if (!auth.isExtensionInstalled) {
    return (
      <div className="auth-status error">
        <div className="status-indicator" />
        <div className="status-content">
          <span>Extension not installed</span>
          <p className="status-help">
            Install the Trackman Data Sync extension to continue.
          </p>
          {auth.extensionId && (
            <p className="status-detail">
              Expected extension ID: <code>{auth.extensionId}</code>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!auth.token) {
    return (
      <div className="auth-status warning">
        <div className="status-indicator" />
        <div className="status-content">
          <span>No token available</span>
          <p className="status-help">
            <a
              href="https://portal.trackmangolf.com/player/activities"
              target="_blank"
              rel="noopener noreferrer"
            >
              Log in to Trackman Portal
            </a>{' '}
            to capture your auth token.
          </p>
          <button onClick={auth.refresh} className="refresh-btn">
            Check again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-status connected">
      <div className="status-indicator" />
      <div className="status-content">
        <span>Connected to Trackman</span>
        {auth.capturedAt && (
          <p className="status-time">Token captured {formatTimeAgo(auth.capturedAt)}</p>
        )}
        <button onClick={auth.refresh} className="refresh-btn">
          Refresh
        </button>
      </div>
    </div>
  );
}
