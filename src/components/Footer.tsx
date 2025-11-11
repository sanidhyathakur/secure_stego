import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Secure Image Steganography with AI-Enhanced Recovery
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Built with modern web technologies
          </div>
        </div>
      </div>
    </footer>
  );
}
