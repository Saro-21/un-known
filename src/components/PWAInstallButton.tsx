import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share2, X, Check, ShieldCheck, Laptop } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

interface PWAInstallButtonProps {
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { theme } = useTheme();
  const [showGuide, setShowGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and launched from home screen / standalone app, display subtle installed indicator
  if (isInstalled) {
    return (
      <div
        id="top-right-install-btn"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold select-none transition-colors ${className}`}
        style={{
          backgroundColor: theme.bgElevated,
          borderColor: theme.borderSubtle,
          color: theme.statusSuccess,
        }}
        title="DrifX installed & running in standalone mode"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installed</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        id="top-right-install-btn"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap ${className}`}
        style={{
          backgroundColor: theme.accent,
          color: theme.textInverse,
        }}
        title="Install DrifX"
        aria-label="Install"
      >
        {installSuccess ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Installed</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </>
        )}
      </button>

      {/* In-app Install Guide Modal (safe for iframes) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl relative animate-in fade-in"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
              color: theme.textPrimary,
            }}
          >
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: theme.accentSubtle,
                  borderColor: theme.borderAccent,
                  color: theme.accentText,
                }}
              >
                {isIOS ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                  Install DrifX
                </h3>
                <p className="text-[11px]" style={{ color: theme.textSecondary }}>
                  Install for 100% offline navigation
                </p>
              </div>
            </div>

            {isIOS ? (
              <div
                className="space-y-2.5 text-xs my-4 p-3.5 rounded-xl border"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 bg-cyan-500/20 text-cyan-400">
                    1
                  </div>
                  <p>
                    Tap the <strong className="inline-flex items-center gap-1"><Share2 className="w-3 h-3 inline text-cyan-400" /> Share</strong> icon in Safari.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 bg-cyan-500/20 text-cyan-400">
                    2
                  </div>
                  <p>Scroll down and select <strong>Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 bg-cyan-500/20 text-cyan-400">
                    3
                  </div>
                  <p>Tap <strong>Add</strong> in the top right to complete installation.</p>
                </div>
              </div>
            ) : (
              <div
                className="space-y-2.5 text-xs my-4 p-3.5 rounded-xl border"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 bg-cyan-500/20 text-cyan-400">
                    1
                  </div>
                  <p>Look for the <strong>Install</strong> icon in your browser address bar or menu.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 bg-cyan-500/20 text-cyan-400">
                    2
                  </div>
                  <p>Click <strong>Install DrifX</strong> to add it to your device.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 bg-cyan-500/20 text-cyan-400">
                    3
                  </div>
                  <p>Once installed, launch it directly from your apps without an internet connection.</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
                color: theme.textPrimary,
                border: `1px solid ${theme.borderSubtle}`,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
