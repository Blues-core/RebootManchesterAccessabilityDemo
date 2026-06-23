(function(){
  // Accessible countdown overlay and startTimer wrapper
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'countdown-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(2,6,23,0.6)';
    overlay.style.zIndex = '10010';

    const box = document.createElement('div');
    box.className = 'countdown-box';
    box.style.background = '#111';
    box.style.color = '#fff';
    box.style.padding = '22px 28px';
    box.style.borderRadius = '12px';
    box.style.textAlign = 'center';
    box.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';

    const label = document.createElement('div');
    label.className = 'countdown-label';
    label.textContent = 'Question starts in';
    label.style.fontSize = '0.95rem';
    label.style.opacity = '0.95';
    label.style.marginBottom = '6px';

    const number = document.createElement('div');
    number.className = 'countdown-number';
    number.style.fontSize = '64px';
    number.style.fontWeight = '700';
    number.style.lineHeight = '1';
    number.style.letterSpacing = '-1px';
    number.setAttribute('aria-live','assertive');
    number.setAttribute('aria-atomic','true');

    box.appendChild(label);
    box.appendChild(number);
    overlay.appendChild(box);

    return {overlay, number};
  }

  function showCountdown(seconds, onComplete) {
    if (typeof seconds !== 'number' || seconds <= 0) {
      onComplete && onComplete();
      return;
    }

    // Prevent multiple overlays
    if (document.querySelector('.countdown-overlay')) {
      onComplete && onComplete();
      return;
    }

    const {overlay, number} = createOverlay();
    number.textContent = String(seconds);

    // Append and focus for screen readers
    document.body.appendChild(overlay);
    // Move focus into the overlay for keyboard users
    overlay.tabIndex = -1;
    overlay.focus({preventScroll:true});

    let remaining = seconds;
    let cancelled = false;

    function cleanup() {
      try { document.body.removeChild(overlay); } catch(e){}
      document.removeEventListener('keydown', onKeydown);
    }

    function tick() {
      remaining -= 1;
      if (remaining > 0) {
        number.textContent = String(remaining);
      } else {
        cleanup();
        onComplete && onComplete();
      }
    }

    function onKeydown(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        cancelled = true;
        cleanup();
        onComplete && onComplete();
      }
    }

    document.addEventListener('keydown', onKeydown);
    // Use setInterval for visible countdown; ensure final state triggers onComplete
    const id = setInterval(function(){
      if (cancelled) { clearInterval(id); return; }
      tick();
      if (remaining <= 0) { clearInterval(id); }
    }, 1000);
  }

  // Expose for debugging/testing
  window.showCountdown = showCountdown;

  function wrapStartTimer() {
    try {
      if (!window.startTimer) return false;
      if (window._origStartTimer) return true; // already wrapped

      window._origStartTimer = window.startTimer;

      window.startTimer = function(){
        const args = arguments;
        // Show countdown before starting timer. Change the seconds here if needed.
        showCountdown(5, function(){
          try { window._origStartTimer.apply(this, args); }
          catch(e){ console.error('Error running original startTimer', e); }
        });
      };

      console.info('startTimer wrapped to show countdown before starting.');
      return true;
    } catch (e) {
      console.error('Failed to wrap startTimer', e);
      return false;
    }
  }

  // Attempt to wrap immediately, on DOMContentLoaded, and via a short polling fallback
  if (!wrapStartTimer()) {
    document.addEventListener('DOMContentLoaded', function(){ wrapStartTimer(); });
    // As a last resort, poll a short while for dynamically defined startTimer
    const poll = setInterval(function(){
      if (wrapStartTimer()) { clearInterval(poll); }
    }, 250);
    // Stop polling after 10s
    setTimeout(function(){ clearInterval(poll); }, 10000);
  }

})();
