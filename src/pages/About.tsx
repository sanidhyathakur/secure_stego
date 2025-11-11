import { Shield, Image, Sparkles, Lock, Eye, Brain } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-blue-100 dark:bg-blue-900 rounded-2xl mb-4">
            <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            About SecureStego
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Advanced steganography meets artificial intelligence
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-xl">
                <Image className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  What is LSB Steganography?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Least Significant Bit (LSB) steganography is a technique that hides data within
                  digital images by modifying the least significant bits of pixel values. Since
                  these changes are minimal, they're imperceptible to the human eye.
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Our platform embeds your secret image into a cover image by replacing the LSBs
                  of the cover image's pixels with data from your secret image. The resulting
                  stego image looks identical to the original cover image but contains hidden
                  information.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-xl">
                <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  AI-Enhanced Recovery
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Traditional steganography extraction can sometimes result in minor quality loss
                  or artifacts. Our AI-enhanced recovery system uses advanced neural networks to:
                </p>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Restore image clarity and sharpness after extraction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Remove compression artifacts and noise</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Enhance color accuracy and contrast</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Ensure pixel-perfect recovery of your secret images</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-xl">
                <Lock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Security Features
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Your data security is our top priority. SecureStego implements multiple layers
                  of protection:
                </p>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <Lock className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Password Encryption:</strong> Optional password protection with
                      industry-standard encryption algorithms
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Eye className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Visual Imperceptibility:</strong> Hidden images remain completely
                      invisible to observers
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Secure Transfer:</strong> SMTP-based encrypted email delivery for
                      safe transmission
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Upload Images
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Select a cover image and the secret image you want to hide
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Encrypt & Embed
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Our system encrypts and embeds your secret image into the cover image using LSB
                    steganography
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Share Securely
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Download or send the stego image via encrypted email to your recipient
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    AI-Enhanced Recovery
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Recipient uploads the stego image and recovers the secret with AI enhancement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
