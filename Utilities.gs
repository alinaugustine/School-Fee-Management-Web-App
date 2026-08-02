/**
 * School Fee Management System
 *
 * Google Apps Script files share one global namespace. Functions may therefore
 * call helpers defined in another .gs file within the same Apps Script project.
 *
 * This public version contains no spreadsheet ID, deployment URL, real school
 * name, personal email address, student record, payment reference, or API key.
 */

const APP_CONFIG = Object.freeze({
  APP_NAME: 'School Fee Management System',
  ORGANISATION_NAME: 'Demo School',
  DEFAULT_ACADEMIC_YEAR: '2025–2026',
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',

  // The actual spreadsheet ID must be stored in Apps Script Properties.
  SPREADSHEET_PROPERTY: 'SCHOOL_FEE_SPREADSHEET_ID',

  SHEETS: Object.freeze({
    STUDENTS: 'Students',
    PAYMENTS: 'Payments',
    USERS: 'Users',
    SETTINGS: 'Settings'
  }),

  ROLES: Object.freeze({
    ADMIN: 'Admin',
    MANAGEMENT: 'Management'
  }),

  PERMISSIONS: Object.freeze({
    VIEW_DASHBOARD: 'VIEW_DASHBOARD',
    SEARCH_STUDENTS: 'SEARCH_STUDENTS',
    ADD_STUDENT: 'ADD_STUDENT',
    VIEW_STUDENT_PROFILE: 'VIEW_STUDENT_PROFILE',
    VIEW_PAYMENT_HISTORY: 'VIEW_PAYMENT_HISTORY',
    RECORD_PAYMENT: 'RECORD_PAYMENT',
    PRINT_RECEIPT: 'PRINT_RECEIPT',
    PRINT_STATEMENT: 'PRINT_STATEMENT',
    VIEW_REPORTS: 'VIEW_REPORTS',
    EXPORT_REPORTS: 'EXPORT_REPORTS',
    REVERSE_PAYMENT: 'REVERSE_PAYMENT',
    VIEW_SETTINGS: 'VIEW_SETTINGS',
    MANAGE_USERS: 'MANAGE_USERS'
  }),

  REQUIRED_HEADERS: Object.freeze({
    Students: [
      'Student ID',
      'Student Name',
      'Class',
      'Section',
      'Academic Year',
      'Admission Date',
      'Father Name',
      'Father Phone',
      'Mother Name',
      'Mother Phone',
      'Total Fee',
      'Funding Type',
      'Active Status'
    ],
    Payments: [
      'Payment ID',
      'Student ID',
      'Payment Date',
      'Amount',
      'Payment Method',
      'Reference Number',
      'Receipt Number',
      'Notes',
      'Entered By',
      'Timestamp',
      'Reversed',
      'Reversal Reason',
      'Reversed Amount',
      'Reversal Timestamp',
      'Reversed By'
    ],
    Users: [
      'Email',
      'Full Name',
      'Role',
      'Active'
    ],
    Settings: [
      'Setting',
      'Value'
    ]
  })
});

const ROLE_PERMISSIONS = Object.freeze({
  Admin: Object.freeze([
    APP_CONFIG.PERMISSIONS.SEARCH_STUDENTS,
    APP_CONFIG.PERMISSIONS.ADD_STUDENT,
    APP_CONFIG.PERMISSIONS.VIEW_STUDENT_PROFILE,
    APP_CONFIG.PERMISSIONS.VIEW_PAYMENT_HISTORY,
    APP_CONFIG.PERMISSIONS.RECORD_PAYMENT,
    APP_CONFIG.PERMISSIONS.PRINT_RECEIPT,
    APP_CONFIG.PERMISSIONS.PRINT_STATEMENT,
    APP_CONFIG.PERMISSIONS.VIEW_REPORTS,
    APP_CONFIG.PERMISSIONS.EXPORT_REPORTS,
    APP_CONFIG.PERMISSIONS.REVERSE_PAYMENT,
    APP_CONFIG.PERMISSIONS.VIEW_SETTINGS,
    APP_CONFIG.PERMISSIONS.MANAGE_USERS
  ]),
  Management: Object.freeze([
    APP_CONFIG.PERMISSIONS.VIEW_DASHBOARD,
    APP_CONFIG.PERMISSIONS.SEARCH_STUDENTS,
    APP_CONFIG.PERMISSIONS.ADD_STUDENT,
    APP_CONFIG.PERMISSIONS.VIEW_STUDENT_PROFILE,
    APP_CONFIG.PERMISSIONS.VIEW_PAYMENT_HISTORY,
    APP_CONFIG.PERMISSIONS.RECORD_PAYMENT,
    APP_CONFIG.PERMISSIONS.PRINT_RECEIPT,
    APP_CONFIG.PERMISSIONS.PRINT_STATEMENT,
    APP_CONFIG.PERMISSIONS.VIEW_REPORTS,
    APP_CONFIG.PERMISSIONS.EXPORT_REPORTS,
    APP_CONFIG.PERMISSIONS.REVERSE_PAYMENT,
    APP_CONFIG.PERMISSIONS.VIEW_SETTINGS,
    APP_CONFIG.PERMISSIONS.MANAGE_USERS
  ])
});

const CACHE_CONFIG = Object.freeze({
  KEYS: Object.freeze({
    STUDENT_ACCOUNTS: 'student_accounts_v2',
    FINANCE_SNAPSHOT: 'finance_snapshot_v1',
    DASHBOARD_DATA: 'dashboard_data_v2',
    DATABASE_VALIDATION: 'database_validation_v2',
    CURRENT_USER_PREFIX: 'current_user_v2_'
  }),
  TTL: Object.freeze({
    STUDENT_ACCOUNTS: 300,
    FINANCE_SNAPSHOT: 300,
    DASHBOARD_DATA: 180,
    DATABASE_VALIDATION: 300,
    CURRENT_USER: 300
  })
});

/**
 * Web application entry point.
 *
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_CONFIG.APP_NAME)
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1'
    );
}


/**
 * One-time application setup.
 *
 * Stores the active spreadsheet ID in Script Properties and validates
 * the database structure.
 *
 * @return {Object}
 */
function initialiseApplication() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (!spreadsheet) {
      throw new Error(
        'No active spreadsheet was found. Open the School Fee Management ' +
        'System spreadsheet and access Apps Script through ' +
        'Extensions → Apps Script.'
      );
    }

    PropertiesService
      .getScriptProperties()
      .setProperty(
        APP_CONFIG.SPREADSHEET_PROPERTY,
        spreadsheet.getId()
      );

    clearDatabaseValidationCache_();

    const validation = validateDatabaseStructure_();

    const result = {
      success: validation.success,
      message: validation.success
        ? 'Application initialised and database structure validated successfully.'
        : 'Application initialised, but database validation found problems.',
      spreadsheetName: spreadsheet.getName(),
      spreadsheetIdStored: true,
      validation: validation
    };

    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error) {
    console.error('Initialisation error:', error);

    throw new Error(
      'Application initialisation failed: ' +
      getErrorMessage_(error)
    );
  }
}


/**
 * Opens the database spreadsheet using the stored spreadsheet ID.
 *
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getDatabase_() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(APP_CONFIG.SPREADSHEET_PROPERTY);

  if (!spreadsheetId) {
    throw new Error(
      'The database connection has not been initialised. ' +
      'Run initialiseApplication() from the Apps Script editor.'
    );
  }

  try {
    return SpreadsheetApp.openById(spreadsheetId);

  } catch (error) {
    throw new Error(
      'The database spreadsheet could not be opened. Confirm that it exists ' +
      'and that the Apps Script owner has permission to access it. ' +
      'Technical details: ' +
      getErrorMessage_(error)
    );
  }
}


/**
 * Reads a JSON value from a cache.
 *
 * @param {GoogleAppsScript.Cache.Cache} cache
 * @param {string} key
 * @return {*|null}
 */
function getCachedJson_(cache, key) {
  const cachedValue = cache.get(key);

  if (!cachedValue) {
    return null;
  }

  try {
    return JSON.parse(cachedValue);

  } catch (error) {
    console.warn(
      'Cached value could not be parsed for key "' +
      key +
      '":',
      error
    );

    cache.remove(key);

    return null;
  }
}


/**
 * Stores a JSON value in a cache without allowing cache failures to
 * interrupt the application.
 *
 * @param {GoogleAppsScript.Cache.Cache} cache
 * @param {string} key
 * @param {*} value
 * @param {number} expirationSeconds
 */
function putCachedJson_(
  cache,
  key,
  value,
  expirationSeconds
) {
  try {
    cache.put(
      key,
      JSON.stringify(value),
      expirationSeconds
    );

  } catch (error) {
    console.warn(
      'Value could not be cached for key "' +
      key +
      '":',
      error
    );
  }
}


/**
 * Clears all cached finance data after a student or payment write.
 */
function clearFinanceDataCache_() {
  CacheService
    .getScriptCache()
    .removeAll([
      CACHE_CONFIG.KEYS.STUDENT_ACCOUNTS,
      CACHE_CONFIG.KEYS.FINANCE_SNAPSHOT,
      CACHE_CONFIG.KEYS.DASHBOARD_DATA
    ]);
}


/**
 * Clears cached structural validation after setup or schema changes.
 */
function clearDatabaseValidationCache_() {
  CacheService
    .getScriptCache()
    .remove(
      CACHE_CONFIG.KEYS.DATABASE_VALIDATION
    );
}


/**
 * Returns cached database validation when available.
 *
 * @return {Object}
 */
function getCachedDatabaseValidation_() {
  const cache =
    CacheService.getScriptCache();

  const cachedValidation =
    getCachedJson_(
      cache,
      CACHE_CONFIG.KEYS.DATABASE_VALIDATION
    );

  if (cachedValidation) {
    return cachedValidation;
  }

  const validation =
    validateDatabaseStructure_();

  putCachedJson_(
    cache,
    CACHE_CONFIG.KEYS.DATABASE_VALIDATION,
    validation,
    CACHE_CONFIG.TTL.DATABASE_VALIDATION
  );

  return validation;
}


/**
 * Reads an entire populated worksheet in one batch.
 *
 * @param {string} sheetName
 * @return {Array<Array<*>>}
 */
function getSheetData_(sheetName) {
  const spreadsheet =
    getDatabase_();

  const sheet =
    spreadsheet.getSheetByName(
      sheetName
    );

  if (!sheet) {
    throw new Error(
      'Required sheet not found: ' +
      sheetName
    );
  }

  const lastRow =
    sheet.getLastRow();

  const lastColumn =
    sheet.getLastColumn();

  if (
    lastRow === 0 ||
    lastColumn === 0
  ) {
    return [];
  }

  return sheet
    .getRange(
      1,
      1,
      lastRow,
      lastColumn
    )
    .getValues();
}


/**
 * Reads a worksheet and converts its rows into objects keyed by header.
 *
 * @param {string} sheetName
 * @return {Array<Object>}
 */
function getSheetObjects_(sheetName) {
  const data =
    getSheetData_(sheetName);

  if (data.length < 2) {
    return [];
  }

  const headers = data[0].map(
    function(header) {
      return String(
        header || ''
      ).trim();
    }
  );

  return data
    .slice(1)
    .filter(function(row) {
      return row.some(function(value) {
        return (
          value !== '' &&
          value !== null
        );
      });
    })
    .map(function(row, rowIndex) {
      const record = {
        _sheetRow: rowIndex + 2
      };

      headers.forEach(
        function(header, columnIndex) {
          if (header) {
            record[header] =
              row[columnIndex];
          }
        }
      );

      return record;
    });
}


/**
 * Converts checkbox and common text representations into Boolean values.
 *
 * @param {*} value
 * @return {boolean}
 */
function toBoolean_(value) {
  if (value === true) {
    return true;
  }

  if (
    value === false ||
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return false;
  }

  const normalisedValue =
    String(value)
      .trim()
      .toLowerCase();

  return [
    'true',
    'yes',
    'active',
    '1',
    'y',
    'checked'
  ].includes(normalisedValue);
}


/**
 * Normalises email addresses.
 *
 * @param {*} email
 * @return {string}
 */
function normaliseEmail_(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}


/**
 * Normalises student IDs for reliable matching.
 *
 * @param {*} studentId
 * @return {string}
 */
function normaliseStudentId_(studentId) {
  return String(studentId || '')
    .trim()
    .toUpperCase();
}


/**
 * Normalises the student funding type.
 *
 * @param {*} value
 * @return {string}
 */
function normaliseFundingType_(value) {
  return String(value || '')
    .trim()
    .toUpperCase() === 'RTE'
      ? 'RTE'
      : 'Regular';
}


/**
 * Converts a positive column number into a spreadsheet column letter.
 *
 * @param {number} columnNumber
 * @return {string}
 */
function columnNumberToLetter_(
  columnNumber
) {
  let number = columnNumber;
  let letters = '';

  while (number > 0) {
    const remainder =
      (number - 1) % 26;

    letters =
      String.fromCharCode(
        65 + remainder
      ) + letters;

    number = Math.floor(
      (number - 1) / 26
    );
  }

  return letters;
}


/**
 * Produces a safe error message.
 *
 * @param {*} error
 * @return {string}
 */
function getErrorMessage_(error) {
  if (
    error &&
    error.message
  ) {
    return error.message;
  }

  return String(
    error ||
    'An unknown error occurred.'
  );
}


/**
 * Returns up to two initials from a full name.
 *
 * @param {string} fullName
 * @return {string}
 */
function getInitials_(fullName) {
  const safeName =
    String(fullName || '').trim();

  if (!safeName) {
    return 'U';
  }

  return safeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function(namePart) {
      return namePart
        .charAt(0)
        .toUpperCase();
    })
    .join('');
}


/**
 * Returns Settings sheet values as a key/value map.
 *
 * @return {Object}
 */
function getSettingsMap_() {
  const settings = {};

  getSheetObjects_(
    APP_CONFIG.SHEETS.SETTINGS
  ).forEach(function(record) {
    const key = String(
      record['Setting'] || ''
    ).trim();

    if (key) {
      settings[key] = record['Value'];
    }
  });

  return settings;
}


/**
 * Returns all finance views needed after a student/payment write in one
 * client/server response. Cached snapshot data is reused across the views.
 *
 * @param {string} studentId
 * @return {Object}
 */
function buildFinanceRefreshPayload_(studentId) {
  const cleanStudentId = normaliseStudentId_(studentId);
  const user = getCurrentUser_();

  return {
    // Admin is not permitted to load dashboard totals.
    dashboard: userHasPermission_(
      user,
      APP_CONFIG.PERMISSIONS.VIEW_DASHBOARD
    )
      ? getDashboardData()
      : null,

    students: userHasPermission_(
      user,
      APP_CONFIG.PERMISSIONS.SEARCH_STUDENTS
    )
      ? getStudents()
      : null,

    studentDetails:
      cleanStudentId && userHasPermission_(
        user,
        APP_CONFIG.PERMISSIONS.VIEW_STUDENT_PROFILE
      )
        ? getStudentDetails(cleanStudentId)
        : null
  };
}


/**
 * Clears all application caches.
 *
 * Run this manually from the Apps Script editor after changing Users,
 * Settings, sheet headers, or making direct spreadsheet edits.
 *
 * @return {Object}
 */
function clearApplicationCaches() {
  const scriptCache =
    CacheService.getScriptCache();

  scriptCache.removeAll([
    CACHE_CONFIG.KEYS.STUDENT_ACCOUNTS,
    CACHE_CONFIG.KEYS.FINANCE_SNAPSHOT,
    CACHE_CONFIG.KEYS.DASHBOARD_DATA,
    CACHE_CONFIG.KEYS.DATABASE_VALIDATION
  ]);

  const email =
    normaliseEmail_(
      Session.getActiveUser().getEmail()
    );

  if (email) {
    CacheService
      .getUserCache()
      .remove(
        CACHE_CONFIG.KEYS.CURRENT_USER_PREFIX +
        email
      );
  }

  return {
    success: true,
    message: 'Application caches cleared.'
  };
}
