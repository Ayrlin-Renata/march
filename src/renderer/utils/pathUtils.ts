/**
 * Converts a standard file path into a format safe for 'src' attributes.
 * Handles Windows backslashes and ensures the file:// protocol is correctly applied.
 */
export const getAssetUrl = (path: string): string => {
    if (!path) return '';

    // Replace backslashes with forward slashes for Windows compatibility
    const normalized = path.replace(/\\/g, '/');

    // Ensure it starts with file:/// (three slashes for absolute paths)
    if (normalized.startsWith('/')) {
        return `file://${normalized}`;
    }

    return `file:///${normalized}`;
};
