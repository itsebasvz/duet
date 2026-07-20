import { useState, useEffect } from 'react';
import { version } from '../../package.json';
import { ReleaseInfo } from '../types/sharedTypes';

export type InstallMode = 'git' | 'npm';

// duet is a fork; it does NOT track upstream (siteboon/claudecodeui) releases.
// The remote release check is intentionally disabled so no "update to upstream"
// path can ever surface. Only the local /health restart hint remains.
export const useVersionCheck = (_owner?: string, _repo?: string) => {
  const updateAvailable = false;
  const latestVersion: string | null = null;
  const releaseInfo: ReleaseInfo | null = null;
  const [installMode, setInstallMode] = useState<InstallMode>('git');
  const [runningVersion, setRunningVersion] = useState<string | null>(null);
  const [restartRequired, setRestartRequired] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/health');
        const data = await response.json();
        if (data.installMode === 'npm' || data.installMode === 'git') {
          setInstallMode(data.installMode);
        }
        // `data.version` is the version the server process is actually running.
        // This module's `version` is baked into the frontend bundle at build
        // time, so it reflects the installed (on-disk) package. If they differ,
        // the package was updated but the server process was not restarted, and
        // DB-backed actions may silently fail until it is.
        if (typeof data.version === 'string' && data.version.length > 0) {
          setRunningVersion(data.version);
          setRestartRequired(data.version !== version);
        }
      } catch {
        // Default to git / no restart hint on error
      }
    };
    fetchHealth();
  }, []);

  return { updateAvailable, latestVersion, currentVersion: version, releaseInfo, installMode, runningVersion, restartRequired };
};