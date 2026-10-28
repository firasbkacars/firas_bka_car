import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import i18n from '../i18n';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
              {i18n.t('errorBoundary.titre')}
            </h1>
            <p className="text-muted text-sm mb-8">
              {i18n.t('errorBoundary.description')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <RotateCcw size={16} />
                {i18n.t('errorBoundary.reessayer')}
              </button>
              <a
                href="/"
                className="flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {i18n.t('errorBoundary.accueil')}
              </a>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-8 text-left text-xs text-red-400/70 bg-black/40 rounded-lg p-4 overflow-auto max-h-48">
                {String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
