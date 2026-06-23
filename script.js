[...]
471|     closeBtn.onclick = () => document.body.removeChild(overlay);
[...]
597|   (function init(){
[...]
604|   })();
[...]

// --- Countdown + startTimer wrapper (append to end of script.js) ---
(function(){
  // Accessible countdown helper (only define if not already present)
  if (typeof window.showCountdown !== 'function') {
    window.showCountdown = function(seconds, onDone) {
      seconds = Number(seconds) || 5;
      const overlay = document.createElement('div');
      overlay.className = 'countdown-overlay';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');

      const box = document.createElement('div');
      box.className = 'countdown-box';

      const label = document.createElement('div');
      label.className = 'countdown-label';
      label.textContent = 'Starting in';

      const num = document.createElement('div');
      num.className = 'countdown-number';
      num.setAttribute('aria-live','assertive');
      num.textContent = String(seconds);

      box.appendChild(label);
      box.appendChild(num);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      let remaining = seconds;
      const iv = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(iv);
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          window.removeEventListener('keydown', onKey);
          onDone && onDone();
        } else {
          num.textContent = String(remaining);
        }
      }, 1000);

      // Escape to skip immediately
      function onKey(e){
        if (e.key === 'Escape') {
          clearInterval(iv);
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          window.removeEventListener('keydown', onKey);
          onDone && onDone();
        }
      }
      window.addEventListener('keydown', onKey);
    };
  }

  // Wrap startTimer globally so every call gets the countdown first.
  // Preserve original startTimer if present.
  function installWrapper() {
    if (window._origStartTimer) return; // already installed

    if (typeof window.startTimer === 'function') {
      window._origStartTimer = window.startTimer;
      window.startTimer = function(...args) {
        try {
          // If you want the countdown only for Round 2, change the condition:
          // if (typeof currentRound !== 'undefined' && currentRound === 2) { ... }
          // Default behaviour here: always show countdown unless explicitly bypassed.
          if (window._disableCountdown) {
            return window._origStartTimer.apply(this, args);
          }
          // show 5s countdown then call original startTimer
          window.showCountdown(5, () => {
            window._origStartTimer.apply(this, args);
          });
        } catch (err) {
          // on error fallback to original
          console.error('startTimer wrapper error:', err);
          return window._origStartTimer.apply(this, args);
        }
      };
      console.info('startTimer wrapped to show countdown before starting.');
    }
  }

  // If startTimer is defined already, install immediately; otherwise wait until DOM ready.
  if (typeof window.startTimer === 'function') {
    installWrapper();
  } else {
    // If startTimer will be defined later inside the existing script IIFE,
    // try to install after the IIFE runs (DOMContentLoaded) and once more on load.
    document.addEventListener('DOMContentLoaded', installWrapper);
    window.addEventListener('load', installWrapper);
    // also try a short interval in case startTimer is defined asynchronously
    const tryIv = setInterval(() => {
      if (typeof window.startTimer === 'function') {
        clearInterval(tryIv);
        installWrapper();
      }
    }, 250);
  }
})();
