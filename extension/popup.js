// Trackman Data Sync - Popup Script

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function updateUI(status) {
  const statusEl = document.getElementById('status');
  const statusTextEl = statusEl.querySelector('.status-text > div:first-child');
  const statusTimeEl = document.getElementById('status-time');
  const clearBtn = document.getElementById('clear-btn');

  if (status.connected) {
    statusEl.className = 'status connected';
    statusTextEl.textContent = 'Token captured';
    statusTimeEl.textContent = formatTimeAgo(status.capturedAt);
    clearBtn.style.display = 'block';
  } else {
    statusEl.className = 'status disconnected';
    statusTextEl.textContent = 'No token yet';
    statusTimeEl.textContent = 'Log in to Trackman to capture';
    clearBtn.style.display = 'none';
  }
}

// Get current status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  updateUI(response || { connected: false });
});

// Show extension ID
document.getElementById('ext-id').textContent = chrome.runtime.id;

// Clear token button
document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_TOKEN' }, () => {
    updateUI({ connected: false });
  });
});
