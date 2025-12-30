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
    const imgAspect = imageWidth / imageHeight;
    const slotAspect = slotWidth / slotHeight;

    let baseW, baseH;
    if (imgAspect > slotAspect) {
        // Image is wider than slot: match height
        baseH = slotHeight;
        baseW = baseH * imgAspect;
    } else {
        // Image is taller than slot: match width
        baseW = slotWidth;
        baseH = baseW / imgAspect;
    }

    const visualW = baseW * crop.scale;

    // In react-easy-crop, x/y are relative to the "centered" position.
    // Pixels = (offset from center) * (Original Image Px / Visual Scaling)

    // Scaling factor: How many image pixels are in one visual pixel
    const scaleFactor = imageWidth / visualW;

    // The center of the frame in image coordinates
    const imgCenterX = imageWidth / 2;
    const imgCenterY = imageHeight / 2;

    // The offset of the crop area from the image center in image pixels
    // Note: react-easy-crop uses a coordinate system where positive X shifts image LEFT 
    // (view moves RIGHT), so we subtract the offset.
    const cropCenterX = imgCenterX - (crop.x * scaleFactor);
    const cropCenterY = imgCenterY - (crop.y * scaleFactor);

    // The size of the crop area in image pixels
    const cropWidth = slotWidth * scaleFactor;
    const cropHeight = slotHeight * scaleFactor;

    return {
        x: Math.round(cropCenterX - (cropWidth / 2)),
        y: Math.round(cropCenterY - (cropHeight / 2)),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight)
    };
}
