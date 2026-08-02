/**
 * Dashboard module

 */

/**
 * Returns the live dashboard summary.
 *
 * During development only, previewMode=true bypasses Phase 4 user identity
 * validation so the dashboard can be tested using the owner connection.
 *
 * Remove the preview-mode exception before production deployment.
 *
 * @param {boolean} previewMode
 * @return {Object}
 */
function getDashboardData() {
  try {
    requirePermission_(APP_CONFIG.PERMISSIONS.VIEW_DASHBOARD);

    const cache =
      CacheService.getScriptCache();

    const cachedDashboard =
      getCachedJson_(
        cache,
        CACHE_CONFIG.KEYS.DASHBOARD_DATA
      );

    if (cachedDashboard) {
      return cachedDashboard;
    }

    const result =
      buildDashboardResponseFromSnapshot_(
        getCachedFinanceSnapshot_()
      );

    if (
      result &&
      result.success === true
    ) {
      putCachedJson_(
        cache,
        CACHE_CONFIG.KEYS.DASHBOARD_DATA,
        result,
        CACHE_CONFIG.TTL.DASHBOARD_DATA
      );
    }

    return result;

  } catch (error) {
    console.error(
      'Dashboard data error:',
      error
    );

    return {
      success: false,
      message:
        getErrorMessage_(error),
      summary: null,
      paymentStatus: null,
      recentPayments: []
    };
  }
}


/**
 * Returns one cached finance snapshot shared by Dashboard, Students and
 * Reports. This prevents each page from rereading and recalculating the
 * same Students and Payments worksheets.
 *
 * @return {Object}
 */
function getCachedFinanceSnapshot_() {
  const cache = CacheService.getScriptCache();
  const cached = getCachedJson_(
    cache,
    CACHE_CONFIG.KEYS.FINANCE_SNAPSHOT
  );

  if (cached) {
    return cached;
  }

  const snapshot = calculateFinanceSnapshot_();

  putCachedJson_(
    cache,
    CACHE_CONFIG.KEYS.FINANCE_SNAPSHOT,
    snapshot,
    CACHE_CONFIG.TTL.FINANCE_SNAPSHOT
  );

  return snapshot;
}


/**
 * Reads Students and Payments once and builds all commonly used finance
 * data in memory.
 *
 * @return {Object}
 */
function calculateFinanceSnapshot_() {
  const spreadsheet = getDatabase_();
  const studentRows = readDashboardSheetRows_(
    spreadsheet,
    APP_CONFIG.SHEETS.STUDENTS
  );
  const paymentRows = readDashboardSheetRows_(
    spreadsheet,
    APP_CONFIG.SHEETS.PAYMENTS
  );

  const studentMap = {};
  let totalFees = 0;
  let totalRteAmount = 0;

  studentRows.forEach(function(student) {
    const isActive = getDashboardBoolean_(
      student,
      ['Active Status', 'Active'],
      true
    );

    if (!isActive) {
      return;
    }

    const studentId = normaliseStudentId_(
      getDashboardText_(
        student,
        ['Student ID', 'StudentID', 'Admission Number', 'Admission No']
      )
    );

    if (!studentId) {
      return;
    }

    if (studentMap[studentId]) {
      throw new Error(
        'Duplicate Student ID found in the Students sheet: ' + studentId
      );
    }

    const fundingType = normaliseFundingType_(
      getDashboardText_(student, ['Funding Type'])
    );
    const isRte = fundingType === 'RTE';
    const recordedTotalFee = getDashboardNumber_(
      student,
      ['Total Fee', 'Annual Fee', 'Fee Amount', 'Fees']
    );
    const totalFee = isRte ? 0 : recordedTotalFee;

    studentMap[studentId] = {
      studentId: studentId,
      studentName: getDashboardText_(
        student,
        ['Student Name', 'Full Name', 'Name']
      ) || studentId,
      className: getDashboardText_(student, ['Class', 'Grade', 'Year Group']),
      section: getDashboardText_(student, ['Section', 'Class Section']),
      academicYear: getDashboardText_(student, ['Academic Year', 'School Year']),
      admissionDate: formatStudentDateForInput_(
        getDashboardValue_(student, ['Admission Date', 'Date of Admission'])
      ),
      fatherName: getDashboardText_(student, ['Father Name']),
      fatherPhone: getDashboardText_(student, ['Father Phone']),
      motherName: getDashboardText_(student, ['Mother Name']),
      motherPhone: getDashboardText_(student, ['Mother Phone']),
      fundingType: fundingType,
      isRte: isRte,
      totalFee: totalFee,
      amountPaid: 0
    };

    if (isRte) {
      totalRteAmount += recordedTotalFee;
    } else {
      totalFees += totalFee;
    }
  });

  const validPayments = [];

  paymentRows.forEach(function(payment) {
    const isFullyReversed = getDashboardBoolean_(
      payment,
      ['Reversed', 'Is Reversed', 'Cancelled', 'Void'],
      false
    );

    const studentId = normaliseStudentId_(
      getDashboardText_(
        payment,
        ['Student ID', 'StudentID', 'Admission Number', 'Admission No']
      )
    );
    const originalAmount = getDashboardNumber_(
      payment,
      ['Amount', 'Amount Paid', 'Payment Amount']
    );
    const reversedAmount = getDashboardNumber_(
      payment,
      ['Reversed Amount']
    );
    const amount = isFullyReversed
      ? 0
      : Math.max(originalAmount - reversedAmount, 0);

    if (!studentId || amount <= 0 || !studentMap[studentId]) {
      return;
    }

    // Historical payments for students now classified as RTE are not
    // included in current fee collection totals.
    if (studentMap[studentId].isRte) {
      return;
    }

    studentMap[studentId].amountPaid += amount;

    const paymentDateValue = getDashboardValue_(
      payment,
      ['Payment Date', 'Date', 'Date Paid']
    );
    const paymentTimestampValue = getDashboardValue_(
      payment,
      ['Timestamp', 'Created At', 'Entered At']
    );

    validPayments.push({
      paymentId: getDashboardText_(
        payment,
        ['Payment ID', 'PaymentID', 'Receipt Number', 'Receipt No']
      ),
      studentId: studentId,
      studentName: studentMap[studentId].studentName,
      amount: amount,
      paymentDate: formatDashboardDate_(paymentDateValue),
      paymentTimestamp:
        getDashboardTimestamp_(paymentTimestampValue) ||
        getDashboardTimestamp_(paymentDateValue),
      paymentMethod: getDashboardText_(
        payment,
        ['Payment Method', 'Method', 'Mode of Payment']
      ),
      referenceNumber: getDashboardText_(
        payment,
        ['Reference Number', 'Reference', 'Transaction Reference']
      ),
      recordedBy: getDashboardText_(
        payment,
        ['Recorded By', 'Created By', 'Entered By']
      )
    });
  });

  const studentAccounts = Object.keys(studentMap)
    .map(function(studentId) {
      const account = studentMap[studentId];
      const outstandingBalance = account.isRte
        ? 0
        : Math.max(
            account.totalFee - account.amountPaid,
            0
          );
      let paymentStatus = 'Unpaid';

      if (account.isRte) {
        paymentStatus = 'RTE';
      } else if (
        account.totalFee > 0 &&
        account.amountPaid >= account.totalFee
      ) {
        paymentStatus = 'Fully Paid';
      } else if (account.amountPaid > 0) {
        paymentStatus = 'Partially Paid';
      }

      return {
        studentId: account.studentId,
        studentName: account.studentName,
        className: account.className || '—',
        section: account.section || '—',
        academicYear: account.academicYear || '',
        admissionDate: account.admissionDate || '',
        fatherName: account.fatherName || '',
        fatherPhone: account.fatherPhone || '',
        motherName: account.motherName || '',
        motherPhone: account.motherPhone || '',
        studentStatus: 'Active',
        activeStatus: 'Active',
        fundingType: account.fundingType,
        isRte: account.isRte,
        totalFee: roundDashboardMoney_(account.totalFee),
        amountPaid: roundDashboardMoney_(account.amountPaid),
        outstandingBalance: roundDashboardMoney_(outstandingBalance),
        paymentStatus: paymentStatus
      };
    })
    .sort(function(firstStudent, secondStudent) {
      return firstStudent.studentName.localeCompare(
        secondStudent.studentName,
        undefined,
        { sensitivity: 'base' }
      );
    });

  validPayments.sort(function(firstPayment, secondPayment) {
    return secondPayment.paymentTimestamp - firstPayment.paymentTimestamp;
  });

  const paymentsReceived = validPayments.reduce(function(total, payment) {
    return total + payment.amount;
  }, 0);

  return {
    generatedAt: Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'dd MMM yyyy, HH:mm'
    ),
    totalFees: roundDashboardMoney_(totalFees),
    totalRteAmount: roundDashboardMoney_(totalRteAmount),
    paymentsReceived: roundDashboardMoney_(paymentsReceived),
    studentAccounts: studentAccounts,
    validPayments: validPayments
  };
}


/**
 * Converts the shared finance snapshot into the existing Dashboard response.
 *
 * @param {Object} snapshot
 * @return {Object}
 */
function buildDashboardResponseFromSnapshot_(snapshot) {
  const studentAccounts = snapshot.studentAccounts || [];
  const totalFees = Number(snapshot.totalFees || 0);
  const paymentsReceived = Number(snapshot.paymentsReceived || 0);
  const outstandingBalance = Math.max(totalFees - paymentsReceived, 0);

  const recentPayments = (snapshot.validPayments || [])
    .slice(0, 5)
    .map(function(payment) {
      return {
        paymentId: payment.paymentId,
        studentId: payment.studentId,
        studentName: payment.studentName,
        amount: roundDashboardMoney_(payment.amount),
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod || 'Not specified',
        referenceNumber: payment.referenceNumber || '—',
        recordedBy: payment.recordedBy || '—'
      };
    });

  return {
    success: true,
    generatedAt: snapshot.generatedAt,
    summary: {
      totalStudents: studentAccounts.length,
      totalRteStudents: studentAccounts.filter(function(account) {
        return account.paymentStatus === 'RTE';
      }).length,
      totalRteAmount: roundDashboardMoney_(snapshot.totalRteAmount || 0),
      totalFees: roundDashboardMoney_(totalFees),
      paymentsReceived: roundDashboardMoney_(paymentsReceived),
      outstandingBalance: roundDashboardMoney_(outstandingBalance),
      collectionRate: totalFees > 0
        ? Math.round((paymentsReceived / totalFees) * 10000) / 100
        : 0
    },
    paymentStatus: {
      fullyPaid: studentAccounts.filter(function(account) {
        return account.paymentStatus === 'Fully Paid';
      }).length,
      partiallyPaid: studentAccounts.filter(function(account) {
        return account.paymentStatus === 'Partially Paid';
      }).length,
      unpaid: studentAccounts.filter(function(account) {
        return account.paymentStatus === 'Unpaid';
      }).length,
      rte: studentAccounts.filter(function(account) {
        return account.paymentStatus === 'RTE';
      }).length
    },
    recentPayments: recentPayments
  };
}


/**
 * Reads a worksheet and converts each populated row into an object.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet
 * @param {string} sheetName
 * @return {Array<Object>}
 */
function readDashboardSheetRows_(
  spreadsheet,
  sheetName
) {
  const sheet =
    spreadsheet.getSheetByName(
      sheetName
    );

  if (!sheet) {
    throw new Error(
      'Required worksheet "' +
      sheetName +
      '" was not found.'
    );
  }

  const lastRow =
    sheet.getLastRow();

  const lastColumn =
    sheet.getLastColumn();

  if (
    lastRow < 2 ||
    lastColumn < 1
  ) {
    return [];
  }

  const values = sheet
    .getRange(
      1,
      1,
      lastRow,
      lastColumn
    )
    .getValues();

  const headers =
    values[0].map(
      function(header) {
        return String(
          header || ''
        ).trim();
      }
    );

  return values
    .slice(1)
    .filter(function(row) {
      return row.some(
        function(value) {
          return (
            value !== '' &&
            value !== null
          );
        }
      );
    })
    .map(function(row) {
      const record = {};

      headers.forEach(
        function(header, index) {
          if (header) {
            record[header] =
              row[index];
          }
        }
      );

      return record;
    });
}


/**
 * Returns the first matching field value from a record.
 *
 * @param {Object} record
 * @param {Array<string>} possibleHeaders
 * @return {*}
 */
function getDashboardValue_(
  record,
  possibleHeaders
) {
  const recordKeys =
    Object.keys(record);

  for (
    let index = 0;
    index < possibleHeaders.length;
    index++
  ) {
    const expectedHeader =
      normaliseDashboardHeader_(
        possibleHeaders[index]
      );

    const matchingKey =
      recordKeys.find(
        function(recordKey) {
          return (
            normaliseDashboardHeader_(
              recordKey
            ) === expectedHeader
          );
        }
      );

    if (
      matchingKey !== undefined
    ) {
      return record[matchingKey];
    }
  }

  return '';
}


/**
 * Returns a matching value as trimmed text.
 *
 * @param {Object} record
 * @param {Array<string>} possibleHeaders
 * @return {string}
 */
function getDashboardText_(
  record,
  possibleHeaders
) {
  const value =
    getDashboardValue_(
      record,
      possibleHeaders
    );

  return String(
    value === null ||
    value === undefined
      ? ''
      : value
  ).trim();
}


/**
 * Returns a matching value as a number.
 *
 * @param {Object} record
 * @param {Array<string>} possibleHeaders
 * @return {number}
 */
function getDashboardNumber_(
  record,
  possibleHeaders
) {
  const value =
    getDashboardValue_(
      record,
      possibleHeaders
    );

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const cleanedValue =
    String(value || '')
      .replace(/[₹£]/g, '')
      .replace(/,/g, '')
      .trim();

  const parsedValue =
    Number(cleanedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}


/**
 * Returns a matching value as Boolean.
 *
 * @param {Object} record
 * @param {Array<string>} possibleHeaders
 * @param {boolean} defaultValue
 * @return {boolean}
 */
function getDashboardBoolean_(
  record,
  possibleHeaders,
  defaultValue
) {
  const value =
    getDashboardValue_(
      record,
      possibleHeaders
    );

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return defaultValue;
  }

  if (
    typeof value === 'boolean'
  ) {
    return value;
  }

  const normalisedValue =
    String(value)
      .trim()
      .toLowerCase();

  return [
    'true',
    'yes',
    'y',
    '1',
    'active',
    'checked'
  ].includes(normalisedValue);
}


/**
 * Normalises worksheet headers for flexible matching.
 *
 * @param {*} header
 * @return {string}
 */
function normaliseDashboardHeader_(
  header
) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}


/**
 * Converts a supported date value into a numeric timestamp.
 *
 * @param {*} value
 * @return {number}
 */
function getDashboardTimestamp_(
  value
) {
  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return value.getTime();
  }

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const parsedDate =
    new Date(value);

  return isNaN(
    parsedDate.getTime()
  )
    ? 0
    : parsedDate.getTime();
}


/**
 * Formats a date for dashboard display.
 *
 * @param {*} value
 * @return {string}
 */
function formatStudentDateForInput_(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return '';
  }

  let dateValue = value;

  if (!(dateValue instanceof Date)) {
    dateValue = new Date(value);
  }

  if (
    !(dateValue instanceof Date) ||
    isNaN(dateValue.getTime())
  ) {
    return '';
  }

  return Utilities.formatDate(
    dateValue,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}


function formatDashboardDate_(
  value
) {
  const timestamp =
    getDashboardTimestamp_(
      value
    );

  if (!timestamp) {
    return '—';
  }

  return Utilities.formatDate(
    new Date(timestamp),
    Session.getScriptTimeZone(),
    'dd MMM yyyy'
  );
}


/**
 * Rounds monetary values to two decimal places.
 *
 * @param {*} value
 * @return {number}
 */
function roundDashboardMoney_(
  value
) {
  return Math.round(
    (Number(value) || 0) * 100
  ) / 100;
}
