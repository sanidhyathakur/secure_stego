"""
CLAHE (Contrast Limited Adaptive Histogram Equalization) Enhancement Module

This module provides post-extraction image enhancement for recovered steganographic
images. After LSB extraction, the recovered secret image typically appears washed out
and low-contrast because only the 2 most significant bits of each channel are
recovered (shifted left by 6, leaving the lower 6 bits as zero).

CLAHE improves localized contrast without blowing out highlights, making it ideal
for this use case.

IMPORTANT: This enhancement must ONLY be applied AFTER extraction, never before.
Applying any pixel-level modification to the stego image before extraction would
corrupt the hidden LSB payload and make recovery impossible.
"""

import io
import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)


def apply_clahe(
    image_bytes: bytes,
    clip_limit: float = 2.0,
    tile_grid_size: tuple = (8, 8),
) -> bytes:
    """
    Apply CLAHE enhancement to an image provided as raw bytes.

    For RGB images: converts to LAB color space, applies CLAHE to the L (lightness)
    channel only, then converts back. This improves contrast while preserving the
    original color relationships — crucial because the recovered image's colors are
    already degraded from the 2-bit quantization during LSB embedding.

    For grayscale images: applies CLAHE directly to the single channel.

    Args:
        image_bytes: Raw image file bytes (PNG, JPEG, etc.)
        clip_limit: Contrast limiting threshold for CLAHE. Higher values allow more
                    contrast amplification but risk noise amplification. Default 2.0
                    is a safe balance for steganographic recovery artifacts.
        tile_grid_size: Size of the grid for local histogram equalization.
                        (8, 8) provides good localized enhancement without block
                        artifacts on most image sizes.

    Returns:
        Enhanced image as PNG bytes.

    Raises:
        ValueError: If the input bytes cannot be decoded as a valid image.
        RuntimeError: If CLAHE processing fails mid-operation.
    """
    # Decode image from raw bytes
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)

    if img is None:
        raise ValueError("Could not decode image from provided bytes. File may be corrupt or not a valid image.")

    try:
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

        if len(img.shape) == 2:
            # Grayscale image — apply CLAHE directly
            enhanced = clahe.apply(img)
        elif img.shape[2] == 1:
            # Single-channel image stored as 3D array
            enhanced = clahe.apply(img[:, :, 0])
        elif img.shape[2] in (3, 4):
            has_alpha = img.shape[2] == 4
            if has_alpha:
                # Separate alpha channel before processing
                alpha = img[:, :, 3]
                bgr = img[:, :, :3]
            else:
                bgr = img

            # Convert BGR -> LAB color space
            # LAB separates lightness (L) from color (A, B), so we can boost
            # contrast on L without distorting the color channels. This is the
            # key reason to use LAB over direct per-channel histogram equalization,
            # which would shift color balance unpredictably.
            lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)

            # Apply CLAHE only to the L channel
            l_enhanced = clahe.apply(l_channel)

            # Merge back and convert to BGR
            lab_enhanced = cv2.merge([l_enhanced, a_channel, b_channel])
            enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)

            if has_alpha:
                enhanced = cv2.merge([enhanced, alpha[:, :, np.newaxis] if alpha.ndim == 2 else alpha])
                # Fix: merge expects same-dimension arrays
                enhanced = np.dstack([enhanced[:, :, :3], alpha])
        else:
            raise ValueError(f"Unsupported number of channels: {img.shape[2]}")

    except ValueError:
        raise
    except Exception as e:
        logger.error(f"CLAHE processing failed: {e}", exc_info=True)
        raise RuntimeError(f"Enhancement processing failed: {e}")

    # Encode as PNG (lossless — important for quality comparison)
    success, encoded = cv2.imencode(".png", enhanced)
    if not success:
        raise RuntimeError("Failed to encode the enhanced image to PNG")

    return encoded.tobytes()


def compute_psnr(image_bytes_a: bytes, image_bytes_b: bytes) -> float:
    """
    Compute Peak Signal-to-Noise Ratio (PSNR) between two images.

    Used to quantitatively measure how close a recovered (or enhanced) image
    is to the original secret image. Higher PSNR = closer to original.

    Typical ranges for steganographic recovery:
      - Raw recovered vs original: 10-20 dB (due to 2-bit quantization loss)
      - CLAHE-enhanced vs original: may be slightly lower PSNR (CLAHE redistributes
        intensity) but perceptual quality is usually better

    Both images are resized to match the smaller dimension if they differ.

    Args:
        image_bytes_a: First image bytes (typically the original secret)
        image_bytes_b: Second image bytes (typically the recovered/enhanced image)

    Returns:
        PSNR value in dB, or float('inf') if images are identical.

    Raises:
        ValueError: If either image cannot be decoded.
    """
    arr_a = np.frombuffer(image_bytes_a, np.uint8)
    arr_b = np.frombuffer(image_bytes_b, np.uint8)

    img_a = cv2.imdecode(arr_a, cv2.IMREAD_COLOR)
    img_b = cv2.imdecode(arr_b, cv2.IMREAD_COLOR)

    if img_a is None:
        raise ValueError("Could not decode the first image (original).")
    if img_b is None:
        raise ValueError("Could not decode the second image (recovered/enhanced).")

    # Resize to match dimensions if they differ
    if img_a.shape != img_b.shape:
        h = min(img_a.shape[0], img_b.shape[0])
        w = min(img_a.shape[1], img_b.shape[1])
        img_a = cv2.resize(img_a, (w, h))
        img_b = cv2.resize(img_b, (w, h))

    psnr_value = cv2.PSNR(img_a, img_b)
    return float(psnr_value)


def compute_histogram(image_bytes: bytes) -> dict:
    """
    Compute per-channel (R, G, B) histograms for an image.

    Returns a dict with keys 'red', 'green', 'blue', each mapping to
    a list of 256 integer counts. Used for cover-vs-stego histogram
    comparison to demonstrate embedding imperceptibility.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image for histogram computation.")

    # OpenCV loads as BGR — compute histograms per channel
    hist_b = cv2.calcHist([img], [0], None, [256], [0, 256]).flatten()
    hist_g = cv2.calcHist([img], [1], None, [256], [0, 256]).flatten()
    hist_r = cv2.calcHist([img], [2], None, [256], [0, 256]).flatten()

    return {
        "red": hist_r.astype(int).tolist(),
        "green": hist_g.astype(int).tolist(),
        "blue": hist_b.astype(int).tolist(),
    }
