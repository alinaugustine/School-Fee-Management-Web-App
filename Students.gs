/**
 * Students module
 */

/**
 * Builds student fee-account records for the Students page.
 *
 * Includes:
 * - Student details
 * - Total fee
 * - Payments received
 * - Outstanding balance
 * - Payment status
 *
 * Reversed payments are excluded.
 *
 * @return {Array<Object>}
 */
function calculateStudentAccounts_() {
  return calculateFinanceSnapshot_().studentAccounts;
}


/**
 * Returns calculated student accounts from cache when available.
 *
 * @return {Array<Object>}
 */
function getCachedStudentAccounts_() {
  const cache =
    CacheService.getScriptCache();

  const cachedStudents =
    getCachedJson_(
      cache,
      CACHE_CONFIG.KEYS.STUDENT_ACCOUNTS
    );

  if (cachedStudents) {
    return cachedStudents;
  }

  const students =
    getCachedFinanceSnapshot_().studentAccounts;

  /*
   * Keep the legacy student-account cache populated for compatibility,
   * while the shared finance snapshot remains the source of truth.
   */
  putCachedJson_(
    cache,
    CACHE_CONFIG.KEYS.STUDENT_ACCOUNTS,
    students,
    CACHE_CONFIG.TTL.STUDENT_ACCOUNTS
  );

  return students;
}


/**
 * Returns active student fee accounts for the Students page.
 *
 * Required permission:
 * SEARCH_STUDENTS
 *
 * @param {boolean} previewMode
 * @return {Object}
 */
function getStudents() {
  try {
    requirePermission_(APP_CONFIG.PERMISSIONS.SEARCH_STUDENTS);

    const students = getCachedStudentAccounts_();

    const classes = Array.from(
      new Set(
        students
          .map(function(student) {
            return student.className;
          })
          .filter(function(className) {
            return className && className !== '—';
          })
      )
    ).sort(function(firstClass, secondClass) {
      return firstClass.localeCompare(
        secondClass,
        undefined,
        {
          numeric: true,
          sensitivity: 'base'
        }
      );
    });

    const sections = Array.from(
      new Set(
        students
          .map(function(student) {
            return student.section;
          })
          .filter(function(section) {
            return section && section !== '—';
          })
      )
    ).sort(function(firstSection, secondSection) {
      return firstSection.localeCompare(
        secondSection,
        undefined,
        {
          numeric: true,
          sensitivity: 'base'
        }
      );
    });

    return {
      success: true,
      generatedAt: Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        'dd MMM yyyy, HH:mm'
      ),
      summary: {
        totalStudents: students.length
      },
      filters: {
        classes: classes,
        sections: sections,
        statuses: [
          'Fully Paid',
          'Partially Paid',
          'Unpaid',
          'RTE'
        ]
      },
      students: students
    };

  } catch (error) {
    console.error(
      'Student list error:',
      error
    );

    return {
      success: false,
      message: getErrorMessage_(error),
      generatedAt: '',
      summary: {
        totalStudents: 0
      },
      filters: {
        classes: [],
        sections: [],
        statuses: [
          'Fully Paid',
          'Partially Paid',
          'Unpaid',
          'RTE'
        ]
      },
      students: []
    };
  }
}


/**
 * Returns one student's account details and payment history.
 *
 * @param {string} studentId
 * @param {boolean} previewMode
 * @return {Object}
 */
function getStudentDetails(studentId) {
  try {
    requirePermission_(APP_CONFIG.PERMISSIONS.VIEW_STUDENT_PROFILE);

    const cleanStudentId =
      normaliseStudentId_(
        studentId
      );

    if (!cleanStudentId) {
      return {
        success: false,
        message: 'A student ID is required.'
      };
    }

    const students =
      getCachedStudentAccounts_();

    const student =
      students.find(
        function(item) {
          return normaliseStudentId_(
            item.studentId
          ) === cleanStudentId;
        }
      );

    if (!student) {
      return {
        success: false,
        message:
          'The selected student could not be found.'
      };
    }

    const spreadsheet =
      getDatabase_();

    const paymentRows =
      readDashboardSheetRows_(
        spreadsheet,
        APP_CONFIG.SHEETS.PAYMENTS
      );

    const payments =
      paymentRows
        .filter(function(payment) {
          const paymentStudentId =
            normaliseStudentId_(
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

          const isReversed =
            getDashboardBoolean_(
              payment,
              [
                'Reversed',
                'Is Reversed',
                'Cancelled',
                'Void'
              ],
              false
            );

          const originalAmount = getDashboardNumber_(
            payment,
            ['Amount', 'Amount Paid', 'Payment Amount']
          );
          const reversedAmount = getDashboardNumber_(
            payment,
            ['Reversed Amount']
          );
          const remainingAmount = isReversed
            ? 0
            : Math.max(originalAmount - reversedAmount, 0);

          return (
            paymentStudentId === cleanStudentId &&
            remainingAmount > 0
          );
        })
        .map(function(payment) {
          const paymentDateValue =
            getDashboardValue_(
              payment,
              [
                'Payment Date',
                'Date'
              ]
            );

          const timestampValue =
            getDashboardValue_(
              payment,
              [
                'Timestamp',
                'Entered At',
                'Created At'
              ]
            );

          return {
            paymentId:
              getDashboardText_(
                payment,
                [
                  'Payment ID',
                  'PaymentID'
                ]
              ),

            paymentDate:
              formatPaymentHistoryDate_(
                paymentDateValue
              ),

            paymentDateSort:
              getPaymentDateSortValue_(
                paymentDateValue,
                timestampValue
              ),

            originalAmount:
              roundDashboardMoney_(
                getDashboardNumber_(
                  payment,
                  ['Amount', 'Amount Paid', 'Payment Amount']
                )
              ),

            reversedAmount:
              roundDashboardMoney_(
                getDashboardNumber_(
                  payment,
                  ['Reversed Amount']
                )
              ),

            amount:
              roundDashboardMoney_(
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

            remainingReversibleAmount:
              roundDashboardMoney_(
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

            paymentMethod:
              getDashboardText_(
                payment,
                [
                  'Payment Method',
                  'Method'
                ]
              ) || '—',

            referenceNumber:
              getDashboardText_(
                payment,
                [
                  'Reference Number',
                  'Reference',
                  'Transaction ID'
                ]
              ) || '—',

            receiptNumber:
              getDashboardText_(
                payment,
                [
                  'Receipt Number',
                  'Receipt No'
                ]
              ) || '—',

            notes:
              getDashboardText_(
                payment,
                [
                  'Notes',
                  'Payment Notes'
                ]
              ),

            enteredBy:
              getDashboardText_(
                payment,
                [
                  'Entered By',
                  'Created By'
                ]
              ) || '—'
          };
        })
        .sort(
          function(
            firstPayment,
            secondPayment
          ) {
            return (
              secondPayment.paymentDateSort -
              firstPayment.paymentDateSort
            );
          }
        )
        .map(function(payment) {
          delete payment.paymentDateSort;

          return payment;
        });

    return {
      success: true,
      student: student,
      payments: payments
    };

  } catch (error) {
    console.error(
      'getStudentDetails error:',
      error
    );

    return {
      success: false,
      message:
        getErrorMessage_(error)
    };
  }
}


function formatPaymentHistoryDate_(value) {
  if (!value) {
    return '—';
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (isNaN(date.getTime())) {
    return String(value);
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd/MM/yyyy'
  );
}


function getPaymentDateSortValue_(
  paymentDateValue,
  timestampValue
) {
  const paymentDate =
    paymentDateValue instanceof Date
      ? paymentDateValue
      : new Date(paymentDateValue);

  if (!isNaN(paymentDate.getTime())) {
    return paymentDate.getTime();
  }

  const timestamp =
    timestampValue instanceof Date
      ? timestampValue
      : new Date(timestampValue);

  if (!isNaN(timestamp.getTime())) {
    return timestamp.getTime();
  }

  return 0;
}


/**
 * Adds a new student to the Students sheet.
 *
 * Required permission:
 * ADD_STUDENT
 *
 * Expected Students sheet columns:
 * Student ID, Student Name, Class, Section, Academic Year,
 * Admission Date, Father Name, Father Phone, Mother Name,
 * Mother Phone, Total Fee, Funding Type, Active Status
 *
 * @param {Object} studentData
 * @return {Object}
 */
function addStudent(studentData) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    requirePermission_(
      APP_CONFIG.PERMISSIONS.ADD_STUDENT
    );

    if (!studentData) {
      return {
        success: false,
        message: 'Student information is required.'
      };
    }

    const studentName = String(
      studentData.studentName || ''
    ).trim();

    const className = String(
      studentData.className || ''
    ).trim();

    const section = String(
      studentData.section || ''
    ).trim();

    const fatherName = String(
      studentData.fatherName || ''
    ).trim();

    const fatherPhone = String(
      studentData.fatherPhone || ''
    ).trim();

    const motherName = String(
      studentData.motherName || ''
    ).trim();

    const motherPhone = String(
      studentData.motherPhone || ''
    ).trim();

    const totalFee = Number(
      studentData.totalFee
    );
    const fundingType = normaliseFundingType_(
      studentData.fundingType
    );

    const effectiveTotalFee = totalFee;

    const activeStatusText = String(
      studentData.studentStatus || 'Active'
    )
      .trim()
      .toLowerCase();

    const activeStatus =
  activeStatusText === 'inactive'
    ? 'Inactive'
    : 'Active';

    if (!studentName) {
      return {
        success: false,
        message: 'Student name is required.'
      };
    }

    if (!className) {
      return {
        success: false,
        message: 'Class is required.'
      };
    }

    if (!section) {
      return {
        success: false,
        message: 'Section is required.'
      };
    }

    if (!fatherPhone && !motherPhone) {
      return {
        success: false,
        message:
          'Enter at least one parent phone number.'
      };
    }

    if (
      !Number.isFinite(totalFee) ||
      totalFee < 0
    ) {
      return {
        success: false,
        message: 'Enter a valid total fee.'
      };
    }

    const spreadsheet = getDatabase_();

    const sheet = spreadsheet.getSheetByName(
      APP_CONFIG.SHEETS.STUDENTS
    );

    if (!sheet) {
      return {
        success: false,
        message: 'The Students sheet could not be found.'
      };
    }

    const studentId =
      generateNextStudentId_(sheet);

    const lastColumn = sheet.getLastColumn();

    if (lastColumn < 1) {
      return {
        success: false,
        message:
          'The Students sheet does not contain a header row.'
      };
    }

    const headers = sheet
      .getRange(1, 1, 1, lastColumn)
      .getDisplayValues()[0]
      .map(function(header) {
        return String(header || '').trim();
      });

    const requiredHeaders =
      APP_CONFIG.REQUIRED_HEADERS.Students;

    const missingHeaders = requiredHeaders.filter(
      function(requiredHeader) {
        return headers.indexOf(requiredHeader) === -1;
      }
    );

    if (missingHeaders.length > 0) {
      return {
        success: false,
        message:
          'The Students sheet is missing required columns: ' +
          missingHeaders.join(', ')
      };
    }

    const settings = getSettingsMap_();

    const academicYear = String(
      studentData.academicYear ||
      settings['Academic Year'] ||
      APP_CONFIG.DEFAULT_ACADEMIC_YEAR
    ).trim();

    const admissionDate = parseOptionalDate_(
      studentData.admissionDate
    );

    const rowRecord = {
      'Student ID': studentId,
      'Student Name': studentName,
      'Class': className,
      'Section': section,
      'Academic Year': academicYear,
      'Admission Date': admissionDate || '',
      'Father Name': fatherName,
      'Father Phone': fatherPhone,
      'Mother Name': motherName,
      'Mother Phone': motherPhone,
      'Total Fee': roundDashboardMoney_(effectiveTotalFee),
      'Funding Type': fundingType,
      'Active Status': activeStatus
    };

    const rowValues = headers.map(function(header) {
      return Object.prototype.hasOwnProperty.call(
        rowRecord,
        header
      )
        ? rowRecord[header]
        : '';
    });

    sheet.appendRow(rowValues);

    const newRow = sheet.getLastRow();

    const admissionDateColumn =
      headers.indexOf('Admission Date') + 1;

    const totalFeeColumn =
      headers.indexOf('Total Fee') + 1;

    if (
      admissionDate &&
      admissionDateColumn > 0
    ) {
      sheet
        .getRange(newRow, admissionDateColumn)
        .setNumberFormat('dd/MM/yyyy');
    }

    if (totalFeeColumn > 0) {
      sheet
        .getRange(newRow, totalFeeColumn)
        .setNumberFormat('₹#,##0.00');
    }

    clearFinanceDataCache_();

    const refreshPayload =
      buildFinanceRefreshPayload_(studentId);

    return {
      success: true,
      message:
        'Student added successfully. Student ID: ' +
        studentId,
      studentId: studentId,
      refreshPayload: refreshPayload
    };

  } catch (error) {
    console.error('addStudent error:', error);

    return {
      success: false,
      message: getErrorMessage_(error)
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (lockError) {
      console.warn(
        'Add-student lock release error:',
        lockError
      );
    }
  }
}


/**
 * Updates an existing student record.
 *
 * Required permission:
 * ADD_STUDENT
 *
 * @param {Object} studentData
 * @return {Object}
 */
function updateStudent(studentData) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    requirePermission_(
      APP_CONFIG.PERMISSIONS.ADD_STUDENT
    );

    if (!studentData) {
      return {
        success: false,
        message: 'Student information is required.'
      };
    }

    const studentId = normaliseStudentId_(
      studentData.studentId
    );

    const studentName = String(
      studentData.studentName || ''
    ).trim();

    const className = String(
      studentData.className || ''
    ).trim();

    const section = String(
      studentData.section || ''
    ).trim();


    const fatherName = String(
      studentData.fatherName || ''
    ).trim();

    const fatherPhone = String(
      studentData.fatherPhone || ''
    ).trim();

    const motherName = String(
      studentData.motherName || ''
    ).trim();

    const motherPhone = String(
      studentData.motherPhone || ''
    ).trim();

    const totalFee = Number(
      studentData.totalFee
    );

    const fundingType = normaliseFundingType_(
      studentData.fundingType
    );

    const effectiveTotalFee = totalFee;

    const activeStatusText = String(
      studentData.studentStatus || 'Active'
    )
      .trim()
      .toLowerCase();

    const activeStatus =
  activeStatusText === 'inactive'
    ? 'Inactive'
    : 'Active';

    if (!studentId) {
      return {
        success: false,
        message: 'Student ID is required.'
      };
    }

    if (!studentName) {
      return {
        success: false,
        message: 'Student name is required.'
      };
    }

    if (!className) {
      return {
        success: false,
        message: 'Class is required.'
      };
    }

    if (!section) {
      return {
        success: false,
        message: 'Section is required.'
      };
    }

    if (!fatherPhone && !motherPhone) {
      return {
        success: false,
        message:
          'Enter at least one parent phone number.'
      };
    }

    if (
      !Number.isFinite(totalFee) ||
      totalFee < 0
    ) {
      return {
        success: false,
        message: 'Enter a valid total fee.'
      };
    }

    const spreadsheet = getDatabase_();

    const sheet = spreadsheet.getSheetByName(
      APP_CONFIG.SHEETS.STUDENTS
    );

    if (!sheet) {
      return {
        success: false,
        message: 'The Students sheet could not be found.'
      };
    }

    const values = sheet
      .getDataRange()
      .getValues();

    if (values.length < 2) {
      return {
        success: false,
        message: 'No student records were found.'
      };
    }

    const headers = values[0].map(function(header) {
      return String(header || '').trim();
    });

    const studentIdColumn =
      headers.indexOf('Student ID');

    if (studentIdColumn === -1) {
      return {
        success: false,
        message:
          'The Student ID column is missing.'
      };
    }

    let studentRowIndex = -1;

    for (
      let rowIndex = 1;
      rowIndex < values.length;
      rowIndex++
    ) {
      const rowStudentId = normaliseStudentId_(
        values[rowIndex][studentIdColumn]
      );

      if (rowStudentId === studentId) {
        studentRowIndex = rowIndex;
        break;
      }
    }
if (studentRowIndex === -1) {
  return {
    success: false,
    message:
      'The selected student could not be found.'
  };
}

const existingRow =
  values[studentRowIndex];

const academicYearColumn =
  headers.indexOf('Academic Year');

const admissionDateColumnIndex =
  headers.indexOf('Admission Date');

const existingAcademicYear =
  academicYearColumn >= 0
    ? String(
        existingRow[
          academicYearColumn
        ] || ''
      ).trim()
    : '';

const submittedAcademicYear =
  String(
    studentData.academicYear || ''
  ).trim();

const academicYear =
  submittedAcademicYear ||
  existingAcademicYear;

const submittedAdmissionDate =
  String(
    studentData.admissionDate || ''
  ).trim();

let admissionDate;

if (submittedAdmissionDate) {
  admissionDate =
    parseOptionalDate_(
      submittedAdmissionDate
    );
} else {
  admissionDate =
    admissionDateColumnIndex >= 0
      ? existingRow[
          admissionDateColumnIndex
        ]
      : '';
}

const rowRecord = {

      'Student ID': studentId,
      'Student Name': studentName,
      'Class': className,
      'Section': section,
      'Academic Year': academicYear,
      'Admission Date': admissionDate || '',
      'Father Name': fatherName,
      'Father Phone': fatherPhone,
      'Mother Name': motherName,
      'Mother Phone': motherPhone,
      'Total Fee': roundDashboardMoney_(
        effectiveTotalFee
      ),
      'Funding Type': fundingType,
      'Active Status': activeStatus
    };

    const updatedRow = headers.map(function(header) {
      if (
        Object.prototype.hasOwnProperty.call(
          rowRecord,
          header
        )
      ) {
        return rowRecord[header];
      }

      return values[studentRowIndex][
        headers.indexOf(header)
      ];
    });

    const sheetRowNumber =
      studentRowIndex + 1;

    sheet
      .getRange(
        sheetRowNumber,
        1,
        1,
        headers.length
      )
      .setValues([updatedRow]);

    const admissionDateColumn =
      headers.indexOf('Admission Date') + 1;

    const totalFeeColumn =
      headers.indexOf('Total Fee') + 1;

    if (admissionDateColumn > 0) {
      sheet
        .getRange(
          sheetRowNumber,
          admissionDateColumn
        )
        .setNumberFormat('dd/MM/yyyy');
    }

    if (totalFeeColumn > 0) {
      sheet
        .getRange(
          sheetRowNumber,
          totalFeeColumn
        )
        .setNumberFormat('₹#,##0.00');
    }

    clearFinanceDataCache_();

    const refreshPayload =
      buildFinanceRefreshPayload_(studentId);

    return {
      success: true,
      message: 'Student updated successfully.',
      studentId: studentId,
      refreshPayload: refreshPayload
    };

  } catch (error) {
    console.error(
      'updateStudent error:',
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
        'Update-student lock release error:',
        lockError
      );
    }
  }
}


/**
 * Parses an optional yyyy-MM-dd value.
 *
 * @param {*} value
 * @return {Date|null}
 */
function parseOptionalDate_(value) {
  const cleanValue = String(
    value || ''
  ).trim();

  if (!cleanValue) {
    return null;
  }

  const parts = cleanValue.split('-');

  if (parts.length !== 3) {
    throw new Error(
      'Admission date is invalid.'
    );
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (
    isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(
      'Admission date is invalid.'
    );
  }

  return date;
}


/**
 * Generates the next system-controlled Student ID.
 *
 * Format:
 * STU-000001
 * STU-000002
 *
 * The addStudent() function already holds a script lock, which prevents
 * simultaneous submissions from receiving the same ID.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @return {string}
 */
function generateNextStudentId_(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 'STU-000001';
  }

  const studentIdColumn = 1;

  const existingIds = sheet
    .getRange(
      2,
      studentIdColumn,
      lastRow - 1,
      1
    )
    .getDisplayValues()
    .flat();

  let highestSequence = 0;

  existingIds.forEach(function(studentId) {
    const cleanId = normaliseStudentId_(
      studentId
    );

    const match = cleanId.match(
      /^STU-(\d+)$/
    );

    if (!match) {
      return;
    }

    const sequence = Number(match[1]);

    if (
      Number.isFinite(sequence) &&
      sequence > highestSequence
    ) {
      highestSequence = sequence;
    }
  });

  return (
    'STU-' +
    String(highestSequence + 1)
      .padStart(3, '0')
  );
}
