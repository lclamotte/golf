// Injected into page context to intercept fetch responses

(function() {
  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);

    // Check if this is the account/me endpoint
    const url = args[0]?.url || args[0];
    if (typeof url === 'string' && url.includes('/api/account/me')) {
      try {
        const clone = response.clone();
        const data = await clone.json();

        if (data.accessToken) {
          window.postMessage({
            type: 'TRACKMAN_TOKEN',
            token: `Bearer ${data.accessToken}`,
          }, '*');
          console.log('[Trackman Sync] Token captured from fetch response');
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return response;
  };

  // Also intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      if (this._url && this._url.includes('/api/account/me')) {
        try {
          const data = JSON.parse(this.responseText);
          if (data.accessToken) {
            window.postMessage({
              type: 'TRACKMAN_TOKEN',
              token: `Bearer ${data.accessToken}`,
            }, '*');
            console.log('[Trackman Sync] Token captured from XHR response');
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    return originalXHRSend.apply(this, args);
  };

  console.log('[Trackman Sync] Fetch interceptor installed');
})();
