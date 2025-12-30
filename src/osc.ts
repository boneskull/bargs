// src/osc.ts - OSC (Operating System Command) escape sequences for terminal features

import process from 'node:process';

/**
 * OSC escape sequence start.
 */
const OSC = '\x1b]';

/**
 * Bell character - terminates OSC sequence.
 */
const BEL = '\x07';

/**
 * Separator for OSC parameters.
 */
const SEP = ';';

/**
 * Check if running inside tmux.
 */
const isTmux = (): boolean => 'TMUX' in process.env;

/**
 * Wrap an OSC sequence for tmux compatibility. Tmux requires OSC sequences to
 * be wrapped with DCS tmux; <sequence> ST and all ESCs in <sequence> to be
 * replaced with ESC ESC.
 */
const wrapOsc = (sequence: string): string => {
  if (isTmux()) {
    return '\x1BPtmux;' + sequence.replaceAll('\x1B', '\x1B\x1B') + '\x1B\\';
  }
  return sequence;
};

/**
 * Parse a version string into major/minor/patch components. Handles both dotted
 * versions (1.72.0) and compact versions (4601 -> 46.1.0).
 */
const parseVersion = (
  versionString = '',
): { major: number; minor: number; patch: number } => {
  // Handle compact version format (e.g., 4601 => 46.1.0)
  if (/^\d{3,4}$/.test(versionString)) {
    const match = /(\d{1,2})(\d{2})/.exec(versionString) ?? [];
    return {
      major: 0,
      minor: Number.parseInt(match[1] ?? '0', 10),
      patch: Number.parseInt(match[2] ?? '0', 10),
    };
  }

  const versions = (versionString ?? '')
    .split('.')
    .map((n) => Number.parseInt(n, 10));
  return {
    major: versions[0] ?? 0,
    minor: versions[1] ?? 0,
    patch: versions[2] ?? 0,
  };
};

/**
 * Detect if the terminal supports hyperlinks (OSC 8). Based on the logic from
 * supports-hyperlinks package but implemented inline without dependencies.
 */
export const supportsHyperlinks = (
  stream: NodeJS.WriteStream = process.stdout,
): boolean => {
  const {
    CI,
    CURSOR_TRACE_ID,
    FORCE_HYPERLINK,
    NETLIFY,
    TEAMCITY_VERSION,
    TERM,
    TERM_PROGRAM,
    TERM_PROGRAM_VERSION,
    VTE_VERSION,
  } = process.env;

  // Explicit force flag
  if (FORCE_HYPERLINK) {
    return !(
      FORCE_HYPERLINK.length > 0 && Number.parseInt(FORCE_HYPERLINK, 10) === 0
    );
  }

  // Netlify always supports hyperlinks (no TTY needed)
  if (NETLIFY) {
    return true;
  }

  // No TTY, no hyperlinks
  if (!stream.isTTY) {
    return false;
  }

  // Windows Terminal supports hyperlinks
  if ('WT_SESSION' in process.env) {
    return true;
  }

  // Windows (non-Windows Terminal) doesn't support hyperlinks
  if (process.platform === 'win32') {
    return false;
  }

  // CI environments generally don't support hyperlinks
  if (CI) {
    return false;
  }

  // TeamCity doesn't support hyperlinks
  if (TEAMCITY_VERSION) {
    return false;
  }

  // Check terminal program
  if (TERM_PROGRAM) {
    const version = parseVersion(TERM_PROGRAM_VERSION);

    switch (TERM_PROGRAM) {
      case 'ghostty':
      case 'zed': {
        return true;
      }

      case 'iTerm.app': {
        // iTerm 3.1+ supports hyperlinks
        if (version.major === 3) {
          return version.minor >= 1;
        }
        return version.major > 3;
      }

      case 'vscode': {
        // Cursor (VS Code fork) supports hyperlinks
        if (CURSOR_TRACE_ID) {
          return true;
        }
        // VS Code 1.72+ supports hyperlinks
        return (
          version.major > 1 || (version.major === 1 && version.minor >= 72)
        );
      }
      case 'WezTerm': {
        // WezTerm packaged by Nix uses their own version scheme
        if (/^0-unstable-\d{4}-\d{2}-\d{2}$/.test(TERM_PROGRAM_VERSION ?? '')) {
          const date = (TERM_PROGRAM_VERSION ?? '').slice('0-unstable-'.length);
          return date >= '2020-06-20';
        }
        // WezTerm version is a date (YYYYMMDD)
        return version.major >= 20200620;
      }
    }
  }

  // VTE-based terminals (GNOME Terminal, etc.)
  if (VTE_VERSION) {
    // VTE 0.50.0 was supposed to support hyperlinks but segfaults.
    // Check both string format ("0.50.0") and parsed version to catch
    // compact format ("5000") which parseVersion converts to { 0, 50, 0 }.
    if (VTE_VERSION === '0.50.0') {
      return false;
    }
    const version = parseVersion(VTE_VERSION);
    if (version.major === 0 && version.minor === 50 && version.patch === 0) {
      return false;
    }
    return version.major > 0 || version.minor >= 50;
  }

  // Check TERM variable
  switch (TERM) {
    case 'alacritty':
    case 'xterm-kitty': {
      return true;
    }
  }

  return false;
};

/**
 * Create an OSC 8 hyperlink. The link text is displayed, and clicking it opens
 * the URL in supported terminals.
 */
export const link = (text: string, url: string): string => {
  const openLink = wrapOsc(`${OSC}8${SEP}${SEP}${url}${BEL}`);
  const closeLink = wrapOsc(`${OSC}8${SEP}${SEP}${BEL}`);
  return openLink + text + closeLink;
};

/**
 * URL regex pattern for matching URLs in text. Matches http:// and https://
 * URLs.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"\])}]+/g;

/**
 * Auto-linkify URLs in text. If terminal supports hyperlinks, URLs become
 * clickable. Otherwise, text is returned unchanged.
 */
export const linkifyUrls = (
  text: string,
  stream: NodeJS.WriteStream = process.stdout,
): string => {
  if (!supportsHyperlinks(stream)) {
    return text;
  }

  return text.replace(URL_PATTERN, (url) => link(url, url));
};
