import os
import io
import logging
import base64
import secrets
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from dotenv import load_dotenv

# CLAHE enhancement — post-extraction only (see module docstring for rationale)
from clahe_enhance import apply_clahe, compute_psnr, compute_histogram

# RSA / cryptography imports
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes

# -----------------------------
# Load environment variables
# -----------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SMTP_SENDER_PASSWORD")

if not SENDER_EMAIL or not SENDER_PASSWORD:
    print("⚠️  WARNING: SMTP_SENDER_EMAIL or SMTP_SENDER_PASSWORD not set in .env")

print("DEBUG EMAIL:", SENDER_EMAIL)
print("DEBUG PASSWORD SET:", bool(SENDER_PASSWORD))

# -----------------------------
# Flask app setup
# -----------------------------
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "outputs")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["OUTPUT_FOLDER"] = OUTPUT_FOLDER


# -----------------------------
# RSA utilities
# -----------------------------
def generate_rsa_keypair():
    """Generate a 2048-bit RSA key pair and return (private_pem, public_pem)."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),  # for demo; can add passphrase
    ).decode("utf-8")

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    return private_pem, public_pem


def encrypt_key_with_public_key(key_str: str, public_key_pem: str) -> str:
    """Encrypt the symmetric key with receiver's public key, return base64 string."""
    public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
    ciphertext = public_key.encrypt(
        key_str.encode("utf-8"),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    return base64.b64encode(ciphertext).decode("utf-8")


def decrypt_key_with_private_key(ciphertext_b64: str, private_key_pem: str) -> str:
    """Decrypt base64-encoded ciphertext using receiver's private key, return key string."""
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode("utf-8"),
        password=None,
    )
    ciphertext = base64.b64decode(ciphertext_b64.encode("utf-8"))
    key_bytes = private_key.decrypt(
        ciphertext,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    return key_bytes.decode("utf-8")


# -----------------------------
# Steganography utilities
# -----------------------------
def embed_secret_image(cover_path: str, secret_path: str, password: str, output_path: str, bit_depth: int = 2) -> str:
    """
    Embed secret image into cover image using LSB steganography.

    bit_depth: Number of LSBs used per channel (1-4). Higher = better recovery
    quality but more visible changes to the cover image. Default 2.
    """
    if bit_depth < 1 or bit_depth > 4:
        raise ValueError("bit_depth must be between 1 and 4")

    cover_img = Image.open(cover_path).convert("RGB")
    secret_img = Image.open(secret_path).convert("RGB")

    secret_img = secret_img.resize(cover_img.size)

    cover_pixels = cover_img.load()
    secret_pixels = secret_img.load()
    width, height = cover_img.size

    # Bit manipulation masks derived from bit_depth:
    #   cover_mask  — clears the bottom N bits of each cover channel
    #   shift       — how far right to shift secret values to extract top N bits
    #   embed_mask  — isolates the N embedded bits after shifting
    cover_mask = ~((1 << bit_depth) - 1) & 0xFF
    shift = 8 - bit_depth
    embed_mask = (1 << bit_depth) - 1

    for i in range(width):
        for j in range(height):
            r, g, b = cover_pixels[i, j]
            sr, sg, sb = secret_pixels[i, j]

            b = (b & cover_mask) | ((sr >> shift) & embed_mask)
            r = (r & cover_mask) | ((sg >> shift) & embed_mask)
            g = (g & cover_mask) | ((sb >> shift) & embed_mask)

            cover_pixels[i, j] = (r, g, b)

    # MUST be PNG (lossless). JPEG compression destroys LSB pixel data,
    # making the embedded secret unrecoverable (output becomes pure noise).
    cover_img.save(output_path, format="PNG")

    if password:
        with open(output_path, "ab") as f:
            f.write(password.encode("utf-8"))

    return output_path


def extract_secret_image(stego_path: str, password: str, output_path: str, bit_depth: int = 2) -> str:
    """
    Extract hidden secret image from a stego image.

    bit_depth MUST match the value used during embedding, otherwise
    the extracted image will be incorrect.
    """
    if bit_depth < 1 or bit_depth > 4:
        raise ValueError("bit_depth must be between 1 and 4")

    if password:
        password_length = len(password)
        with open(stego_path, "rb") as f:
            f.seek(0, os.SEEK_END)
            filesize = f.tell()

            if filesize < password_length:
                raise ValueError("Invalid password")

            f.seek(filesize - password_length)
            extracted = f.read(password_length).decode("utf-8", errors="ignore")

        if extracted != password:
            raise ValueError("Invalid password")

    stegano_img = Image.open(stego_path).convert("RGB")
    width, height = stegano_img.size

    secret_img = Image.new("RGB", stegano_img.size)
    secret_pixels = secret_img.load()

    extract_mask = (1 << bit_depth) - 1
    shift = 8 - bit_depth

    for i in range(width):
        for j in range(height):
            r, g, b = stegano_img.getpixel((i, j))
            sr = (b & extract_mask) << shift
            sg = (r & extract_mask) << shift
            sb = (g & extract_mask) << shift
            secret_pixels[i, j] = (sr, sg, sb)

    secret_img.save(output_path, format="PNG")
    return output_path


# -----------------------------
# SMTP utility
# -----------------------------
def send_email_with_image_and_encrypted_key(to_email: str, subject: str, body: str, image_path: str, encrypted_key: str = None) -> None:
    if not (SENDER_EMAIL and SENDER_PASSWORD):
        raise RuntimeError("SMTP credentials are not set")

    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject

    text_body = body
    if encrypted_key:
        text_body += (
            "\n\n---- Encrypted Decryption Key (Base64, RSA-encrypted) ----\n"
            f"{encrypted_key}\n"
            "----------------------------------------------------------\n"
            "Use your private key in the SecureStego app to decrypt this key.\n"
        )

    msg.attach(MIMEText(text_body, "plain"))

    if image_path:
        with open(image_path, "rb") as f:
            img_data = f.read()
            image = MIMEImage(img_data, name=os.path.basename(image_path))
            msg.attach(image)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, to_email, msg.as_string())


# -----------------------------
# API ROUTES
# -----------------------------

@app.route("/api/generate-keys", methods=["GET"])
def api_generate_keys():
    """
    Helper route for demo:
    Generates an RSA keypair and returns both PEMs.
    In a real system, receiver should generate and keep private key locally.
    """
    private_pem, public_pem = generate_rsa_keypair()
    return jsonify({
        "privateKeyPem": private_pem,
        "publicKeyPem": public_pem,
    }), 200


@app.route("/api/embed", methods=["POST"])
def api_embed():
    """
    Encrypt + embed route.
    Expected form-data:
      - coverImage       (file)
      - secretImage      (file)
      - password         (string, optional: if empty we auto-generate)
      - email            (string, optional: stego receiver)
      - receiverPubKey   (string, optional: PEM text, used to RSA-encrypt key)
    """
    if "coverImage" not in request.files or "secretImage" not in request.files:
        return jsonify({"error": "coverImage and secretImage are required"}), 400

    cover_file = request.files["coverImage"]
    secret_file = request.files["secretImage"]
    password = request.form.get("password", "").strip()
    to_email = request.form.get("email", "").strip()
    receiver_pub_key = request.form.get("receiverPubKey", "").strip()
    bit_depth = int(request.form.get("bitDepth", 2))

    if not cover_file.filename or not secret_file.filename:
        return jsonify({"error": "Empty filename(s)"}), 400

    # If no password provided, auto-generate a random key (16 chars)
    if not password:
        password = secrets.token_urlsafe(12)  # ~16 printable chars

    cover_filename = secure_filename(cover_file.filename)
    secret_filename = secure_filename(secret_file.filename)

    cover_path = os.path.join(UPLOAD_FOLDER, cover_filename)
    secret_path = os.path.join(UPLOAD_FOLDER, secret_filename)

    cover_file.save(cover_path)
    secret_file.save(secret_path)

    stego_filename = f"stego_{os.path.splitext(cover_filename)[0]}.png"
    stego_path = os.path.join(OUTPUT_FOLDER, stego_filename)

    try:
        embed_secret_image(cover_path, secret_path, password, stego_path, bit_depth=bit_depth)
    except Exception as e:
        print("EMBED ERROR:", e)
        return jsonify({"error": f"Embedding failed: {e}"}), 500

    encrypted_key_b64 = None
    if receiver_pub_key:
        try:
            encrypted_key_b64 = encrypt_key_with_public_key(password, receiver_pub_key)
        except Exception as e:
            print("RSA ENCRYPT ERROR:", e)

    email_error = None
    if to_email:
        try:
            send_email_with_image_and_encrypted_key(
                to_email,
                "Your SecureStego image",
                "Attached is your stego image.\nUse your private key and the encrypted key to decrypt.",
                stego_path,
                encrypted_key=encrypted_key_b64,
            )
        except Exception as e:
            email_error = str(e)
            print("EMAIL ERROR:", e)

    response = {
        "message": "Embedding successful",
        "stegoImageUrl": f"/api/stego/{stego_filename}",
        "keyStrategy": "rsa_public_key",
        # Don't send plain password anymore in prod; for demo you could log it locally.
    }
    if encrypted_key_b64:
        response["encryptedKey"] = encrypted_key_b64
    if email_error:
        response["emailError"] = f"Image created but email send failed: {email_error}"

    return jsonify(response), 200


@app.route("/api/stego/<filename>", methods=["GET"])
def get_stego(filename):
    file_path = os.path.join(OUTPUT_FOLDER, secure_filename(filename))
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    return send_file(file_path, mimetype="image/png")


@app.route("/api/recover", methods=["POST"])
def api_recover():
    """
    Legacy/simple mode: user directly provides the password.
    Expected form-data:
      - stegoImage (file)
      - password   (string)
    """
    if "stegoImage" not in request.files:
        return jsonify({"error": "stegoImage is required"}), 400

    stego_file = request.files["stegoImage"]
    password = request.form.get("password", "")
    bit_depth = int(request.form.get("bitDepth", 2))

    if not stego_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    stego_filename = secure_filename(stego_file.filename)
    stego_path = os.path.join(UPLOAD_FOLDER, stego_filename)
    stego_file.save(stego_path)

    recovered_filename = f"recovered_{os.path.splitext(stego_filename)[0]}.png"
    recovered_path = os.path.join(OUTPUT_FOLDER, recovered_filename)

    try:
        extract_secret_image(stego_path, password, recovered_path, bit_depth=bit_depth)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 401
    except Exception as e:
        return jsonify({"error": f"Recovery failed: {e}"}), 500

    return jsonify({
        "message": "Recovery successful",
        "recoveredImageUrl": f"/api/recovered/{recovered_filename}",
    }), 200


@app.route("/api/recover-rsa", methods=["POST"])
def api_recover_rsa():
    """
    RSA-based secure recovery.
    Expected form-data:
      - stegoImage      (file)
      - encryptedKey    (string, base64 RSA-encrypted key from email)
      - privateKeyFile  (file, PEM)
    """
    if "stegoImage" not in request.files:
        return jsonify({"error": "stegoImage is required"}), 400
    if "privateKeyFile" not in request.files:
        return jsonify({"error": "privateKeyFile is required"}), 400

    encrypted_key_b64 = request.form.get("encryptedKey", "").strip()
    if not encrypted_key_b64:
        return jsonify({"error": "encryptedKey is required"}), 400

    stego_file = request.files["stegoImage"]
    priv_file = request.files["privateKeyFile"]

    if not stego_file.filename or not priv_file.filename:
        return jsonify({"error": "Empty filename(s)"}), 400

    stego_filename = secure_filename(stego_file.filename)
    stego_path = os.path.join(UPLOAD_FOLDER, stego_filename)
    stego_file.save(stego_path)

    private_pem = priv_file.read().decode("utf-8")

    bit_depth = int(request.form.get("bitDepth", 2))

    try:
        password = decrypt_key_with_private_key(encrypted_key_b64, private_pem)
    except Exception as e:
        print("RSA DECRYPT ERROR:", e)
        return jsonify({"error": f"Failed to decrypt key with private key: {e}"}), 401

    recovered_filename = f"recovered_{os.path.splitext(stego_filename)[0]}_rsa.png"
    recovered_path = os.path.join(OUTPUT_FOLDER, recovered_filename)

    try:
        extract_secret_image(stego_path, password, recovered_path, bit_depth=bit_depth)
    except Exception as e:
        return jsonify({"error": f"Recovery failed: {e}"}), 500

    return jsonify({
        "message": "RSA recovery successful",
        "recoveredImageUrl": f"/api/recovered/{recovered_filename}",
    }), 200


@app.route("/api/recovered/<filename>", methods=["GET"])
def get_recovered(filename):
    file_path = os.path.join(OUTPUT_FOLDER, secure_filename(filename))
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    return send_file(file_path, mimetype="image/png")


# ---------------------------------------------------------------
# Histogram endpoint — for cover vs stego visual comparison
# ---------------------------------------------------------------

@app.route("/api/histogram", methods=["POST"])
def api_histogram():
    """Compute RGB histogram for an uploaded image. Returns 256 bins per channel."""
    if "image" not in request.files:
        return jsonify({"error": "image file is required"}), 400

    img_file = request.files["image"]
    image_bytes = img_file.read()
    if not image_bytes:
        return jsonify({"error": "Empty file"}), 400

    try:
        hist = compute_histogram(image_bytes)
        return jsonify({"histogram": hist}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logging.error(f"Histogram computation failed: {e}")
        return jsonify({"error": "Failed to compute histogram"}), 500


# ---------------------------------------------------------------
# CLAHE Enhancement endpoint
# This must ONLY be used on images that have already been
# extracted from the stego container. Applying enhancement
# to a stego image before extraction would corrupt the LSB
# payload and destroy the hidden data.
# ---------------------------------------------------------------

ALLOWED_ENHANCE_EXTENSIONS = {".png", ".jpg", ".jpeg"}


@app.route("/api/enhance", methods=["POST"])
def api_enhance():
    """
    CLAHE-based image enhancement for recovered steganographic images.

    POST form-data:
      - image  (file, required): The recovered image to enhance (PNG or JPEG)
      - clipLimit     (float, optional): CLAHE clip limit, default 2.0
      - tileGridSize  (int, optional):   Grid tile size (square), default 8
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Please upload an image."}), 400

    img_file = request.files["image"]

    if not img_file.filename:
        return jsonify({"error": "Empty filename. Please select a valid image file."}), 400

    # Validate file extension
    ext = os.path.splitext(img_file.filename)[1].lower()
    if ext not in ALLOWED_ENHANCE_EXTENSIONS:
        return jsonify({
            "error": f"Unsupported format '{ext}'. Please upload a PNG or JPEG image."
        }), 400

    # Read image bytes
    image_bytes = img_file.read()
    if not image_bytes:
        return jsonify({"error": "Uploaded file is empty. Please upload a valid image."}), 400

    # Parse optional CLAHE parameters
    clip_limit = request.form.get("clipLimit", 2.0)
    tile_size = request.form.get("tileGridSize", 8)

    try:
        clip_limit = float(clip_limit)
        tile_size = int(tile_size)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid CLAHE parameters. clipLimit must be a number, tileGridSize must be an integer."}), 400

    try:
        enhanced_bytes = apply_clahe(
            image_bytes,
            clip_limit=clip_limit,
            tile_grid_size=(tile_size, tile_size),
        )
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except RuntimeError as re:
        logging.error(f"CLAHE enhancement failed: {re}")
        return jsonify({"error": "Enhancement processing failed. The image may be corrupted."}), 500
    except Exception as e:
        logging.error(f"Unexpected error in /api/enhance: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred during enhancement."}), 500

    # Save enhanced image and return URL
    safe_name = secure_filename(img_file.filename)
    enhanced_filename = f"enhanced_{os.path.splitext(safe_name)[0]}.png"
    enhanced_path = os.path.join(OUTPUT_FOLDER, enhanced_filename)

    with open(enhanced_path, "wb") as f:
        f.write(enhanced_bytes)

    return jsonify({
        "message": "CLAHE enhancement applied successfully",
        "enhancedImageUrl": f"/api/enhanced/{enhanced_filename}",
    }), 200


@app.route("/api/enhanced/<filename>", methods=["GET"])
def get_enhanced_image(filename):
    """Serve an enhanced image from the outputs folder."""
    file_path = os.path.join(OUTPUT_FOLDER, secure_filename(filename))
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    return send_file(file_path, mimetype="image/png")


@app.route("/api/psnr", methods=["POST"])
def api_psnr():
    """
    Compute PSNR between an original image and a recovered/enhanced image.

    POST form-data:
      - original  (file): The original secret image
      - compared  (file): The recovered or enhanced image to compare against
    """
    if "original" not in request.files or "compared" not in request.files:
        return jsonify({"error": "Both 'original' and 'compared' image files are required."}), 400

    orig_file = request.files["original"]
    comp_file = request.files["compared"]

    if not orig_file.filename or not comp_file.filename:
        return jsonify({"error": "Empty filename(s). Please select valid image files."}), 400

    orig_bytes = orig_file.read()
    comp_bytes = comp_file.read()

    if not orig_bytes or not comp_bytes:
        return jsonify({"error": "One or both uploaded files are empty."}), 400

    try:
        psnr_value = compute_psnr(orig_bytes, comp_bytes)
        return jsonify({
            "psnr": round(psnr_value, 4),
            "unit": "dB",
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logging.error(f"PSNR computation failed: {e}", exc_info=True)
        return jsonify({"error": "Failed to compute PSNR."}), 500


# Legacy AI-recover endpoint — now uses CLAHE instead of placeholder
@app.route("/api/ai-recover", methods=["POST"])
def api_ai_recover():
    if "image" not in request.files:
        return jsonify({"error": "image is required"}), 400

    img_file = request.files["image"]
    if not img_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    image_bytes = img_file.read()
    if not image_bytes:
        return jsonify({"error": "Empty file"}), 400

    try:
        enhanced_bytes = apply_clahe(image_bytes)
    except Exception as e:
        logging.error(f"AI recover (CLAHE) failed: {e}")
        return jsonify({"error": f"Enhancement failed: {e}"}), 500

    safe_name = secure_filename(img_file.filename)
    output_filename = f"ai_{os.path.splitext(safe_name)[0]}.png"
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    with open(output_path, "wb") as f:
        f.write(enhanced_bytes)

    return jsonify({
        "message": "CLAHE-based enhancement applied",
        "enhancedImageUrl": f"/api/ai-image/{output_filename}",
    }), 200


@app.route("/api/ai-image/<filename>", methods=["GET"])
def get_ai_image(filename):
    file_path = os.path.join(OUTPUT_FOLDER, secure_filename(filename))
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    return send_file(file_path, mimetype="image/png")


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "Backend running"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
