/** Sanitized portfolio frontend module. */

function injectIcons() {
  document.getElementById('menuIcon').innerHTML =
    getIconMarkup('menu');

  document.getElementById('accessIcon').innerHTML =
    getIconMarkup('lock');

  document.getElementById('warningIcon').innerHTML =
    getIconMarkup('warning');

  document.getElementById('refreshIcon').innerHTML =
    getIconMarkup('refresh');

  document
    .querySelectorAll('[data-placeholder-icon]')
    .forEach(function(element) {
      element.innerHTML = getIconMarkup(
        element.dataset.placeholderIcon
      );
    });

  document
    .querySelectorAll('[data-dashboard-icon]')
    .forEach(function(element) {
      element.innerHTML = getIconMarkup(
        element.dataset.dashboardIcon
      );
    });
}

function getIconMarkup(iconName) {
  const icons = {
    dashboard: `
      <svg viewBox="0 0 24 24" width="100%" height="100%"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
      </svg>
    `,

    students: `
      <svg viewBox="0 0 24 24" width="100%" height="100%"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="8" r="3"></circle>
        <path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6"></path>
        <circle cx="17" cy="9" r="2.3"></circle>
        <path d="M15.5 15.2c3.1-.4 5 1.2 5.5 4.8"></path>
      </svg>
    `,

    payment: `
      <svg viewBox="0 0 24 24" width="100%" height="100%"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2"></rect>
        <path d="M3 9h18"></path>
        <path d="M7 15h4"></path>
      </svg>
    `,

    reports: `
      <svg viewBox="0 0 24 24" width="100%" height="100%"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 20V10"></path>
        <path d="M12 20V4"></path>
        <path d="M19 20v-7"></path>
      </svg>
    `,

    settings: `
      <svg viewBox="0 0 24 24" width="100%" height="100%"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.7v-.1a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.8-2.8.1-.1A1.7 1.7 0 0 0 4 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.7h.3a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.8-2.8.1.1A1.7 1.7 0 0 0 8.3 4a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h3.9v.3a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.8 2.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v3.9h-.1a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.6.9z"></path>
      </svg>
    `,

    menu: `
      <svg viewBox="0 0 24 24" width="22" height="22"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round">
        <path d="M4 7h16"></path>
        <path d="M4 12h16"></path>
        <path d="M4 17h16"></path>
      </svg>
    `,

    lock: `
      <svg viewBox="0 0 24 24" width="24" height="24"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="10" width="14" height="11" rx="2"></rect>
        <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
      </svg>
    `,

    warning: `
      <svg viewBox="0 0 24 24" width="19" height="19"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 2.8 20h18.4L12 3z"></path>
        <path d="M12 9v4"></path>
        <path d="M12 17h.01"></path>
      </svg>
    `,

    refresh: `
      <svg viewBox="0 0 24 24" width="18" height="18"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6v5h-5"></path>
        <path d="M4 18v-5h5"></path>
        <path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8"></path>
        <path d="M5.5 15A7 7 0 0 0 17.8 17.8L20 16"></path>
      </svg>
    `,

    fees: `
      <svg viewBox="0 0 24 24" width="100%" height="100%"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2"></rect>
        <path d="M8 8h8"></path>
        <path d="M8 12h8"></path>
        <path d="M8 16h5"></path>
      </svg>
    `,

    received: `
      <svg viewBox="0 0 24 24" width="100%" height="100%"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="m8 12 2.5 2.5L16 9"></path>
      </svg>
    `,

    outstanding: `
      <svg viewBox="0 0 24 24" width="100%" height="100%"
           fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 7v5l3 2"></path>
      </svg>
    `
  };

  return icons[iconName] || icons.dashboard;
}

/**
 * Loads live Dashboard data from Apps Script.
 */

function showToast(message, type) {
      const toastContainer =
        document.getElementById('toastContainer');

      const toast = document.createElement('div');

      toast.className =
        'toast' + (type ? ' ' + type : '');

      toast.textContent = message;

      toastContainer.appendChild(toast);

      window.setTimeout(function() {
        toast.remove();
      }, 2600);
    }

function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

function formatCurrency(value) {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDashboardCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDashboardNumber(value) {
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDashboardPercentage(value) {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value) || 0) + '%';
}
