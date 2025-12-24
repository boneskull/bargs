import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { detectVersion } from '../src/version.js';

describe('version detection', () => {
  it('should return provided version if given', async () => {
    const version = await detectVersion('1.2.3');
    expect(version, 'to equal', '1.2.3');
  });

  it('should return undefined if no version and no package.json found', async () => {
    const version = await detectVersion(undefined, '/nonexistent/path');
    expect(version, 'to be undefined');
  });
});
