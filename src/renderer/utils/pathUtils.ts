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

export const getThumbnailUrl = (path: string, size?: number, crop?: { x: number; y: number; width: number; height: number }): string => {
    if (!path) return '';
    const normalized = path.replace(/\\/g, '/');
    const params = new URLSearchParams();
    if (size) params.set('size', size.toString());
    if (crop) params.set('crop', `${crop.x},${crop.y},${crop.width},${crop.height}`);

    const query = params.toString() ? `?${params.toString()}` : '';

    if (normalized.startsWith('/')) {
        return `thumb://local${normalized}${query}`;
    }
    return `thumb://local/${normalized}${query}`;
};
