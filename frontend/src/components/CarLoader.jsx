import { useState, useEffect } from 'react';

export default function CarLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setFadeOut(true);
          setTimeout(() => onComplete?.(), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative w-64 h-32 mb-8">
        <div className="absolute bottom-6 left-0 right-0 h-[2px] bg-white/10">
          <div
            className="h-full bg-[#dc2626] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="absolute bottom-[22px] left-0 right-0 flex gap-3 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-8 h-[2px] bg-white/20 shrink-0"
              style={{
                animation: `moveDash 0.8s linear infinite`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>

        <svg
          viewBox="0 0 120 50"
          className="absolute bottom-8 w-28"
          style={{
            left: `calc(${Math.min(progress, 95)}% - 56px)`,
            transition: 'left 0.1s ease-out'
          }}
        >
          <path d="M15 35 L20 20 L35 12 L85 12 L100 20 L105 35 Z" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
          <path d="M30 20 L40 10 L75 10 L85 20" fill="none" stroke="#b91c1c" strokeWidth="1.5" />
          <path d="M35 19 L42 12 L58 12 L58 19 Z" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
          <path d="M61 19 L61 12 L77 12 L82 19 Z" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
          <rect x="98" y="24" width="6" height="4" rx="1" fill="#fbbf24" />
          <rect x="14" y="24" width="5" height="4" rx="1" fill="#ef4444" />
          <circle cx="32" cy="38" r="7" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <circle cx="32" cy="38" r="4" fill="#333" />
          <circle cx="32" cy="38" r="1.5" fill="#666" />
          <circle cx="88" cy="38" r="7" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <circle cx="88" cy="38" r="4" fill="#333" />
          <circle cx="88" cy="38" r="1.5" fill="#666" />
        </svg>

        {progress > 10 && (
          <div className="absolute bottom-10 left-4 flex flex-col gap-1.5 opacity-40">
            <div className="w-6 h-[1px] bg-[#dc2626] animate-pulse" style={{ animationDuration: '0.3s' }} />
            <div className="w-10 h-[1px] bg-[#dc2626] animate-pulse" style={{ animationDuration: '0.4s' }} />
            <div className="w-4 h-[1px] bg-[#dc2626] animate-pulse" style={{ animationDuration: '0.35s' }} />
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        <span className="text-white">FIRAS </span>
        <span className="text-[#dc2626]">BKA</span>
        <span className="text-white ml-1">CAR</span>
      </h1>

      <style>{`
        @keyframes moveDash {
          from { transform: translateX(0); }
          to { transform: translateX(-44px); }
        }
      `}</style>
    </div>
  );
}
