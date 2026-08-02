/**
 * Reports module
 *
 * This module uses the shared finance snapshot already calculated for the
 * dashboard and students modules. It does not contain real student data.
 */

/**
 * Returns portfolio-safe collection and outreach report data.
 *
 * @return {Object}
 */
function getReportsData() {
  try {
    requirePermission_(APP_CONFIG.PERMISSIONS.VIEW_REPORTS);

    const snapshot = getCachedFinanceSnapshot_();
    const accounts = snapshot.studentAccounts || [];

    const classSummaryMap = {};

    accounts.forEach(function(account) {
      const className = account.className || 'Unassigned';

      if (!classSummaryMap[className]) {
        classSummaryMap[className] = {
          className: className,
          totalStudents: 0,
          totalFees: 0,
          amountPaid: 0,
          outstandingBalance: 0,
          fullyPaid: 0,
          partiallyPaid: 0,
          unpaid: 0,
          rte: 0
        };
      }

      const row = classSummaryMap[className];

      row.totalStudents += 1;
      row.totalFees += Number(account.totalFee || 0);
      row.amountPaid += Number(account.amountPaid || 0);
      row.outstandingBalance += Number(account.outstandingBalance || 0);

      if (account.paymentStatus === 'Fully Paid') row.fullyPaid += 1;
      if (account.paymentStatus === 'Partially Paid') row.partiallyPaid += 1;
      if (account.paymentStatus === 'Unpaid') row.unpaid += 1;
      if (account.paymentStatus === 'RTE') row.rte += 1;
    });

    const classSummary = Object.keys(classSummaryMap)
      .map(function(className) {
        const row = classSummaryMap[className];

        return {
          className: row.className,
          totalStudents: row.totalStudents,
          totalFees: roundDashboardMoney_(row.totalFees),
          amountPaid: roundDashboardMoney_(row.amountPaid),
          outstandingBalance: roundDashboardMoney_(row.outstandingBalance),
          collectionRate: row.totalFees > 0
            ? Math.round((row.amountPaid / row.totalFees) * 10000) / 100
            : 0,
          fullyPaid: row.fullyPaid,
          partiallyPaid: row.partiallyPaid,
          unpaid: row.unpaid,
          rte: row.rte
        };
      })
      .sort(function(firstRow, secondRow) {
        return firstRow.className.localeCompare(
          secondRow.className,
          undefined,
          { numeric: true, sensitivity: 'base' }
        );
      });

    const outreach = accounts
      .filter(function(account) {
        return (
          account.paymentStatus === 'Unpaid' ||
          account.paymentStatus === 'Partially Paid'
        );
      })
      .map(function(account) {
        return {
          studentId: account.studentId,
          studentName: account.studentName,
          className: account.className,
          section: account.section,
          paymentStatus: account.paymentStatus,
          outstandingBalance: account.outstandingBalance,
          fatherPhone: maskPhoneForReport_(account.fatherPhone),
          motherPhone: maskPhoneForReport_(account.motherPhone)
        };
      })
      .sort(function(firstStudent, secondStudent) {
        return secondStudent.outstandingBalance - firstStudent.outstandingBalance;
      });

    return {
      success: true,
      generatedAt: snapshot.generatedAt,
      summary: {
        totalStudents: accounts.length,
        totalFees: roundDashboardMoney_(snapshot.totalFees || 0),
        paymentsReceived: roundDashboardMoney_(snapshot.paymentsReceived || 0),
        outstandingBalance: roundDashboardMoney_(
          Math.max(
            Number(snapshot.totalFees || 0) -
            Number(snapshot.paymentsReceived || 0),
            0
          )
        )
      },
      classSummary: classSummary,
      outreach: outreach
    };

  } catch (error) {
    console.error('getReportsData error:', error);

    return {
      success: false,
      message: getErrorMessage_(error),
      generatedAt: '',
      summary: null,
      classSummary: [],
      outreach: []
    };
  }
}


/**
 * Masks phone numbers returned through the report endpoint.
 *
 * @param {*} value
 * @return {string}
 */
function maskPhoneForReport_(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return '—';
  }

  if (digits.length <= 4) {
    return '****';
  }

  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}
