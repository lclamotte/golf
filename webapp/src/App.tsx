import { useState } from 'react';
import { useTrackmanAuth } from './hooks/useTrackmanAuth';
import { AuthStatus } from './components/AuthStatus';
import { SessionList } from './components/SessionList';
import { ShotChart } from './components/ShotChart';
import type { Activity } from './api/trackman';
import './App.css';

function App() {
  const auth = useTrackmanAuth();
  const [selectedSession, setSelectedSession] = useState<Activity | null>(null);

  return (
    <div className="app">
      <header>
        <h1>Golf Data Viz</h1>
        <AuthStatus auth={auth} />
      </header>

      <main>
        {auth.token ? (
          <div className="content-layout">
            <aside className="sidebar">
              <SessionList
                onSelectSession={setSelectedSession}
                selectedSessionId={selectedSession?.id}
              />
            </aside>
            <section className="main-content">
              {selectedSession ? (
                <ShotChart session={selectedSession} />
              ) : (
                <div className="empty-state">
                  <p>Select a practice session to view shot data</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="setup-instructions">
            <h2>Getting Started</h2>
            <ol>
              <li>
                <strong>Install the extension</strong>
                <p>
                  Load the <code>extension/</code> folder as an unpacked extension in Chrome:
                </p>
                <ul>
                  <li>Go to <code>chrome://extensions</code></li>
                  <li>Enable "Developer mode"</li>
                  <li>Click "Load unpacked" and select the extension folder</li>
                </ul>
              </li>
              <li>
                <strong>Copy the Extension ID</strong>
                <p>
                  After loading, copy the extension ID and add it to your <code>.env</code> file:
                </p>
                <pre>VITE_EXTENSION_ID=your-extension-id-here</pre>
              </li>
              <li>
                <strong>Log in to Trackman</strong>
                <p>
                  Visit{' '}
                  <a
                    href="https://portal.trackmangolf.com/player/activities"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    portal.trackmangolf.com
                  </a>{' '}
                  and log in. The extension will automatically capture your auth token.
                </p>
              </li>
              <li>
                <strong>Refresh this page</strong>
                <p>Come back here and your data will be ready!</p>
              </li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
