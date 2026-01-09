/**
 * Package version and metadata detection utilities.
 *
 * Provides functions to locate and read `package.json` files by walking up the
 * directory tree, extracting version strings, and gathering package metadata
 * (homepage, repository URLs) for automatic epilog generation in help output.
 *
 * @packageDocumentation
 */

import { readFileSync, realpathSync } from 'node:fs';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Get the real path of the entry script, resolving symlinks. Falls back to cwd
 * if process.argv[1] is unavailable.
 *
 * @function
 */
const getScriptDir = (): string => {
  try {
    // process.argv[1] is the script being executed
    const scriptPath = process.argv[1];
    if (scriptPath) {
      // Resolve symlinks to find the real location
      const realPath = realpathSync(scriptPath);
      return dirname(realPath);
    }
  } catch {
    // Fall through to cwd
  }
  return process.cwd();
};

/**
 * Get the real path of the entry script asynchronously, resolving symlinks.
 * Falls back to cwd if process.argv[1] is unavailable.
 *
 * @function
 */
const getScriptDirAsync = async (): Promise<string> => {
  try {
    const scriptPath = process.argv[1];
    if (scriptPath) {
      const realPath = await realpath(scriptPath);
      return dirname(realPath);
    }
  } catch {
    // Fall through to cwd
  }
  return process.cwd();
};

/**
 * Package info extracted from `package.json` for epilog generation.
 */
interface PackageInfo {
  homepage?: string;
  repository?: string;
}

/**
 * Raw `package.json` structure (partial). Represents the file as-is before
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
 *
 * @function
 */
const normalizeRepoUrl = (url: string): string => {
  return url.replace(/^git\+/, '').replace(/\.git$/, '');
};

/**
 * Validate that a URL is HTTPS. Returns the URL if valid, undefined otherwise.
 *
 * @function
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
 *
 * @function
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
 *
 * @function
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
 *
 * @function
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
 *
 * @function
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
 * Read version from package.json (sync).
 *
 * @function
 */
const readVersionFromPackageJsonSync = (
  pkgPath: string,
): string | undefined => {
  try {
    const content = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content) as RawPackageJson;
    return pkg.version;
  } catch {
    return undefined;
  }
};

/**
 * Detect version: use provided version or read from nearest package.json.
 * Starts from the entry script's real location (resolving symlinks) by
 * default.
 *
 * @function
 */
export const detectVersion = async (
  providedVersion?: string,
  startDir?: string,
): Promise<string | undefined> => {
  if (providedVersion) {
    return providedVersion;
  }

  const dir = startDir ?? (await getScriptDirAsync());
  const pkgPath = await findPackageJson(dir);
  if (!pkgPath) {
    return undefined;
  }

  return readVersionFromPackageJson(pkgPath);
};

/**
 * Detect version synchronously: use provided version or read from nearest
 * package.json. Starts from the entry script's real location (resolving
 * symlinks) by default.
 *
 * @function
 */
export const detectVersionSync = (
  providedVersion?: string,
  startDir?: string,
): string | undefined => {
  if (providedVersion) {
    return providedVersion;
  }

  const dir = startDir ?? getScriptDir();
  const pkgPath = findPackageJsonSync(dir);
  if (!pkgPath) {
    return undefined;
  }

  return readVersionFromPackageJsonSync(pkgPath);
};

/**
 * Read package info (homepage, repository) from package.json synchronously.
 * Returns only HTTPS URLs; other URL schemes are omitted.
 *
 * @function
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
