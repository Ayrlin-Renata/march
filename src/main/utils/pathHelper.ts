import path from 'path';

/**
 * Normalizes a path for Windows to support long paths (> 260 characters).
 * Prepends the \\?\ prefix for absolute paths if necessary.
 */
export function toWinLongPath(filePath: string): string {
    if (process.platform !== 'win32') return filePath;
    if (!filePath) return filePath;

    // If it already has the prefix, just return it
    if (filePath.startsWith('\\\\?\\')) return filePath;

    // Use path.resolve to get an absolute, cleaned up path
    const absolutePath = path.resolve(filePath);

    // Prefix for absolute paths to bypass MAX_PATH (260)
    // We apply it even for shorter paths if they are absolute, to be safe and consistent,
    // though Windows API only strictly requires it for > 260.
    // However, some Electron/Node APIs might prefer standard paths for short versions.
    // Let's only apply if length > 240 as a safety margin.
    if (absolutePath.length > 240) {
        if (absolutePath.startsWith('\\\\')) {
            // UNC path (\\Server\Share) -> \\?\UNC\Server\Share
            return '\\\\?\\UNC\\' + absolutePath.substring(2);
        }
        return '\\\\?\\' + absolutePath;
    }

    return absolutePath;
}

/**
 * Normalizes a path for internal storage and comparison.
 * Converts to forward slashes.
 */
export function normalizeInternalPath(p: string): string {
    if (!p) return p;
    // Normalize Unicode to NFC form to ensure consistency with filenames containing special characters
    let normalized = p.normalize('NFC').replace(/\\/g, '/');

    // For Windows, paths are case-insensitive. Lowercase everything for Map keys.
    if (process.platform === 'win32') {
        normalized = normalized.toLowerCase();

        // Remove long path prefix if present for consistent internal keys
        if (normalized.startsWith('//?/')) {
            normalized = normalized.slice(4);
            if (normalized.startsWith('unc/')) {
                normalized = '//' + normalized.slice(4);
            }
        }
    }

    return normalized;
}
