import { app } from 'electron';
import path from 'path';
import os from 'os';

export interface AppPaths {
  workdir: string;
  skillsDir: string;
  docsDir: string;
  readmePath: string;
  legacyConfigPath: string;
  legacyBinPath: string;
  legacyLaunchAgentPath: string;
}

export function buildPaths(companyName: string): AppPaths {
  const home = os.homedir();
  const workdir = path.join(home, companyName);
  return {
    workdir,
    skillsDir: path.join(workdir, 'skills'),
    docsDir: path.join(workdir, 'docs'),
    readmePath: path.join(workdir, 'README.md'),
    legacyConfigPath: path.join(home, '.config', 'future-hub', 'config.json'),
    legacyBinPath: path.join(home, '.local', 'bin', 'fh'),
    legacyLaunchAgentPath: path.join(home, 'Library', 'LaunchAgents', 'pl.smallhost.futurehub.sync.plist'),
  };
}

export function getAppDataPath(): string {
  return app.getPath('userData');
}
