import { type SlotCrop } from '../types/stories';

/**
 * Replicates the logic used by react-easy-crop to calculate absolute pixel coordinates
 * for a crop based on image/slot dimensions and the UI-level crop state (x, y, scale).
 */
export function calculatePixelCrop(
    imageWidth: number,
    imageHeight: number,
    slotWidth: number,
    slotHeight: number,
    crop: SlotCrop
) {
    const exp = crop.expansion || { top: 0, right: 0, bottom: 0, left: 0 };
    const targetWidth = slotWidth + exp.left + exp.right;
    const targetHeight = slotHeight + exp.top + exp.bottom;

    const imgAspect = imageWidth / imageHeight;
    const targetAspect = targetWidth / targetHeight;

    let baseW, baseH;
    if (imgAspect > targetAspect) {
        // Image is wider than target area: match height
        baseH = targetHeight;
        baseW = baseH * imgAspect;
    } else {
        // Image is taller than target area: match width
        baseW = targetWidth;
        baseH = baseW / imgAspect;
    }

    const visualW = baseW * crop.scale;

    // Scaling factor: How many image pixels are in one visual pixel
    const scaleFactor = imageWidth / visualW;

    // The center of the frame in image coordinates
    const imgCenterX = imageWidth / 2;
    const imgCenterY = imageHeight / 2;

    // Note: react-easy-crop x/y are relative to the "centered" position of the CONTAINER.
    // If the UI enforces focus-matching-container, then crop.x/y are relative to target center.
    const cropCenterX = imgCenterX - (crop.x * scaleFactor);
    const cropCenterY = imgCenterY - (crop.y * scaleFactor);

    // The size of the crop area in image pixels
    const cropWidth = targetWidth * scaleFactor;
    const cropHeight = targetHeight * scaleFactor;

    return {
        x: Math.round(cropCenterX - (cropWidth / 2)),
        y: Math.round(cropCenterY - (cropHeight / 2)),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight)
    };
}

/**
 * Calculates a clamped version of the crop (x, y percentages) to ensure the image
 * always covers the container at the given scale.
 */
export function clampCrop(
    imageWidth: number,
    imageHeight: number,
    containerWidth: number,
    containerHeight: number,
    scale: number,
    crop: { x: number; y: number }
) {
    if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) return crop;

    const imgAspect = imageWidth / imageHeight;
    const containerAspect = containerWidth / containerHeight;

    let baseW, baseH;
    if (imgAspect > containerAspect) {
        // Image is wider than container: match height
        baseH = containerHeight;
        baseW = baseH * imgAspect;
    } else {
        // Image is taller than container: match width
        baseW = containerWidth;
        baseH = baseW / imgAspect;
    }

    const currentScaledW = baseW * scale;
    const currentScaledH = baseH * scale;

    // Max allowed pan in pixels (from center)
    const limitX = Math.max(0, (currentScaledW - containerWidth) / 2);
    const limitY = Math.max(0, (currentScaledH - containerHeight) / 2);

    // Current pan in pixels
    const currentXpx = (crop.x / 100) * containerWidth;
    const currentYpx = (crop.y / 100) * containerHeight;

    // Clamp
    const clampedXpx = Math.max(-limitX, Math.min(limitX, currentXpx));
    const clampedYpx = Math.max(-limitY, Math.min(limitY, currentYpx));

    return {
        x: (clampedXpx / containerWidth) * 100,
        y: (clampedYpx / containerHeight) * 100
    };
}
