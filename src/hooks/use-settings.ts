// src/hooks/use-settings.ts
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppSettings } from '@/types/settings';
import { 
  DEFAULT_PORTS, 
  DEFAULT_PORTS_STRING, 
  DEFAULT_SEARCH_HIDDEN_HOSTS, 
  DEFAULT_HIDDEN_HOSTS_PORTS_STRING 
} from '@/types/settings';

const SETTINGS_STORAGE_KEY = 'netview-app-settings';

export function useSettings() {
  const [customPortsString, setCustomPortsStringState] = useState<string>('');
  const [searchHiddenHosts, setSearchHiddenHostsState] = useState<boolean>(DEFAULT_SEARCH_HIDDEN_HOSTS);
  const [hiddenHostsPortsString, setHiddenHostsPortsStringState] = useState<string>(DEFAULT_HIDDEN_HOSTS_PORTS_STRING);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings: AppSettings = JSON.parse(storedSettings);
        setCustomPortsStringState(parsedSettings.customPorts ?? DEFAULT_PORTS_STRING);
        setSearchHiddenHostsState(parsedSettings.searchHiddenHosts ?? DEFAULT_SEARCH_HIDDEN_HOSTS);
        setHiddenHostsPortsStringState(parsedSettings.hiddenHostsPorts ?? DEFAULT_HIDDEN_HOSTS_PORTS_STRING);
      } else {
        // Set initial defaults if nothing is stored.
        setCustomPortsStringState(DEFAULT_PORTS_STRING);
        setSearchHiddenHostsState(DEFAULT_SEARCH_HIDDEN_HOSTS);
        setHiddenHostsPortsStringState(DEFAULT_HIDDEN_HOSTS_PORTS_STRING);
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      // Fallback to defaults on error
      setCustomPortsStringState(DEFAULT_PORTS_STRING);
      setSearchHiddenHostsState(DEFAULT_SEARCH_HIDDEN_HOSTS);
      setHiddenHostsPortsStringState(DEFAULT_HIDDEN_HOSTS_PORTS_STRING);
    }
    setIsLoaded(true);
  }, []);

  const saveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    try {
      // Merge with current state before saving to ensure all keys are present
      const currentSettings: AppSettings = {
        customPorts: customPortsString,
        searchHiddenHosts: searchHiddenHosts,
        hiddenHostsPorts: hiddenHostsPortsString,
        ...newSettings, // Overwrite with new values
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [customPortsString, searchHiddenHosts, hiddenHostsPortsString]);


  const setCustomPortsString = useCallback((ports: string) => {
    setCustomPortsStringState(ports);
    saveSettings({ customPorts: ports });
  }, [saveSettings]);

  const setSearchHiddenHosts = useCallback((enabled: boolean) => {
    setSearchHiddenHostsState(enabled);
    saveSettings({ searchHiddenHosts: enabled });
  }, [saveSettings]);

  const setHiddenHostsPortsString = useCallback((ports: string) => {
    setHiddenHostsPortsStringState(ports);
    saveSettings({ hiddenHostsPorts: ports });
  }, [saveSettings]);


  const parsedCustomPorts = useMemo(() => {
    if (!customPortsString) return []; // Return empty array if string is empty
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

  const parsedHiddenHostsPorts = useMemo(() => {
    if (!hiddenHostsPortsString) return []; // Return empty array if string is empty
    return hiddenHostsPortsString
      .split(',')
      .map((s) => s.trim())
      .filter(s => s !== '')
      .map((s) => parseInt(s, 10))
      .filter((p) => !isNaN(p) && p > 0 && p <= 65535);
  }, [hiddenHostsPortsString]);

  return {
    isLoaded,
    customPortsString,
    setCustomPortsString,
    parsedCustomPorts,
    defaultPortsArray: DEFAULT_PORTS,
    effectivePorts,
    searchHiddenHosts,
    setSearchHiddenHosts,
    hiddenHostsPortsString,
    setHiddenHostsPortsString,
    parsedHiddenHostsPorts,
  };
}
