import { Shield, Lock, Image, Sparkles, ArrowRight } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8 animate-fade-in">
          <div className="inline-block p-3 bg-blue-100 dark:bg-blue-900 rounded-2xl mb-4">
            <Shield className="h-16 w-16 text-blue-600 dark:text-blue-400" />
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
            Secure Image Steganography
          </h1>

          <p className="text-2xl sm:text-3xl text-blue-600 dark:text-blue-400 font-semibold">
            Encrypt. Embed. Recover — Securely with AI.
          </p>

          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Hide sensitive images inside ordinary photos with military-grade encryption.
            Our AI-enhanced recovery system ensures perfect extraction every time,
            while maintaining complete invisibility to the human eye.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <button
              onClick={() => onNavigate('encrypt')}
              className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all hover:scale-105 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              Get Started
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('about')}
              className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold text-lg transition-all hover:scale-105 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              Learn More
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="bg-blue-100 dark:bg-blue-900 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Lock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Military-Grade Security
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your secret images are protected with advanced encryption algorithms before embedding,
              ensuring complete confidentiality.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="bg-green-100 dark:bg-green-900 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Image className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Invisible Embedding
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Using LSB steganography, your hidden images remain completely undetectable
              to the human eye while maintaining original quality.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="bg-purple-100 dark:bg-purple-900 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              AI-Enhanced Recovery
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Our advanced AI algorithms ensure perfect extraction and enhancement of your
              hidden images with crystal-clear clarity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
