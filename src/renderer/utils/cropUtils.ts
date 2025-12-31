/**
 * Calculates the Total View Rect (the area of the image covered by PixelCrop + Expansion)
 * in IMAGE PIXELS.
 */
export function calculateViewRect(
    pixelCrop: { x: number; y: number; width: number; height: number },
    expansion: { top: number; right: number; bottom: number; left: number }
) {
    return {
        x: pixelCrop.x - expansion.left,
        y: pixelCrop.y - expansion.top,
        width: pixelCrop.width + expansion.left + expansion.right,
        height: pixelCrop.height + expansion.top + expansion.bottom
    };
}

/**
 * Calculates the valid pixelCrop and expansion given a desired move/zoom.
 *
 * PRIORITY:
 * 1. PREVIEW AREA (`pixelCrop`) must ALWAYS be fully inside the Image.
 * 2. PREVIEW AREA aspect ratio must RIGIDLY match `targetAspect`.
 * 3. CROP AREA (`pixelCrop` + `expansion`) should be inside the Image if possible.
 */
export function getConstrainedPixelCrop(
    currentPixelCrop: { x: number; y: number; width: number; height: number },
    currentExpansion: { top: number; right: number; bottom: number; left: number },
    imageWidth: number,
    imageHeight: number,
    targetAspect: number, // Width / Height of the slot
    deltaX: number = 0, // In Image Pixels
    deltaY: number = 0, // In Image Pixels
    zoomFactor: number = 1, // Multiplier for existing pixelCrop size
    isSymmetric: boolean = false
) {
    // 1. Calculate New Size
    const currentW = currentPixelCrop.width || imageWidth;
    const currentH = currentPixelCrop.height || (imageWidth / targetAspect);

    // zoomFactor > 1 means zoom IN (smaller crop box)
    let newW = currentW / zoomFactor;
    let newH = newW / targetAspect;

    // Handle Expansion Scale: If we zoom, the expansion should scale too
    // to maintain its visual size relative to the slot.
    const newExpansion = {
        top: currentExpansion.top / zoomFactor,
        right: currentExpansion.right / zoomFactor,
        bottom: currentExpansion.bottom / zoomFactor,
        left: currentExpansion.left / zoomFactor
    };

    // 2. Clamp New Size to Image Bounds (Preserve Aspect)
    if (newW > imageWidth) {
        newW = imageWidth;
        newH = newW / targetAspect;
    }
    if (newH > imageHeight) {
        newH = imageHeight;
        newW = newH * targetAspect;
    }

    // 3. Calculate Centered Potential Positions
    const dW = currentW - newW;
    const dH = currentH - newH;

    let newX = currentPixelCrop.x + (dW / 2) - deltaX;
    let newY = currentPixelCrop.y + (dH / 2) - deltaY;

    // 4. Clamp Position to Image Boundaries (Constraint Priority #1)
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + newW > imageWidth) newX = imageWidth - newW;
    if (newY + newH > imageHeight) newY = imageHeight - newH;

    const finalPixelCrop = {
        x: Math.round(newX * 100) / 100,
        y: Math.round(newY * 100) / 100,
        width: Math.round(newW * 100) / 100,
        height: Math.round(newH * 100) / 100
    };

    // 5. Handle Expansion Constraints (Auto-Shrink if it hits image edges)
    const topSpace = finalPixelCrop.y;
    const bottomSpace = imageHeight - (finalPixelCrop.y + finalPixelCrop.height);
    const leftSpace = finalPixelCrop.x;
    const rightSpace = imageWidth - (finalPixelCrop.x + finalPixelCrop.width);

    // Clamp expansion to available space
    newExpansion.top = Math.max(0, Math.min(newExpansion.top, topSpace));
    newExpansion.bottom = Math.max(0, Math.min(newExpansion.bottom, bottomSpace));
    newExpansion.left = Math.max(0, Math.min(newExpansion.left, leftSpace));
    newExpansion.right = Math.max(0, Math.min(newExpansion.right, rightSpace));

    // If Symmetric, enforce it AFTER clamping
    if (isSymmetric) {
        const minV = Math.min(newExpansion.top, newExpansion.bottom);
        const minH = Math.min(newExpansion.left, newExpansion.right);
        newExpansion.top = minV;
        newExpansion.bottom = minV;
        newExpansion.left = minH;
        newExpansion.right = minH;
    }

    return {
        pixelCrop: finalPixelCrop,
        expansion: newExpansion
    };
}

/**
 * Common helper to get a centered 'Cover' crop area for a given aspect ratio.
 */
export function getInitialPixelCrop(imgW: number, imgH: number, aspect: number) {
    let cropW, cropH;
    const imgAspect = imgW / imgH;

    if (imgAspect > aspect) {
        // Image is wider than target: fill height, crop sides
        cropH = imgH;
        cropW = cropH * aspect;
    } else {
        // Image is taller than target: fill width, crop top/bottom
        cropW = imgW;
        cropH = cropW / aspect;
    }

    return {
        x: (imgW - cropW) / 2,
        y: (imgH - cropH) / 2,
        width: cropW,
        height: cropH
    };
}
