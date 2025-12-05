 Secure Image Steganography System
Stego Encryption + RSA Secure Key Exchange + SMTP Delivery

This project is a secure image steganography system that hides a secret image inside a cover image, protects the decryption key using RSA public-key encryption, and delivers the stego image by email. The receiver can decrypt the hidden image using either a password or their private key for improved security.

Features
1. Secure Image Embedding

Embed a secret image inside a cover image using LSB (Least Significant Bit) steganography.

Supports:

.Password-based encryption, or
.RSA public-key encrypted key exchange (recommended)

2. RSA Secure Key Exchange


.Sender pastes the receiver’s public key
.Backend encrypts the stego password using RSA-OAEP
.Encrypted key is shown in the UI and can be emailed
.Receiver decrypts using their private key

Benefit:
The decryption key never travels in plain text, providing strong confidentiality.

3. SMTP Email Delivery

The system can send:

.Stego image (as attachment)
.RSA-encrypted decryption key
.via Gmail SMTP using App Password authentication.

4. Dual Decryption Modes

.Two fully supported recovery paths:
.Password Mode
.Simple and fast
.Receiver manually enters the password
.RSA Secure Mode
.Receiver uploads their private key (.pem)
.Pastes the RSA-encrypted key
.System decrypts securely

5. Modern User Interface

.Developed using React and TailwindCSS:
.Drag-and-drop file uploads
.Real-time image previews
.Encryption progress bar
.Status messages
.Clean, responsive design

📦 Tech Stack
Frontend
.React
.TypeScript
.TailwindCSS
.Lucide Icons
.Vite

Backend

.Python
.Flask
.Pillow (image handling)

Cryptography
.RSA encryption/decryption
.SMTP (email sending)

How It Works (Step-by-Step)
1. Start the Backend

cd backend
python app.py


Runs the Flask server at http://localhost:5000

2. Start the Frontend
npm install
npm run dev


Runs the React interface at http://localhost:5173

3. Choose Cover & Secret Images

On the Encrypt page:

Upload Cover Image (host)

Upload Secret Image (hidden image)

System shows previews instantly.

4. Select Encryption Mode
Option A – Password Mode

User enters a password (or backend auto-generates it)

Password is used to encrypt the hidden image

Option B – RSA Mode (Recommended)

Receiver shares their public key

Sender pastes it into the Encrypt page

Backend encrypts the stego password using RSA-OAEP

Result: only the receiver with the private key can decrypt.

5. Encrypt & Send

Click Encrypt & Send via Email (or just Encrypt & Embed).

Backend will:

Embed the secret image into the cover

Protect the decryption key

Password mode: plain password

RSA mode: encrypted password

Send stego image + encrypted key by email

Return preview + download link

6. Receiver Decrypts the Image
Password Mode

Receiver:

Uploads the stego image

Enters the password

Clicks Recover Hidden Image

RSA Mode

Receiver:

Uploads stego image

Uploads private key (.pem)

Pastes RSA encrypted key

System decrypts → recovers hidden image


Future Scope
1. CLAHE Image Enhancement Integration

Add automatic or optional CLAHE (Contrast Limited Adaptive Histogram Equalization) to improve:

Low contrast recovered images

Edge clarity

Readability of diagrams or text

2. Deep Learning Based Enhancement

Integrate:

DnCNN

ESRGAN

Super-resolution models
for higher quality recovery.

3. QR-Code Based Key Exchange

Store encrypted keys in QR format to simplify receiver workflow.

4. Support for Video Steganography

Extend LSB/RSA pipeline to video frames.

5. Tamper Detection

Add hashing or digital signatures to ensure image integrity.
