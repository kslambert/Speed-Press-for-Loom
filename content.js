(() => {
  'use strict';

  // --- State ---
  let video = null;
  let state = 'IDLE'; // IDLE | PENDING | BOOSTING
  let longPressTimer = null;
  let originalPlaybackRate = 1.0;
  let boostSpeed = 3.0;
  let domObserver = null;
  let initialized = false;
  let suppressNextClick = false;

  // --- Settings ---
  function loadSettings(cb) {
    chrome.storage.sync.get({ boostSpeed: 3.0 }, (result) => {
      boostSpeed = result.boostSpeed;
      if (cb) cb();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.boostSpeed) {
      boostSpeed = changes.boostSpeed.newValue;
    }
  });

  // --- Event Handlers ---
  function onMouseDown(event) {
    // Only primary mouse button
    if (event.button !== 0) return;
    // Only when video is playing
    if (!video || video.paused || video.ended) return;

    state = 'PENDING';
    originalPlaybackRate = video.playbackRate;

    longPressTimer = setTimeout(() => {
      if (state !== 'PENDING') return;
      // Double-check video is still playing
      if (!video || video.paused || video.ended) {
        state = 'IDLE';
        return;
      }
      state = 'BOOSTING';
      video.playbackRate = boostSpeed;
    }, 300);
  }

  function onRelease() {
    clearTimeout(longPressTimer);
    longPressTimer = null;

    if (state === 'BOOSTING' && video) {
      try {
        video.playbackRate = originalPlaybackRate;
      } catch (_) {
        // Video may have been removed
      }
      suppressNextClick = true;
    }
    state = 'IDLE';
  }

  // --- Video Attachment ---
  function attachToVideo(videoEl) {
    if (video === videoEl) return;
    detachFromVideo();
    video = videoEl;
  }

  function detachFromVideo() {
    if (state === 'BOOSTING' && video) {
      try {
        video.playbackRate = originalPlaybackRate;
      } catch (_) {}
    }
    video = null;
    state = 'IDLE';
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  // --- DOM Observer ---
  function findVideo() {
    const selectors = ['video[src]', 'video'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function checkForVideo() {
    const found = findVideo();
    if (found && video !== found) {
      attachToVideo(found);
    } else if (!found && video) {
      detachFromVideo();
    }
  }

  function startObserver() {
    if (domObserver) return;
    domObserver = new MutationObserver(checkForVideo);
    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // --- Init ---
  function init() {
    if (initialized) return;
    initialized = true;

    // Document-level listeners cover Loom's overlay elements that sit above the video
    document.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseup', onRelease, { passive: true });
    document.addEventListener('mouseleave', onRelease, { passive: true });
    document.addEventListener('contextmenu', onRelease, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onRelease();
    });
    window.addEventListener('blur', onRelease, { passive: true });

    // Suppress the click that fires after a long-press release. Uses capture phase
    // so it runs before Loom's handlers; not passive so preventDefault works.
    document.addEventListener('click', (event) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        event.stopPropagation();
        event.preventDefault();
      }
    }, { capture: true });

    const existing = findVideo();
    if (existing) {
      attachToVideo(existing);
    }
    // Always start observer to handle SPA navigation and late-loading video
    startObserver();

    console.log('[Speed Press] Active');
  }

  loadSettings(init);
})();
