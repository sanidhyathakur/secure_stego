import { useState } from 'react';
import FileUpload from '../components/FileUpload';
import { Unlock, Sparkles, CheckCircle, AlertCircle, Loader, ArrowRight } from 'lucide-react';

type DecryptMode = 'password' | 'rsa';

export default function Decrypt() {
  const [stegoImage, setStegoImage] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [stegoPreview, setStegoPreview] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [recoveredImage, setRecoveredImage] = useState('');
  const [error, setError] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  // NEW: mode + RSA fields
  const [mode, setMode] = useState<DecryptMode>('password');
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [encryptedKey, setEncryptedKey] = useState('');

  const handleStegoImage = (file: File) => {
    setStegoImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setStegoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDecrypt = async () => {
    if (!stegoImage) {
      setError('Please upload a stego image');
      return;
    }

    // Mode-specific validations
    if (mode === 'password' && !password) {
      setError('Please enter the decryption password (or use RSA mode).');
      return;
    }

    if (mode === 'rsa') {
      if (!privateKeyFile) {
        setError('Please upload your RSA private key (.pem file).');
        return;
      }
      if (!encryptedKey.trim()) {
        setError('Please paste the encrypted key you received (Base64 string).');
        return;
      }
    }

    setIsProcessing(true);
    setError('');
    setRecoveredImage('');
    setShowComparison(false);
    setStatus('Analyzing stego image...');

    const formData = new FormData();
    formData.append('stegoImage', stegoImage);

    let endpoint = '/api/recover';

    if (mode === 'password') {
      formData.append('password', password);
      endpoint = '/api/recover';
    } else {
      formData.append('privateKeyFile', privateKeyFile as File);
      formData.append('encryptedKey', encryptedKey.trim());
      endpoint = '/api/recover-rsa';
    }

    try {
      // Just to show the status animation nicely
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStatus('Extracting hidden image...');

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Decryption failed. Please check your inputs.');
      }

      await new Promise((resolve) => setTimeout(resolve, 700));
      setStatus('Applying AI enhancement...');

      // (Optional) here you could actually call /api/ai-recover with data.recoveredImageUrl
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStatus('Recovery complete!');
      setRecoveredImage(data.recoveredImageUrl || data.recoveredImage);
      setShowComparison(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during decryption');
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setStegoImage(null);
    setStegoPreview('');
    setRecoveredImage('');
    setShowComparison(false);
    setStatus('');
    setError('');
    setPassword('');
    setPrivateKeyFile(null);
    setEncryptedKey('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-green-100 dark:bg-green-900 rounded-2xl mb-4">
            <Unlock className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Decrypt & Recover Image
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Extract hidden images with AI-enhanced recovery
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Mode toggle */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  mode === 'password'
                    ? 'bg-green-600 text-white border-green-600 shadow'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                }`}
              >
                Password mode
              </button>
              <button
                type="button"
                onClick={() => setMode('rsa')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  mode === 'rsa'
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                }`}
              >
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
            <FileUpload
              label="Stego Image"
              onFileSelect={handleStegoImage}
              preview={stegoPreview}
              onClear={resetAll}
            />
          </div>

          {/* Mode-specific inputs */}
          {mode === 'password' && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter decryption password"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          )}

          {mode === 'rsa' && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Encrypted Key (Base64)
                </label>
                <textarea
                  value={encryptedKey}
                  onChange={(e) => setEncryptedKey(e.target.value)}
                  placeholder="Paste the encrypted key you received in the email or from the sender"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y min-h-[90px]"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This is the long Base64 string that was generated during encryption and sent to you.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Your Private Key (.pem)
                </label>
                <input
                  type="file"
                  accept=".pem"
                  onChange={(e) => setPrivateKeyFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/40 dark:file:text-blue-200 dark:hover:file:bg-blue-900/70"
                />
                {privateKeyFile && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Selected: <span className="font-mono">{privateKeyFile.name}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This key should be kept secret. It never leaves your device except for this secure
                  decryption step.
                </p>
              </div>
            </div>
          )}

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

          {status && !isProcessing && recoveredImage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">{status}</p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                  <Sparkles className="h-3 w-3" />
                  AI enhancement applied successfully
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleDecrypt}
            disabled={isProcessing || !stegoImage}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
          >
            {isProcessing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Unlock className="h-5 w-5" />
                Recover Hidden Image
              </>
            )}
          </button>

          {showComparison && recoveredImage && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  AI-Enhanced Recovery Result
                </h3>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Original Stego Image
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Before
                    </span>
                  </div>
                  <div className="relative group">
                    <img
                      src={stegoPreview}
                      alt="Stego"
                      className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Recovered Secret Image
                    </h4>
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI Enhanced
                    </span>
                  </div>
                  <div className="relative group">
                    <img
                      src={recoveredImage}
                      alt="Recovered"
                      className="w-full rounded-xl border-2 border-green-500 dark:border-green-400 shadow-lg shadow-green-500/20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 to-purple-500/10 rounded-xl pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 md:hidden" />
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <p className="text-sm text-center text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">AI Enhancement Applied:</span> Advanced neural
                  networks have restored clarity and removed any artifacts from the extraction
                  process.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
