/**
 * Payments module
 */

/**
 * Returns all information needed to print one payment receipt.
 *
 * @param {string} paymentId
 * @return {Object}
 */
function getPaymentReceipt(paymentId) {
  try {
    requirePermission_(
      APP_CONFIG.PERMISSIONS.PRINT_RECEIPT
    );
    const cleanPaymentId = String(
      paymentId || ''
    ).trim();

    if (!cleanPaymentId) {
      return {
        success: false,
        message: 'A payment ID is required.'
      };
    }

    const spreadsheet = getDatabase_();

    const paymentRows = readDashboardSheetRows_(
      spreadsheet,
      APP_CONFIG.SHEETS.PAYMENTS
    );

    const payment = paymentRows.find(function(row) {
      return getDashboardText_(
        row,
        [
          'Payment ID',
          'PaymentID'
        ]
      ) === cleanPaymentId;
    });

    if (!payment) {
      return {
        success: false,
        message: 'The selected payment could not be found.'
      };
    }

    const isReversed = getDashboardBoolean_(
      payment,
      [
        'Reversed',
        'Is Reversed',
        'Cancelled',
        'Void'
      ],
      false
    );

    if (isReversed) {
      return {
        success: false,
        message: 'A reversed payment cannot be printed.'
      };
    }

    const studentId = normaliseStudentId_(
      getDashboardText_(
        payment,
        [
          'Student ID',
          'StudentID',
          'Admission Number',
          'Admission No'
        ]
      )
    );

    const student =
      getCachedStudentAccounts_()
        .find(function(item) {
          return normaliseStudentId_(
            item.studentId
          ) === studentId;
        });

    if (!student) {
      return {
        success: false,
        message:
          'Student information could not be loaded.'
      };
    }

    const paymentDateValue =
      getDashboardValue_(
        payment,
        [
          'Payment Date',
          'Date'
        ]
      );

    return {
      success: true,

      receipt: {
        paymentId: cleanPaymentId,

        receiptNumber: getDashboardText_(
          payment,
          [
            'Receipt Number',
            'Receipt No'
          ]
        ) || '—',

        studentId: studentId,

        studentName:
          student.studentName || '—',

        className:
          student.className || '—',

        section:
          student.section || '—',

        paymentDate:
          formatPaymentHistoryDate_(
            paymentDateValue
          ),

        originalAmount: roundDashboardMoney_(
          getDashboardNumber_(
            payment,
            ['Amount', 'Amount Paid', 'Payment Amount']
          )
        ),

        reversedAmount: roundDashboardMoney_(
          getDashboardNumber_(
            payment,
            ['Reversed Amount']
          )
        ),

        amount: roundDashboardMoney_(
          Math.max(
            getDashboardNumber_(
              payment,
              ['Amount', 'Amount Paid', 'Payment Amount']
            ) -
            getDashboardNumber_(
              payment,
              ['Reversed Amount']
            ),
            0
          )
        ),

        paymentMethod: getDashboardText_(
          payment,
          [
            'Payment Method',
            'Method'
          ]
        ) || '—',

        referenceNumber: getDashboardText_(
          payment,
          [
            'Reference Number',
            'Reference',
            'Transaction ID'
          ]
        ) || '—',

        notes: getDashboardText_(
          payment,
          [
            'Notes',
            'Payment Notes'
          ]
        ) || '—',

        enteredBy: getDashboardText_(
          payment,
          [
            'Entered By',
            'Created By'
          ]
        ) || '—'
      }
    };

  } catch (error) {
    console.error(
      'getPaymentReceipt error:',
      error
    );

    return {
      success: false,
      message:
        error && error.message
          ? error.message
          : 'The receipt could not be loaded.'
    };
  }
}


/**
 * Reverses a payment without deleting it.
 *
 * @param {string} paymentId
 * @param {string} reversalReason
 * @return {Object}
 */
function reversePayment(paymentId, reversalAmount, reversalReason) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const currentUser = requirePermission_(
      APP_CONFIG.PERMISSIONS.REVERSE_PAYMENT
    );

    const cleanPaymentId = String(paymentId || '').trim();
    const amountToReverse = roundDashboardMoney_(Number(reversalAmount));
    const cleanReason = String(reversalReason || '').trim();

    if (!cleanPaymentId) {
      return { success: false, message: 'A payment ID is required.' };
    }

    if (!Number.isFinite(amountToReverse) || amountToReverse <= 0) {
      return { success: false, message: 'Enter a valid reversal amount greater than zero.' };
    }

    if (cleanReason.length < 3) {
      return { success: false, message: 'The reversal reason must contain at least 3 characters.' };
    }

    const spreadsheet = getDatabase_();
    const paymentSheet = spreadsheet.getSheetByName(APP_CONFIG.SHEETS.PAYMENTS);

    if (!paymentSheet) {
      return { success: false, message: 'The Payments sheet could not be found.' };
    }

    const values = paymentSheet.getDataRange().getValues();
    if (values.length < 2) {
      return { success: false, message: 'No payment records were found.' };
    }

    const headers = values[0].map(function(header) {
      return String(header || '').trim();
    });

    const requiredColumns = [
      'Payment ID',
      'Amount',
      'Reversed',
      'Reversal Reason',
      'Reversed Amount',
      'Reversal Timestamp',
      'Reversed By'
    ];

    const missingColumns = requiredColumns.filter(function(header) {
      return headers.indexOf(header) === -1;
    });

    if (missingColumns.length > 0) {
      return {
        success: false,
        message: 'The Payments sheet is missing required reversal columns: ' + missingColumns.join(', ')
      };
    }

    const paymentIdColumn = headers.indexOf('Payment ID');
    const amountColumn = headers.indexOf('Amount');
    const reversedColumn = headers.indexOf('Reversed');
    const reversalReasonColumn = headers.indexOf('Reversal Reason');
    const reversedAmountColumn = headers.indexOf('Reversed Amount');
    const reversalTimestampColumn = headers.indexOf('Reversal Timestamp');
    const reversedByColumn = headers.indexOf('Reversed By');
    const studentIdColumn = headers.indexOf('Student ID');
    const receiptNumberColumn = headers.indexOf('Receipt Number');

    let paymentRowIndex = -1;
    for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
      if (String(values[rowIndex][paymentIdColumn] || '').trim() === cleanPaymentId) {
        paymentRowIndex = rowIndex;
        break;
      }
    }

    if (paymentRowIndex === -1) {
      return { success: false, message: 'The selected payment could not be found.' };
    }

    const paymentRow = values[paymentRowIndex];
    const originalAmount = roundDashboardMoney_(Number(paymentRow[amountColumn]) || 0);
    const previouslyReversed = roundDashboardMoney_(Number(paymentRow[reversedAmountColumn]) || 0);
    const remainingReversible = roundDashboardMoney_(Math.max(originalAmount - previouslyReversed, 0));

    if (normaliseBooleanValue_(paymentRow[reversedColumn]) || remainingReversible <= 0) {
      return { success: false, message: 'This payment has already been fully reversed.' };
    }

    if (amountToReverse > remainingReversible) {
      return {
        success: false,
        message: 'The reversal cannot exceed the remaining reversible amount of ' +
          formatServerCurrency_(remainingReversible) + '.'
      };
    }

    const newReversedAmount = roundDashboardMoney_(previouslyReversed + amountToReverse);
    const fullyReversed = newReversedAmount >= originalAmount;
    const now = new Date();
    const reversedBy = currentUser.email || currentUser.fullName || 'Unknown user';
    const previousReason = String(paymentRow[reversalReasonColumn] || '').trim();
    const reasonEntry = Utilities.formatDate(
      now,
      Session.getScriptTimeZone(),
      'dd/MM/yyyy HH:mm:ss'
    ) + ' | ' + formatServerCurrency_(amountToReverse) + ' | ' + reversedBy + ' | ' + cleanReason;
    const cumulativeReason = previousReason
      ? previousReason + '\n' + reasonEntry
      : reasonEntry;

    const sheetRowNumber = paymentRowIndex + 1;
    const firstUpdateColumn = Math.min(
      reversedColumn,
      reversalReasonColumn,
      reversedAmountColumn,
      reversalTimestampColumn,
      reversedByColumn
    );
    const lastUpdateColumn = Math.max(
      reversedColumn,
      reversalReasonColumn,
      reversedAmountColumn,
      reversalTimestampColumn,
      reversedByColumn
    );
    const updatedValues = paymentRow.slice(
      firstUpdateColumn,
      lastUpdateColumn + 1
    );

    updatedValues[reversedColumn - firstUpdateColumn] = fullyReversed;
    updatedValues[reversalReasonColumn - firstUpdateColumn] = cumulativeReason;
    updatedValues[reversedAmountColumn - firstUpdateColumn] = newReversedAmount;
    updatedValues[reversalTimestampColumn - firstUpdateColumn] = now;
    updatedValues[reversedByColumn - firstUpdateColumn] = reversedBy;

    paymentSheet
      .getRange(
        sheetRowNumber,
        firstUpdateColumn + 1,
        1,
        updatedValues.length
      )
      .setValues([updatedValues]);

    paymentSheet.getRange(sheetRowNumber, reversedAmountColumn + 1).setNumberFormat('₹#,##0.00');
    paymentSheet.getRange(sheetRowNumber, reversalTimestampColumn + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

    clearFinanceDataCache_();

    const refreshPayload =
      buildFinanceRefreshPayload_(
        studentIdColumn >= 0
          ? paymentRow[studentIdColumn]
          : ''
      );

    return {
      success: true,
      message: fullyReversed
        ? 'Payment fully reversed successfully.'
        : 'Partial reversal saved successfully.',
      payment: {
        paymentId: cleanPaymentId,
        studentId: studentIdColumn >= 0 ? String(paymentRow[studentIdColumn] || '').trim() : '',
        receiptNumber: receiptNumberColumn >= 0 ? String(paymentRow[receiptNumberColumn] || '').trim() : '',
        originalAmount: originalAmount,
        reversedThisTime: amountToReverse,
        totalReversedAmount: newReversedAmount,
        remainingAmount: roundDashboardMoney_(Math.max(originalAmount - newReversedAmount, 0)),
        fullyReversed: fullyReversed,
        reversalReason: cleanReason
      },
      refreshPayload: refreshPayload
    };

  } catch (error) {
    console.error('reversePayment error:', error);
    return {
      success: false,
      message: error && error.message ? error.message : 'The payment could not be reversed.'
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (lockError) {
      console.warn('Lock release error:', lockError);
    }
  }
}


function normaliseBooleanValue_(value) {
  if (value === true) {
    return true;
  }

  const text = String(
    value || ''
  )
    .trim()
    .toLowerCase();

  return [
    'true',
    'yes',
    'y',
    '1',
    'reversed'
  ].includes(text);
}


/**
 * Saves a new payment to the Payments sheet.
 *
 * @param {Object} paymentData
 * @return {Object}
 */
function savePayment(paymentData) {
  const lock =
    LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    requirePermission_(
      APP_CONFIG.PERMISSIONS.RECORD_PAYMENT
    );

    if (!paymentData) {
      return {
        success: false,
        message: 'Payment information is required.'
      };
    }

    const studentId =
      normaliseStudentId_(
        paymentData.studentId
      );

    const paymentDate =
      String(
        paymentData.paymentDate || ''
      ).trim();

    const amount =
      Number(
        paymentData.amount
      );

    const paymentMethod =
      String(
        paymentData.paymentMethod || ''
      ).trim();

    const referenceNumber =
      String(
        paymentData.referenceNumber || ''
      ).trim();

    const notes =
      String(
        paymentData.notes || ''
      ).trim();

    if (!studentId) {
      return {
        success: false,
        message: 'A student must be selected.'
      };
    }

    if (!paymentDate) {
      return {
        success: false,
        message: 'Payment date is required.'
      };
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return {
        success: false,
        message: 'Enter a valid payment amount.'
      };
    }

    if (!paymentMethod) {
      return {
        success: false,
        message: 'Select a payment method.'
      };
    }

    /*
     * Cached accounts avoid rereading Students and Payments solely
     * to validate the selected student's current balance.
     */
    const student =
      getCachedStudentAccounts_()
        .find(function(item) {
          return normaliseStudentId_(
            item.studentId
          ) === studentId;
        });

    if (!student) {
      return {
        success: false,
        message:
          'The selected student could not be found.'
      };
    }

    if (
      student.isRte === true ||
      student.fundingType === 'RTE' ||
      student.paymentStatus === 'RTE'
    ) {
      return {
        success: false,
        message:
          'Payments cannot be recorded for an RTE government-funded student.'
      };
    }

    const outstandingBalance =
      Number(
        student.outstandingBalance || 0
      );

    if (amount > outstandingBalance) {
      return {
        success: false,
        message:
          'The payment cannot exceed the outstanding balance of ' +
          formatServerCurrency_(
            outstandingBalance
          ) +
          '.'
      };
    }

    const spreadsheet =
      getDatabase_();

    const sheet =
      spreadsheet.getSheetByName(
        APP_CONFIG.SHEETS.PAYMENTS
      );

    if (!sheet) {
      return {
        success: false,
        message: 'Payments sheet not found.'
      };
    }

    const now =
      new Date();

    const paymentId =
      generateNextPaymentId_(
        sheet,
        now
      );

    const receiptNumber =
      generateNextReceiptNumber_(
        sheet,
        now
      );

    const enteredBy =
      Session.getActiveUser().getEmail() ||
      Session.getEffectiveUser().getEmail() ||
      'Unknown user';

    const parsedPaymentDate =
      parsePaymentDate_(
        paymentDate
      );

    const paymentHeaders = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0]
      .map(function(header) {
        return String(header || '').trim();
      });

    const paymentRecord = {
      'Payment ID': paymentId,
      'Student ID': studentId,
      'Payment Date': parsedPaymentDate,
      'Amount': roundDashboardMoney_(amount),
      'Payment Method': paymentMethod,
      'Reference Number': referenceNumber,
      'Receipt Number': receiptNumber,
      'Notes': notes,
      'Entered By': enteredBy,
      'Timestamp': now,
      'Reversed': false,
      'Reversal Reason': '',
      'Reversed Amount': 0,
      'Reversal Timestamp': '',
      'Reversed By': ''
    };

    sheet.appendRow(
      paymentHeaders.map(function(header) {
        return Object.prototype.hasOwnProperty.call(paymentRecord, header)
          ? paymentRecord[header]
          : '';
      })
    );

    const rowNumber =
      sheet.getLastRow();

    sheet
      .getRange(
        rowNumber,
        3
      )
      .setNumberFormat(
        'dd/MM/yyyy'
      );

    sheet
      .getRange(
        rowNumber,
        4
      )
      .setNumberFormat(
        '₹#,##0.00'
      );

    sheet
      .getRange(
        rowNumber,
        10
      )
      .setNumberFormat(
        'dd/MM/yyyy HH:mm:ss'
      );

    clearFinanceDataCache_();

    const refreshPayload =
      buildFinanceRefreshPayload_(studentId);

    return {
      success: true,
      message: 'Payment saved successfully.',
      paymentId: paymentId,
      receiptNumber: receiptNumber,
      studentId: studentId,
      amount:
        roundDashboardMoney_(
          amount
        ),
      refreshPayload: refreshPayload
    };

  } catch (error) {
    console.error(
      'savePayment error:',
      error
    );

    return {
      success: false,
      message:
        getErrorMessage_(error)
    };

  } finally {
    try {
      lock.releaseLock();

    } catch (lockError) {
      console.warn(
        'Save-payment lock release error:',
        lockError
      );
    }
  }
}


function generateNextPaymentId_(sheet, date) {
  const datePart = Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyyMMdd'
  );

  const prefix = 'PAY-' + datePart + '-';

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return prefix + '0001';
  }

  const existingIds = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getDisplayValues()
    .flat();

  let highestSequence = 0;

  existingIds.forEach(function(paymentId) {
    const cleanId = String(paymentId || '').trim();

    if (!cleanId.startsWith(prefix)) {
      return;
    }

    const sequence = Number(
      cleanId.substring(prefix.length)
    );

    if (
      Number.isFinite(sequence) &&
      sequence > highestSequence
    ) {
      highestSequence = sequence;
    }
  });

  return (
    prefix +
    String(highestSequence + 1).padStart(3, '0')
  );
}


function generateNextReceiptNumber_(sheet, date) {
  const year = Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy'
  );

  const prefix = 'SFM-' + year + '-';

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return prefix + '000001';
  }

  const existingReceiptNumbers = sheet
    .getRange(2, 7, lastRow - 1, 1)
    .getDisplayValues()
    .flat();

  let highestSequence = 0;

  existingReceiptNumbers.forEach(function(receiptNumber) {
    const cleanReceipt = String(
      receiptNumber || ''
    ).trim();

    if (!cleanReceipt.startsWith(prefix)) {
      return;
    }

    const sequence = Number(
      cleanReceipt.substring(prefix.length)
    );

    if (
      Number.isFinite(sequence) &&
      sequence > highestSequence
    ) {
      highestSequence = sequence;
    }
  });

  return (
    prefix +
    String(highestSequence + 1).padStart(6, '0')
  );
}


function parsePaymentDate_(dateValue) {
  const parts = String(dateValue || '').split('-');

  if (parts.length !== 3) {
    throw new Error('Invalid payment date.');
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const parsedDate = new Date(
    year,
    month - 1,
    day
  );

  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid payment date.');
  }

  return parsedDate;
}


function formatServerCurrency_(value) {
  return APP_CONFIG.CURRENCY_SYMBOL + Number(value || 0).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}
