const DEFAULT_SPEED = 3.0;

document.addEventListener('DOMContentLoaded', () => {
  const pills = document.querySelectorAll('.pill');
  const statusMsg = document.getElementById('statusMsg');
  let statusTimer = null;

  // Load saved setting and mark the active pill
  chrome.storage.sync.get({ boostSpeed: DEFAULT_SPEED }, ({ boostSpeed }) => {
    setActivePill(boostSpeed);
  });

  // Handle pill clicks
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const speed = parseFloat(pill.dataset.speed);
      setActivePill(speed);
      chrome.storage.sync.set({ boostSpeed: speed }, () => {
        showStatus('Saved');
      });
    });
  });

  function setActivePill(speed) {
    pills.forEach((p) => {
      p.classList.toggle('active', parseFloat(p.dataset.speed) === speed);
    });
  }

  function showStatus(msg) {
    statusMsg.textContent = msg;
    statusMsg.classList.add('visible');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusMsg.classList.remove('visible');
    }, 1500);
  }
});
