/**
 * Converts a standard file path into a format safe for 'src' attributes.
 * Handles Windows backslashes and ensures the file:// protocol is correctly applied.
 */
export const getAssetUrl = (path: string): string => {
    if (!path) return '';

    // Replace backslashes with forward slashes for Windows compatibility
    const normalized = path.replace(/\\/g, '/');

    // Use a dummy hostname 'local' to avoid Windows drive letters being parsed as hostnames
    if (normalized.startsWith('/')) {
        return `media://local${normalized}`;
    }

    return `media://local/${normalized}`;
};
