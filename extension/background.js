// Trackman Data Sync - Background Service Worker
// Receives token from content script and stores it
// Proxies API requests from webapp to avoid CORS

const TRACKMAN_GRAPHQL_API = 'https://api.trackmangolf.com/graphql';
const TRACKMAN_REPORTS_API = 'https://golf-player-activities.trackmangolf.com/api/reports';

// Handle messages from webapp
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === 'GET_TOKEN') {
      chrome.storage.local.get(['trackmanAuth'], (result) => {
        if (result.trackmanAuth) {
          sendResponse({
            success: true,
            token: result.trackmanAuth.token,
            capturedAt: result.trackmanAuth.capturedAt,
          });
        } else {
          sendResponse({
            success: false,
            error: 'No token available. Please log in to Trackman portal.',
          });
        }
      });
      return true;
    }

    if (request.type === 'PING') {
      sendResponse({ success: true, extensionId: chrome.runtime.id });
      return true;
    }

    // Proxy activity report requests (no auth needed)
    if (request.type === 'ACTIVITY_REPORT_REQUEST') {
      (async () => {
        try {
          const response = await fetch(`${TRACKMAN_REPORTS_API}/getactivityreport`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ActivityId: request.activityId,
              Altitude: request.altitude || 0,
              Temperature: request.temperature || 25,
              BallType: request.ballType || 'Premium',
            }),
          });

          if (!response.ok) {
            sendResponse({
              success: false,
              error: `API error: ${response.status}`,
              status: response.status
            });
            return;
          }

          const data = await response.json();
          sendResponse({ success: true, data });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    // Proxy GraphQL requests to Trackman
    if (request.type === 'GRAPHQL_REQUEST') {
      chrome.storage.local.get(['trackmanAuth'], async (result) => {
        if (!result.trackmanAuth?.token) {
          sendResponse({ success: false, error: 'No token available' });
          return;
        }

        try {
          const response = await fetch(TRACKMAN_GRAPHQL_API, {
            method: 'POST',
            headers: {
              'Authorization': result.trackmanAuth.token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: request.query,
              variables: request.variables,
            }),
          });

          if (!response.ok) {
            sendResponse({
              success: false,
              error: `API error: ${response.status}`,
              status: response.status
            });
            return;
          }

          const data = await response.json();
          if (data.errors) {
            sendResponse({ success: false, error: data.errors[0]?.message || 'GraphQL error' });
            return;
          }
          sendResponse({ success: true, data: data.data });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      });
      return true;
    }
  }
);

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TOKEN_CAPTURED') {
    const tokenData = {
      token: request.token,
      capturedAt: request.capturedAt,
    };
    chrome.storage.local.set({ trackmanAuth: tokenData }, () => {
      console.log('[Trackman Sync] Token stored from content script');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'GET_STATUS') {
    chrome.storage.local.get(['trackmanAuth'], (result) => {
      if (result.trackmanAuth) {
        sendResponse({
          connected: true,
          capturedAt: result.trackmanAuth.capturedAt,
        });
      } else {
        sendResponse({ connected: false });
      }
    });
    return true;
  }

  if (request.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove(['trackmanAuth'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

console.log('[Trackman Sync] Service worker initialized');
