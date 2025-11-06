import React from 'react';
import YouTubeEmbed from './components/YouTubeEmbed';

function App() {
  return (
    <div className="bg-gradient-to-b from-[#200000] via-black to-[#0a0a0a] text-gray-100 font-sans">
      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-red-900/40">
        <div className="flex items-center space-x-3">
          <img src="/icons/ward-shield.png" alt="Ward Logo" className="w-10 h-10" />
          <span className="text-xl font-semibold text-white tracking-wide">Ward</span>
        </div>
        <div className="flex items-center space-x-6">
          <a href="#demo" className="text-gray-300 hover:text-white transition">Demo</a>
          <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
          <a
            href="https://github.com/cjfit/ward"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition"
          >
            <svg className="w-5 h-5 fill-gray-300" viewBox="0 0 24 24">
              <path d="M12 .5C5.7.5.7 5.5.7 11.9c0 5 3.3 9.2 7.8 10.7.6.1.8-.3.8-.6v-2c-3.1.7-3.8-1.5-3.8-1.5-.5-1.3-1.2-1.7-1.2-1.7-1-.6.1-.6.1-.6 1.1.1 1.7 1.1 1.7 1.1 1 .1.7 1.9 2.8 1.3v-1.8c-2.5-.3-5-1.3-5-5.9 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.2 1.2a10.7 10.7 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.7.2 2.9.1 3.2.7.8 1.2 1.8 1.2 3.1 0 4.6-2.6 5.6-5.1 5.9v1.9c0 .3.2.7.8.6a11.2 11.2 0 0 0 7.8-10.7C23.3 5.5 18.3.5 12 .5z"/>
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="text-center py-20 px-6 max-w-4xl mx-auto">
        <img src="/icons/ward-shield.png" alt="Ward Shield" className="mx-auto w-24 h-24 mb-6 drop-shadow-lg" />
        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Protect yourself from phishing, scams, and online threats.
        </h1>
        <p className="text-gray-300 mt-4 text-lg">
          Ward is your personal AI security guard for Chrome.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center mt-8 gap-4">
          <a href="https://chrome.google.com/webstore" className="inline-block transition">
            <img src="/site-content/chrome-web-store-cropped.png" alt="Chrome Web Store" className="h-12 rounded-lg hover:opacity-90"/>
          </a>
          <a
            href="https://github.com/cjfit/ward"
            className="border border-gray-700 hover:bg-gray-800 text-gray-200 px-6 py-3 rounded-lg font-semibold transition"
          >
            View on GitHub
          </a>
        </div>
        <p className="text-sm text-gray-400 mt-4">Backed by open source • Runs fully on-device</p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 px-8 max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-10">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="text-red-500 text-4xl">🛡️</div>
            <h3 className="text-xl font-semibold">Install Ward</h3>
            <p className="text-gray-400">Download from Chrome Web Store or load unpacked.</p>
          </div>
          <div className="space-y-3">
            <div className="text-red-500 text-4xl">🌐</div>
            <h3 className="text-xl font-semibold">Browse the Web</h3>
            <p className="text-gray-400">Ward automatically scans pages for scams and phishing.</p>
          </div>
          <div className="space-y-3">
            <div className="text-red-500 text-4xl">✅</div>
            <h3 className="text-xl font-semibold">Stay Protected</h3>
            <p className="text-gray-400">Instant AI analysis — zero data leaves your device.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Feature Highlights</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 text-center">
          <div><h3 className="text-lg font-semibold text-white">On-Device AI Detection</h3></div>
          <div><h3 className="text-lg font-semibold text-white">Real-Time Scanning</h3></div>
          <div><h3 className="text-lg font-semibold text-white">Visual Warnings</h3></div>
          <div><h3 className="text-lg font-semibold text-white">Brand Impersonation Detection</h3></div>
          <div><h3 className="text-lg font-semibold text-white">Zero Server Requests</h3></div>
          <div><h3 className="text-lg font-semibold text-white">Email Client Protection</h3></div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="py-20 px-6 text-center bg-gradient-to-b from-[#1a0000] to-black">
        <h2 className="text-3xl font-bold text-white mb-6">See Ward in action</h2>
        <div className="flex justify-center">
          <YouTubeEmbed videoId="Br_3D5ZlGkk" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-10 border-t border-red-900/40 text-gray-400 text-sm">
        <p>© 2025 Ward — AGPL-3.0 License</p>
        <p className="mt-2">Privacy First · On-Device AI · Open Source</p>
      </footer>
    </div>
  );
}

export default App;
