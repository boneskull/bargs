import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Find package.json by walking up from startDir.
 */
const findPackageJson = async (
  startDir: string,
): Promise<string | undefined> => {
  let dir = startDir;
  const root = dirname(dir);

  while (dir !== root) {
    const pkgPath = join(dir, 'package.json');
    try {
      await readFile(pkgPath, 'utf-8');
      return pkgPath;
    } catch {
      dir = dirname(dir);
    }
  }

  return undefined;
};

/**
 * Read version from package.json.
 */
const readVersionFromPackageJson = async (
  pkgPath: string,
): Promise<string | undefined> => {
  try {
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content) as { version?: string };
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
