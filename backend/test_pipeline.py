"""
End-to-end pipeline verification:
  1. Embed a test secret image into a cover image (saves as PNG)
  2. Extract the secret back from the stego image
  3. Compare extracted pixels to originals
  4. Print diagnostic LSB samples
"""
import os
import sys
from PIL import Image
import numpy as np

# Add backend dir to path
sys.path.insert(0, os.path.dirname(__file__))

from app import embed_secret_image, extract_secret_image

UPLOAD = os.path.join(os.path.dirname(__file__), "uploads")
OUTPUT = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(UPLOAD, exist_ok=True)
os.makedirs(OUTPUT, exist_ok=True)

# Create a synthetic test cover (256x256 gradient)
cover = Image.new("RGB", (256, 256))
for x in range(256):
    for y in range(256):
        cover.putpixel((x, y), (x, y, (x + y) % 256))
cover_path = os.path.join(UPLOAD, "test_cover.png")
cover.save(cover_path, format="PNG")

# Create a synthetic test secret (solid blocks of known colors)
secret = Image.new("RGB", (256, 256))
for x in range(256):
    for y in range(256):
        # Use values that are multiples of 64 (0,64,128,192) since
        # only 2 MSBs survive the embedding (>> 6 drops lower 6 bits)
        r = (x // 64) * 64
        g = (y // 64) * 64
        b = ((x + y) // 64 % 4) * 64
        secret.putpixel((x, y), (r, g, b))
secret_path = os.path.join(UPLOAD, "test_secret.png")
secret.save(secret_path, format="PNG")

PASSWORD = "testpass123"

# --- Step 1: Embed ---
stego_path = os.path.join(OUTPUT, "test_stego.png")
embed_secret_image(cover_path, secret_path, PASSWORD, stego_path)
print(f"[OK] Stego image saved: {stego_path}")
print(f"     File size: {os.path.getsize(stego_path)} bytes")

# Verify stego is PNG (first 8 bytes = PNG magic)
with open(stego_path, "rb") as f:
    magic = f.read(8)
    is_png = magic[:4] == b'\x89PNG'
    print(f"     Format is PNG: {is_png}")
    if not is_png:
        print("[FAIL] Stego is NOT PNG — LSB data will be destroyed!")
        sys.exit(1)

# --- Step 2: Diagnostic — check first 20 LSBs after embedding ---
stego_img = Image.open(stego_path).convert("RGB")
secret_img = Image.open(secret_path).convert("RGB")

print("\n--- Diagnostic: First 20 pixels ---")
print(f"{'Pixel':>8} | {'Secret(R,G,B)':>16} | {'Stego LSBs (B&3, R&3, G&3)':>30} | {'Extracted(sr,sg,sb)':>22} | Match?")
print("-" * 110)

match_count = 0
total_check = 20
for idx in range(total_check):
    x, y = idx % 256, idx // 256
    sr_orig, sg_orig, sb_orig = secret_img.getpixel((x, y))
    r, g, b = stego_img.getpixel((x, y))

    # What extraction would produce
    sr_ext = (b & 0x03) << 6
    sg_ext = (r & 0x03) << 6
    sb_ext = (g & 0x03) << 6

    # What embedding should have stored (top 2 bits of secret)
    sr_expected = (sr_orig >> 6) << 6
    sg_expected = (sg_orig >> 6) << 6
    sb_expected = (sb_orig >> 6) << 6

    match = (sr_ext == sr_expected) and (sg_ext == sg_expected) and (sb_ext == sb_expected)
    if match:
        match_count += 1

    print(f"({x:3},{y:3}) | ({sr_orig:3},{sg_orig:3},{sb_orig:3}) | (B&3={b&3}, R&3={r&3}, G&3={g&3}){'':>14} | ({sr_ext:3},{sg_ext:3},{sb_ext:3}){'':>7} | {'OK' if match else 'FAIL'}")

print(f"\nMatched: {match_count}/{total_check}")

# --- Step 3: Extract ---
recovered_path = os.path.join(OUTPUT, "test_recovered.png")
extract_secret_image(stego_path, PASSWORD, recovered_path)
print(f"\n[OK] Recovered image saved: {recovered_path}")

# --- Step 4: Full comparison ---
recovered_img = Image.open(recovered_path).convert("RGB")
secret_arr = np.array(secret_img)
recovered_arr = np.array(recovered_img)

# Secret values quantized to 2 MSBs (what we expect to get back)
secret_quantized = (secret_arr >> 6) << 6

total_pixels = secret_quantized.size
matching_pixels = np.sum(secret_quantized == recovered_arr)
pct = (matching_pixels / total_pixels) * 100

print(f"\n--- Full Image Comparison ---")
print(f"Total pixel values: {total_pixels}")
print(f"Matching values:    {matching_pixels}")
print(f"Match rate:         {pct:.2f}%")

if pct > 99.9:
    print("\n[PASS] Pipeline is working correctly -- extracted image matches embedded secret.")
elif pct > 90:
    print(f"\n[WARN] Mostly correct but {100-pct:.1f}% mismatch — check edge cases.")
else:
    print(f"\n[FAIL] Only {pct:.1f}% match -- pipeline is broken!")

print("\nDone.")
