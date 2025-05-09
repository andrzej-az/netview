// src/hooks/use-settings.ts
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppSettings } from '@/types/settings';
import { DEFAULT_PORTS, DEFAULT_PORTS_STRING } from '@/types/settings';

const SETTINGS_STORAGE_KEY = 'netview-app-settings';

export function useSettings() {
  const [customPortsString, setCustomPortsStringState] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings: AppSettings = JSON.parse(storedSettings);
        setCustomPortsStringState(parsedSettings.customPorts || '');
      } else {
        // Set initial default if nothing is stored.
        // This avoids an empty string if user has never saved.
        setCustomPortsStringState(DEFAULT_PORTS_STRING);
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      setCustomPortsStringState(DEFAULT_PORTS_STRING); // Fallback to default on error
    }
    setIsLoaded(true);
  }, []);

  const setCustomPortsString = useCallback((ports: string) => {
    setCustomPortsStringState(ports);
    try {
      const newSettings: AppSettings = { customPorts: ports };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, []);

  const parsedCustomPorts = useMemo(() => {
    if (!customPortsString) return [];
    return customPortsString
      .split(',')
      .map((s) => s.trim())
      .filter(s => s !== '')
      .map((s) => parseInt(s, 10))
      .filter((p) => !isNaN(p) && p > 0 && p <= 65535);
  }, [customPortsString]);

  const effectivePorts = useMemo(() => {
    return parsedCustomPorts.length > 0 ? parsedCustomPorts : DEFAULT_PORTS;
  }, [parsedCustomPorts]);

  return {
    isLoaded,
    customPortsString,
    setCustomPortsString,
    parsedCustomPorts, // Ports explicitly set by user (parsed, can be empty)
    defaultPortsArray: DEFAULT_PORTS, // Default ports array
    effectivePorts, // Ports to actually use for scanning (user's or defaults)
  };
}
