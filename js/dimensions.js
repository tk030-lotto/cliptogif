/**
 * Dimension and aspect ratio calculations for video and GIF outputs.
 */
export function calculateDimensions(origWidth, origHeight, maxSide) {
  if (!origWidth || !origHeight) {
    return { width: maxSide, height: maxSide };
  }

  let width, height;
  if (origHeight > origWidth) {
    // Vertical Video (Portrait, e.g. 9:16)
    height = maxSide;
    width = Math.round(origWidth * (maxSide / origHeight));
  } else {
    // Horizontal or Square Video (Landscape, e.g. 16:9)
    width = maxSide;
    height = Math.round(origHeight * (maxSide / origWidth));
  }

  // Round to even numbers for encoder safety
  width = (width & ~1) || 2;
  height = (height & ~1) || 2;

  return { width, height };
}
