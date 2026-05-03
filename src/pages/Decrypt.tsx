import { useState } from 'react';
import FileUpload from '../components/FileUpload';
import { Unlock, Sparkles, CheckCircle, AlertCircle, Loader, ArrowRight, Download, BarChart3, Zap } from 'lucide-react';

type DecryptMode = 'password' | 'rsa';

export default function Decrypt() {
  const [stegoImage, setStegoImage] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [stegoPreview, setStegoPreview] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [recoveredImageUrl, setRecoveredImageUrl] = useState('');
  const [error, setError] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  // Mode + RSA fields
  const [mode, setMode] = useState<DecryptMode>('password');
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [encryptedKey, setEncryptedKey] = useState('');

  // CLAHE enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedImageUrl, setEnhancedImageUrl] = useState('');
  const [enhanceError, setEnhanceError] = useState('');

  // PSNR state
  const [originalSecretFile, setOriginalSecretFile] = useState<File | null>(null);
  const [psnrRaw, setPsnrRaw] = useState<number | null>(null);
  const [psnrEnhanced, setPsnrEnhanced] = useState<number | null>(null);
  const [isComputingPsnr, setIsComputingPsnr] = useState(false);

  const handleStegoImage = (file: File) => {
    setStegoImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setStegoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDecrypt = async () => {
    if (!stegoImage) { setError('Please upload a stego image'); return; }
    if (mode === 'password' && !password) { setError('Please enter the decryption password (or use RSA mode).'); return; }
    if (mode === 'rsa') {
      if (!privateKeyFile) { setError('Please upload your RSA private key (.pem file).'); return; }
      if (!encryptedKey.trim()) { setError('Please paste the encrypted key you received (Base64 string).'); return; }
    }

    setIsProcessing(true);
    setError('');
    setRecoveredImageUrl('');
    setEnhancedImageUrl('');
    setEnhanceError('');
    setShowComparison(false);
    setPsnrRaw(null);
    setPsnrEnhanced(null);
    setStatus('Analyzing stego image...');

    const formData = new FormData();
    formData.append('stegoImage', stegoImage);
    let endpoint = '/api/recover';

    if (mode === 'password') {
      formData.append('password', password);
    } else {
      formData.append('privateKeyFile', privateKeyFile as File);
      formData.append('encryptedKey', encryptedKey.trim());
      endpoint = '/api/recover-rsa';
    }

    try {
      await new Promise((r) => setTimeout(r, 600));
      setStatus('Extracting hidden image...');

      const response = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Decryption failed. Please check your inputs.');

      setStatus('Recovery complete!');
      setRecoveredImageUrl(data.recoveredImageUrl);
      setShowComparison(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during decryption');
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  /** Send recovered image to /api/enhance for CLAHE processing */
  const handleEnhance = async () => {
    if (!recoveredImageUrl) return;
    setIsEnhancing(true);
    setEnhanceError('');

    try {
      // Fetch the recovered image as a blob, then send to /api/enhance
      const imgRes = await fetch(recoveredImageUrl);
      const blob = await imgRes.blob();

      const formData = new FormData();
      formData.append('image', blob, 'recovered.png');

      const res = await fetch('/api/enhance', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Enhancement failed');

      setEnhancedImageUrl(data.enhancedImageUrl);
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  /** Compute PSNR between original secret and recovered / enhanced images */
  const handleComputePsnr = async () => {
    if (!originalSecretFile || !recoveredImageUrl) return;
    setIsComputingPsnr(true);
    setPsnrRaw(null);
    setPsnrEnhanced(null);

    try {
      // Fetch recovered image blob
      const rawBlob = await (await fetch(recoveredImageUrl)).blob();

      // PSNR: original vs raw recovered
      const fd1 = new FormData();
      fd1.append('original', originalSecretFile);
      fd1.append('compared', rawBlob, 'recovered.png');
      const r1 = await fetch('/api/psnr', { method: 'POST', body: fd1 });
      const d1 = await r1.json();
      if (r1.ok) setPsnrRaw(d1.psnr);

      // PSNR: original vs enhanced (if available)
      if (enhancedImageUrl) {
        const enhBlob = await (await fetch(enhancedImageUrl)).blob();
        const fd2 = new FormData();
        fd2.append('original', originalSecretFile);
        fd2.append('compared', enhBlob, 'enhanced.png');
        const r2 = await fetch('/api/psnr', { method: 'POST', body: fd2 });
        const d2 = await r2.json();
        if (r2.ok) setPsnrEnhanced(d2.psnr);
      }
    } catch (err) {
      console.error('PSNR computation error:', err);
    } finally {
      setIsComputingPsnr(false);
    }
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetAll = () => {
    setStegoImage(null);
    setStegoPreview('');
    setRecoveredImageUrl('');
    setShowComparison(false);
    setStatus('');
    setError('');
    setPassword('');
    setPrivateKeyFile(null);
    setEncryptedKey('');
    setEnhancedImageUrl('');
    setEnhanceError('');
    setOriginalSecretFile(null);
    setPsnrRaw(null);
    setPsnrEnhanced(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-green-100 dark:bg-green-900 rounded-2xl mb-4">
            <Unlock className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Decrypt &amp; Recover Image
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Extract hidden images with optional CLAHE enhancement
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Mode toggle */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('password')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${mode === 'password' ? 'bg-green-600 text-white border-green-600 shadow' : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}>
                Password mode
              </button>
              <button type="button" onClick={() => setMode('rsa')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${mode === 'rsa' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}>
                RSA secure mode
              </button>
            </div>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {mode === 'password'
                ? 'Use the same password that was set during encryption.'
                : 'Use your private key + encrypted key (safer – the password never travels in plain text).'}
            </p>
          </div>

          <div className="mb-6">
            <FileUpload label="Stego Image" onFileSelect={handleStegoImage} preview={stegoPreview} onClear={resetAll} />
          </div>

          {/* Mode-specific inputs */}
          {mode === 'password' && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter decryption password"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" />
            </div>
          )}

          {mode === 'rsa' && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Encrypted Key (Base64)</label>
                <textarea value={encryptedKey} onChange={(e) => setEncryptedKey(e.target.value)}
                  placeholder="Paste the encrypted key you received in the email or from the sender"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y min-h-[90px]" />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This is the long Base64 string that was generated during encryption and sent to you.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Private Key (.pem)</label>
                <input type="file" accept=".pem" onChange={(e) => setPrivateKeyFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/40 dark:file:text-blue-200 dark:hover:file:bg-blue-900/70" />
                {privateKeyFile && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Selected: <span className="font-mono">{privateKeyFile.name}</span></p>}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This key should be kept secret. It never leaves your device except for this secure decryption step.</p>
              </div>
            </div>
          )}

          {/* Status indicators */}
          {isProcessing && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Loader className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{status}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {status && !isProcessing && recoveredImageUrl && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">{status}</p>
            </div>
          )}

          <button onClick={handleDecrypt} disabled={isProcessing || !stegoImage}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg">
            {isProcessing ? (<><Loader className="h-5 w-5 animate-spin" /> Processing...</>) : (<><Unlock className="h-5 w-5" /> Recover Hidden Image</>)}
          </button>

          {/* ===== Results Section ===== */}
          {showComparison && recoveredImageUrl && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Recovery Result
                </h3>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600" />
              </div>

              {/* Image comparison grid */}
              <div className={`grid gap-6 ${enhancedImageUrl ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {/* Stego input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Stego Image</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Input</span>
                  </div>
                  <img src={stegoPreview} alt="Stego" className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg" />
                </div>

                {/* Raw recovered */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Raw Recovered</h4>
                    <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-2 py-1 rounded">Extracted</span>
                  </div>
                  <img src={recoveredImageUrl} alt="Recovered" className="w-full rounded-xl border-2 border-orange-400 dark:border-orange-500 shadow-lg" />
                  <button onClick={() => handleDownload(recoveredImageUrl, 'recovered-image.png')}
                    className="w-full py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" /> Download Raw
                  </button>
                </div>

                {/* Enhanced (only shown after enhancement) */}
                {enhancedImageUrl && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">CLAHE Enhanced</h4>
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Enhanced
                      </span>
                    </div>
                    <div className="relative">
                      <img src={enhancedImageUrl} alt="Enhanced" className="w-full rounded-xl border-2 border-green-500 dark:border-green-400 shadow-lg shadow-green-500/20" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 to-purple-500/5 rounded-xl pointer-events-none" />
                    </div>
                    <button onClick={() => handleDownload(enhancedImageUrl, 'enhanced-image.png')}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                      <Download className="h-4 w-4" /> Download Enhanced
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 md:hidden" />
              </div>

              {/* Enhance button — only shown before enhancement */}
              {!enhancedImageUrl && (
                <button onClick={handleEnhance} disabled={isEnhancing}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg">
                  {isEnhancing ? (<><Loader className="h-5 w-5 animate-spin" /> Enhancing...</>) : (<><Zap className="h-5 w-5" /> Enhance with CLAHE (Optional)</>)}
                </button>
              )}

              {enhanceError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{enhanceError}</p>
                </div>
              )}

              {/* PSNR Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  PSNR Quality Metrics
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Upload the original secret image to compute Peak Signal-to-Noise Ratio (dB). Higher PSNR = closer to original.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Original Secret Image</label>
                  <input type="file" accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => { setOriginalSecretFile(e.target.files?.[0] || null); setPsnrRaw(null); setPsnrEnhanced(null); }}
                    className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-200" />
                </div>

                <button onClick={handleComputePsnr} disabled={!originalSecretFile || isComputingPsnr}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
                  {isComputingPsnr ? (<><Loader className="h-4 w-4 animate-spin" /> Computing...</>) : (<><BarChart3 className="h-4 w-4" /> Compute PSNR</>)}
                </button>

                {(psnrRaw !== null || psnrEnhanced !== null) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {psnrRaw !== null && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Raw Recovered vs Original</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{psnrRaw.toFixed(2)} <span className="text-sm font-normal">dB</span></p>
                      </div>
                    )}
                    {psnrEnhanced !== null && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CLAHE Enhanced vs Original</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{psnrEnhanced.toFixed(2)} <span className="text-sm font-normal">dB</span></p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <p className="text-sm text-center text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">CLAHE Enhancement:</span> Contrast Limited Adaptive Histogram Equalization improves localized contrast in the LAB color space without distorting colors — ideal for recovering washed-out steganographic images.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
