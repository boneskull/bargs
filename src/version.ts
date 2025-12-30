import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Package info extracted from package.json for epilog generation.
 */
export interface PackageInfo {
  homepage?: string;
  repository?: string;
}

/**
 * Raw package.json structure (partial). Represents the file as-is before
 * normalization.
 */
interface RawPackageJson {
  homepage?: string;
  repository?: RepositoryField | string;
  version?: string;
}

/**
 * Raw repository field from package.json (can be string or object).
 */
interface RepositoryField {
  type?: string;
  url?: string;
}

/**
 * Normalize a repository URL to clean HTTPS format. Strips leading `git+` and
 * trailing `.git`.
 */
const normalizeRepoUrl = (url: string): string => {
  return url.replace(/^git\+/, '').replace(/\.git$/, '');
};

/**
 * Validate that a URL is HTTPS. Returns the URL if valid, undefined otherwise.
 */
const validateHttpsUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  return url.startsWith('https://') ? url : undefined;
};

/**
 * Extract repository URL from package.json repository field. Handles both
 * string and object forms.
 */
const extractRepoUrl = (
  repository: RepositoryField | string | undefined,
): string | undefined => {
  if (!repository) {
    return undefined;
  }

  const rawUrl = typeof repository === 'string' ? repository : repository.url;
  if (!rawUrl) {
    return undefined;
  }

  const normalized = normalizeRepoUrl(rawUrl);
  return validateHttpsUrl(normalized);
};

/**
 * Find package.json by walking up from startDir (async).
 */
const findPackageJson = async (
  startDir: string,
): Promise<string | undefined> => {
  let dir = startDir;
  let prevDir = '';

  while (dir !== prevDir) {
    const pkgPath = join(dir, 'package.json');
    try {
      await readFile(pkgPath, 'utf-8');
      return pkgPath;
    } catch {
      prevDir = dir;
      dir = dirname(dir);
    }
  }

  return undefined;
};

/**
 * Find package.json by walking up from startDir (sync).
 */
const findPackageJsonSync = (startDir: string): string | undefined => {
  let dir = startDir;
  let prevDir = '';

  while (dir !== prevDir) {
    const pkgPath = join(dir, 'package.json');
    try {
      readFileSync(pkgPath, 'utf-8');
      return pkgPath;
    } catch {
      prevDir = dir;
      dir = dirname(dir);
    }
  }

  return undefined;
};

/**
 * Read version from package.json (async).
 */
const readVersionFromPackageJson = async (
  pkgPath: string,
): Promise<string | undefined> => {
  try {
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content) as RawPackageJson;
    return pkg.version;
  } catch {
    return undefined;
  }
};

/**
 * Detect version: use provided version or read from nearest package.json.
 */
export const detectVersion = async (
  providedVersion: string | undefined,
  startDir: string = process.cwd(),
): Promise<string | undefined> => {
  if (providedVersion) {
    return providedVersion;
  }

  const pkgPath = await findPackageJson(startDir);
  if (!pkgPath) {
    return undefined;
  }

  return readVersionFromPackageJson(pkgPath);
};

/**
 * Read package info (homepage, repository) from package.json synchronously.
 * Returns only HTTPS URLs; other URL schemes are omitted.
 */
export const readPackageInfoSync = (
  startDir: string = process.cwd(),
): PackageInfo => {
  const pkgPath = findPackageJsonSync(startDir);
  if (!pkgPath) {
    return {};
  }

  try {
    const content = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content) as RawPackageJson;

    return {
      homepage: validateHttpsUrl(pkg.homepage),
      repository: extractRepoUrl(pkg.repository),
    };
  } catch {
    return {};
  }
};
