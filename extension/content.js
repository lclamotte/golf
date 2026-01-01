// Content script - injects interceptor into page context

const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the injected script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'TRACKMAN_TOKEN') {
    chrome.runtime.sendMessage({
      type: 'TOKEN_CAPTURED',
      token: event.data.token,
      capturedAt: Date.now(),
    });
    console.log('[Trackman Sync] Token forwarded to background');
  }
});

console.log('[Trackman Sync] Content script loaded');
