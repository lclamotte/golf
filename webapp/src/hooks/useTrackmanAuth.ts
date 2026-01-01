import { useState, useEffect, useCallback } from 'react';
import type { TrackmanAuthState } from '../types/trackman';

// Extension ID - update this after loading the extension in Chrome
// You can find it in chrome://extensions or in the extension popup
const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID || '';

interface ExtensionResponse {
  success: boolean;
  token?: string;
  capturedAt?: number;
  error?: string;
  extensionId?: string;
}

export function useTrackmanAuth(): TrackmanAuthState & {
  refresh: () => void;
  extensionId: string;
} {
  const [state, setState] = useState<TrackmanAuthState>({
    token: null,
    isLoading: true,
    error: null,
    isExtensionInstalled: false,
    capturedAt: null,
  });

  const checkExtension = useCallback(async () => {
    if (!EXTENSION_ID) {
      setState({
        token: null,
        isLoading: false,
        error: 'Extension ID not configured. Set VITE_EXTENSION_ID in .env',
        isExtensionInstalled: false,
        capturedAt: null,
      });
      return;
    }

    // Check if chrome.runtime is available
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setState({
        token: null,
        isLoading: false,
        error: 'Chrome extension API not available. Are you using Chrome?',
        isExtensionInstalled: false,
        capturedAt: null,
      });
      return;
    }

    try {
      // First, ping the extension to check if it's installed
      const pingResponse = await new Promise<ExtensionResponse | undefined>(
        (resolve) => {
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { type: 'PING' },
            (response: ExtensionResponse | undefined) => {
              if (chrome.runtime.lastError) {
                resolve(undefined);
              } else {
                resolve(response);
              }
            }
          );
        }
      );

      if (!pingResponse?.success) {
        setState({
          token: null,
          isLoading: false,
          error: 'Extension not installed. Please install the Trackman Data Sync extension.',
          isExtensionInstalled: false,
          capturedAt: null,
        });
        return;
      }

      // Extension is installed, now get the token
      const tokenResponse = await new Promise<ExtensionResponse | undefined>(
        (resolve) => {
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { type: 'GET_TOKEN' },
            (response: ExtensionResponse | undefined) => {
              if (chrome.runtime.lastError) {
                resolve(undefined);
              } else {
                resolve(response);
              }
            }
          );
        }
      );

      if (tokenResponse?.success && tokenResponse.token) {
        setState({
          token: tokenResponse.token,
          isLoading: false,
          error: null,
          isExtensionInstalled: true,
          capturedAt: tokenResponse.capturedAt || null,
        });
      } else {
        setState({
          token: null,
          isLoading: false,
          error: tokenResponse?.error || 'No token available. Please log in to Trackman portal.',
          isExtensionInstalled: true,
          capturedAt: null,
        });
      }
    } catch (err) {
      setState({
        token: null,
        isLoading: false,
        error: `Failed to communicate with extension: ${err}`,
        isExtensionInstalled: false,
        capturedAt: null,
      });
    }
  }, []);

  useEffect(() => {
    checkExtension();
  }, [checkExtension]);

  return {
    ...state,
    refresh: checkExtension,
    extensionId: EXTENSION_ID,
  };
}
