import { useState } from 'react';
import FileUpload from '../components/FileUpload';
import HistogramChart from '../components/HistogramChart';
import { Lock, Send, Download, CheckCircle, AlertCircle, Loader, RotateCcw, BarChart3 } from 'lucide-react';

interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
}

export default function Encrypt() {
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [secretImage, setSecretImage] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [receiverPublicKey, setReceiverPublicKey] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [secretPreview, setSecretPreview] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [stegoImage, setStegoImage] = useState('');
  const [encryptedKey, setEncryptedKey] = useState('');
  const [error, setError] = useState('');

  // Configurable bit depth (1-4 LSBs per channel)
  const [bitDepth, setBitDepth] = useState(2);

  // Histogram state
  const [coverHist, setCoverHist] = useState<HistogramData | null>(null);
  const [stegoHist, setStegoHist] = useState<HistogramData | null>(null);
  const [isLoadingHist, setIsLoadingHist] = useState(false);

  const handleCoverImage = (file: File) => {
    setCoverImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSecretImage = (file: File) => {
    setSecretImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setSecretPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const fetchHistograms = async (coverFile: File, stegoUrl: string) => {
    setIsLoadingHist(true);
    try {
      // Cover histogram
      const coverFd = new FormData();
      coverFd.append('image', coverFile);
      const coverRes = await fetch('/api/histogram', { method: 'POST', body: coverFd });
      const coverData = await coverRes.json();

      // Stego histogram
      const stegoBlob = await (await fetch(stegoUrl)).blob();
      const stegoFd = new FormData();
      stegoFd.append('image', stegoBlob, 'stego.png');
      const stegoRes = await fetch('/api/histogram', { method: 'POST', body: stegoFd });
      const stegoData = await stegoRes.json();

      if (coverRes.ok && stegoRes.ok) {
        setCoverHist(coverData.histogram);
        setStegoHist(stegoData.histogram);
      }
    } catch (err) {
      console.error('Histogram fetch error:', err);
    } finally {
      setIsLoadingHist(false);
    }
  };

  const handleEncrypt = async () => {
    if (!coverImage || !secretImage) {
      setError('Please upload both cover and secret images');
      return;
    }

    setIsProcessing(true);
    setError('');
    setStegoImage('');
    setEncryptedKey('');
    setCoverHist(null);
    setStegoHist(null);
    setProgress(0);
    setStatus('Preparing images...');

    const formData = new FormData();
    formData.append('coverImage', coverImage);
    formData.append('secretImage', secretImage);
    formData.append('bitDepth', bitDepth.toString());
    if (password) formData.append('password', password);
    if (email) formData.append('email', email);
    if (receiverPublicKey) formData.append('receiverPubKey', receiverPublicKey);

    try {
      setProgress(30);
      setStatus('Embedding secret image...');

      const response = await fetch('/api/embed', { method: 'POST', body: formData });
      setProgress(70);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Encryption failed');

      setStegoImage(data.stegoImageUrl || data.stegoImage || '');
      if (data.encryptedKey) setEncryptedKey(data.encryptedKey);

      setProgress(90);
      setStatus('Computing histograms...');

      // Fetch histograms for cover vs stego comparison
      if (coverImage && data.stegoImageUrl) {
        await fetchHistograms(coverImage, data.stegoImageUrl);
      }

      setProgress(100);

      if (email && data.emailError) {
        setStatus('Encryption complete, but email sending failed.');
        setError(data.emailError);
      } else if (email) {
        setStatus('Encryption complete! Email sent successfully.');
      } else {
        setStatus('Encryption complete!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during encryption');
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = stegoImage;
    link.download = 'stego-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setCoverImage(null);
    setSecretImage(null);
    setPassword('');
    setEmail('');
    setReceiverPublicKey('');
    setCoverPreview('');
    setSecretPreview('');
    setIsProcessing(false);
    setProgress(0);
    setStatus('');
    setStegoImage('');
    setEncryptedKey('');
    setError('');
    setBitDepth(2);
    setCoverHist(null);
    setStegoHist(null);
  };

  const bitDepthLabels: Record<number, string> = {
    1: '1 bit — Maximum stealth, low recovery quality',
    2: '2 bits — Balanced (recommended)',
    3: '3 bits — Good recovery, slightly visible',
    4: '4 bits — Best recovery, most visible changes',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-blue-100 dark:bg-blue-900 rounded-2xl mb-4">
            <Lock className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Encrypt &amp; Embed Image
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Hide your secret image inside a cover image with secure encryption
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <FileUpload label="Cover Image" onFileSelect={handleCoverImage} preview={coverPreview}
              onClear={() => { setCoverImage(null); setCoverPreview(''); }} />
            <FileUpload label="Secret Image" onFileSelect={handleSecretImage} preview={secretPreview}
              onClear={() => { setSecretImage(null); setSecretPreview(''); }} />
          </div>

          <div className="space-y-4 mb-6">
            {/* Bit Depth Slider */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Embedding Bit Depth
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range" min={1} max={4} step={1} value={bitDepth}
                  onChange={(e) => setBitDepth(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 w-12 text-center">
                  {bitDepth}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {bitDepthLabels[bitDepth]}
              </p>
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 px-0.5">
                <span>Stealth</span>
                <span>Quality</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter encryption password"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Recipient Email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Receiver Public Key (RSA, PEM) <span className="text-xs text-gray-500"></span>
              </label>
              <textarea value={receiverPublicKey} onChange={(e) => setReceiverPublicKey(e.target.value)}
                placeholder={`-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----`}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y min-h-[100px]" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Ask the receiver to share their RSA public key and paste it here. If left empty, only
                password-based mode is used.
              </p>
            </div>
          </div>

          {isProcessing && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{status}</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {status && !isProcessing && stegoImage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">{status}</p>
            </div>
          )}

          {encryptedKey && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                Encrypted decryption key (RSA, Base64)
              </p>
              <textarea readOnly
                className="w-full px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-900 dark:text-emerald-100 resize-y min-h-[80px]"
                value={encryptedKey} />
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                This key is encrypted with the receiver&apos;s public key. Only their private key can decrypt it.
              </p>
            </div>
          )}

          <button onClick={handleEncrypt} disabled={isProcessing || !coverImage || !secretImage}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg">
            {isProcessing ? (
              <><Loader className="h-5 w-5 animate-spin" /> Processing...</>
            ) : (
              <><Send className="h-5 w-5" /> {email ? 'Encrypt & Send via Email' : 'Encrypt & Embed'}</>
            )}
          </button>

          {stegoImage && (
            <div className="mt-8 space-y-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Encrypted Stego Image
              </h3>
              <img src={stegoImage} alt="Stego result"
                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700" />

              {/* Histogram Comparison */}
              {coverHist && stegoHist && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Histogram Analysis — Cover vs Stego
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Nearly identical histograms prove that the LSB embedding is visually imperceptible.
                    The stego image&apos;s color distribution closely matches the original cover image.
                  </p>
                  <HistogramChart coverHist={coverHist} stegoHist={stegoHist} />
                </div>
              )}

              {isLoadingHist && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader className="h-4 w-4 animate-spin" /> Computing histograms...
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button onClick={handleDownload}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg">
                  <Download className="h-5 w-5" /> Download Stego Image
                </button>
                <button onClick={handleReset}
                  className="w-full py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm">
                  <RotateCcw className="h-5 w-5" /> Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
