/** Sanitized portfolio frontend module. */

function loadDashboardData(showRefreshMessage) {
  const loadingElement =
    document.getElementById('dashboardLoading');

  const contentElement =
    document.getElementById('dashboardContent');

  const errorElement =
    document.getElementById('dashboardError');

  const refreshButton =
    document.getElementById('dashboardRefreshButton');

  if (
    !loadingElement ||
    !contentElement ||
    !errorElement ||
    !refreshButton
  ) {
    console.error('Dashboard elements are missing from the page.');
    return;
  }

  errorElement.classList.add('hidden');

  if (showRefreshMessage) {
    refreshButton.classList.add('refreshing');
    refreshButton.textContent = 'Refreshing...';
  } else {
    loadingElement.classList.remove('hidden');
    contentElement.classList.add('hidden');
  }

  google.script.run
    .withSuccessHandler(function(response) {
      refreshButton.classList.remove('refreshing');
      refreshButton.innerHTML =
        getIconMarkup('refresh') + ' Refresh';

      if (!response || !response.success) {
        showDashboardError(
          response && response.message
            ? response.message
            : 'Dashboard information could not be loaded.'
        );

        return;
      }

      renderDashboardData(response);
      applicationState.dashboardLoaded = true;

      loadingElement.classList.add('hidden');
      contentElement.classList.remove('hidden');

      if (showRefreshMessage) {
        showToast(
          'Dashboard information refreshed.',
          'success'
        );
      }
    })
    .withFailureHandler(function(error) {
      refreshButton.classList.remove('refreshing');
      refreshButton.innerHTML =
        getIconMarkup('refresh') + ' Refresh';

      showDashboardError(
        error && error.message
          ? error.message
          : 'Dashboard information could not be loaded.'
      );
    })
    .getDashboardData();
}

function renderDashboardData(response) {
  const summary = response.summary || {};
  const paymentStatus = response.paymentStatus || {};

  document.getElementById('metricTotalStudents').textContent =
    formatDashboardNumber(summary.totalStudents);

  document.getElementById('metricTotalFees').textContent =
    formatDashboardCurrency(summary.totalFees);

  document.getElementById('metricPaymentsReceived').textContent =
    formatDashboardCurrency(summary.paymentsReceived);

  document.getElementById('metricOutstandingBalance').textContent =
    formatDashboardCurrency(summary.outstandingBalance);

  document.getElementById('metricTotalRteStudents').textContent =
    formatDashboardNumber(summary.totalRteStudents);

  document.getElementById('metricTotalRteAmount').textContent =
    formatDashboardCurrency(summary.totalRteAmount);

  const collectionRate = Math.max(
    0,
    Number(summary.collectionRate) || 0
  );

  document.getElementById('collectionRateBadge').textContent =
    formatDashboardPercentage(collectionRate);

  document.getElementById('collectionProgressBar').style.width =
    Math.min(collectionRate, 100) + '%';

  document.getElementById('collectionReceived').textContent =
    formatDashboardCurrency(summary.paymentsReceived);

  document.getElementById('collectionOutstanding').textContent =
    formatDashboardCurrency(summary.outstandingBalance);

  document.getElementById('statusFullyPaid').textContent =
    formatDashboardNumber(paymentStatus.fullyPaid);

  document.getElementById('statusPartiallyPaid').textContent =
    formatDashboardNumber(paymentStatus.partiallyPaid);

  document.getElementById('statusUnpaid').textContent =
    formatDashboardNumber(paymentStatus.unpaid);

  document.getElementById('statusRte').textContent =
    formatDashboardNumber(paymentStatus.rte);

  document.getElementById('dashboardUpdatedAt').textContent =
    response.generatedAt
      ? 'Updated ' + response.generatedAt
      : '';

  renderRecentPayments(response.recentPayments || []);
}

function renderRecentPayments(payments) {
  const tableBody =
    document.getElementById('recentPaymentsBody');

  const emptyMessage =
    document.getElementById('recentPaymentsEmpty');

  tableBody.innerHTML = '';

  if (!payments.length) {
    emptyMessage.classList.remove('hidden');
    return;
  }

  emptyMessage.classList.add('hidden');

  payments.forEach(function(payment) {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${escapeHtml(payment.paymentDate || '—')}</td>

      <td>
        <div class="student-cell">
          <strong>
            ${escapeHtml(payment.studentName || 'Unknown student')}
          </strong>

          <span>
            ${escapeHtml(payment.studentId || '')}
          </span>
        </div>
      </td>

      <td>${escapeHtml(payment.paymentId || '—')}</td>

      <td>${escapeHtml(payment.paymentMethod || '—')}</td>

      <td>${escapeHtml(payment.referenceNumber || '—')}</td>

      <td class="amount-column payment-amount">
        ${formatDashboardCurrency(payment.amount)}
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function showDashboardError(message) {
  const loadingElement =
    document.getElementById('dashboardLoading');

  const contentElement =
    document.getElementById('dashboardContent');

  const errorElement =
    document.getElementById('dashboardError');

  loadingElement.classList.add('hidden');
  contentElement.classList.add('hidden');

  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
}
