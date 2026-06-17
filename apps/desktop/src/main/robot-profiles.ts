import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from './paths';
import type { RobotProfile } from '../shared/types';

const PROFILES_FILE = 'robots.json';

function profilesPath(): string {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, PROFILES_FILE);
}

export function loadRobotProfiles(): RobotProfile[] {
  const path = profilesPath();
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as RobotProfile[];
  } catch {
    return [];
  }
}

export function saveRobotProfiles(profiles: RobotProfile[]): RobotProfile[] {
  writeFileSync(profilesPath(), JSON.stringify(profiles, null, 2), 'utf8');
  return profiles;
}

export function upsertRobotProfile(profile: RobotProfile): RobotProfile[] {
  const profiles = loadRobotProfiles();
  const index = profiles.findIndex((p) => p.id === profile.id);
  const next = { ...profile, lastConnected: new Date().toISOString() };
  if (index >= 0) profiles[index] = next;
  else profiles.push(next);
  return saveRobotProfiles(profiles);
}

export function deleteRobotProfile(id: string): RobotProfile[] {
  return saveRobotProfiles(loadRobotProfiles().filter((p) => p.id !== id));
}
