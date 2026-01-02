/**
 * Converts a standard file path into a format safe for 'src' attributes.
 * Handles Windows backslashes and ensures the file:// protocol is correctly applied.
 */
export const getAssetUrl = (path: string): string => {
    if (!path) return '';

    // Replace backslashes with forward slashes for Windows compatibility
    const normalized = path.replace(/\\/g, '/');

    // We encode the entire path after the protocol to ensure characters like #, ?, for emojis don't break URL parsing
    const encoded = normalized.split('/').map(segment => encodeURIComponent(segment)).join('/');

    return `media://local/${encoded}`;
};

export const getThumbnailUrl = (path: string, size?: number, crop?: { x: number; y: number; width: number; height: number }): string => {
    if (!path) return '';
    const normalized = path.replace(/\\/g, '/');
    const params = new URLSearchParams();
    if (size) params.set('size', size.toString());
    if (crop) params.set('crop', `${crop.x},${crop.y},${crop.width},${crop.height}`);

    const query = params.toString() ? `?${params.toString()}` : '';

    // Consistent encoding for thumbnails as well
    const encoded = normalized.split('/').map(segment => encodeURIComponent(segment)).join('/');

    return `thumb://local/${encoded}${query}`;
};
