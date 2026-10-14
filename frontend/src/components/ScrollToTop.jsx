import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Skip the initial mount: only move focus after a real navigation.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // WCAG: move focus to the main content region after a route change so
    // screen-reader / keyboard users land on the new page instead of the top
    // of the document where focus was lost.
    const main = document.getElementById('main-content');
    if (main) main.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
