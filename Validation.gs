/**
 * Validation module
 */

/**
 * Validates all required worksheets and column headers.
 *
 * @return {Object}
 */
function validateDatabaseStructure_() {
  const spreadsheet = getDatabase_();

  const errors = [];
  const warnings = [];
  const sheetResults = [];

  Object.keys(APP_CONFIG.REQUIRED_HEADERS).forEach(
    function(sheetName) {
      const sheet = spreadsheet.getSheetByName(sheetName);
      const requiredHeaders =
        APP_CONFIG.REQUIRED_HEADERS[sheetName];

      if (!sheet) {
        errors.push(
          'Missing required sheet: ' + sheetName
        );

        sheetResults.push({
          sheetName: sheetName,
          exists: false,
          headersValid: false,
          rowCount: 0,
          issues: ['Sheet does not exist.']
        });

        return;
      }

      const issues = [];
      const lastColumn = sheet.getLastColumn();
      const lastRow = sheet.getLastRow();

      let actualHeaders = [];

      if (lastColumn === 0) {
        issues.push(
          'The sheet does not contain a header row.'
        );

      } else {
        actualHeaders = sheet
          .getRange(1, 1, 1, lastColumn)
          .getDisplayValues()[0]
          .map(function(header) {
            return String(header || '').trim();
          });
      }

      requiredHeaders.forEach(
        function(requiredHeader, index) {
          const actualHeader =
            actualHeaders[index] || '';

          if (actualHeader !== requiredHeader) {
            issues.push(
              'Column ' +
              columnNumberToLetter_(index + 1) +
              ' should be "' +
              requiredHeader +
              '" but currently contains "' +
              actualHeader +
              '".'
            );
          }
        }
      );

      if (
        actualHeaders.length >
        requiredHeaders.length
      ) {
        const extraHeaders = actualHeaders
          .slice(requiredHeaders.length)
          .filter(function(header) {
            return header !== '';
          });

        if (extraHeaders.length > 0) {
          warnings.push(
            sheetName +
            ' contains additional columns after the required fields: ' +
            extraHeaders.join(', ')
          );
        }
      }

      issues.forEach(function(issue) {
        errors.push(
          sheetName + ': ' + issue
        );
      });

      sheetResults.push({
        sheetName: sheetName,
        exists: true,
        headersValid: issues.length === 0,
        rowCount: Math.max(lastRow - 1, 0),
        issues: issues
      });
    }
  );

  return {
    success: errors.length === 0,
    spreadsheetName: spreadsheet.getName(),
    sheets: sheetResults,
    errors: errors,
    warnings: warnings
  };
}


/**
 * Returns safe database connection diagnostics.
 *
 * @return {Object}
 */
function getSystemConnectionStatus() {
  try {
    const validation =
      validateDatabaseStructure_();

    return {
      success: validation.success,
      appName: APP_CONFIG.APP_NAME,
      spreadsheetName:
        validation.spreadsheetName,
      message: validation.success
        ? 'The web application is connected to the database.'
        : 'The database connection works, but the structure needs correction.',
      sheets: validation.sheets,
      errors: validation.errors,
      warnings: validation.warnings
    };

  } catch (error) {
    console.error(
      'Connection test error:',
      error
    );

    return {
      success: false,
      appName: APP_CONFIG.APP_NAME,
      message: getErrorMessage_(error),
      sheets: [],
      errors: [getErrorMessage_(error)],
      warnings: []
    };
  }
}


/**
 * Gets the signed-in Google account email.
 *
 * The function fails closed when Google does not expose the email.
 *
 * @return {string}
 */
function getSignedInEmail_() {
  const email = normaliseEmail_(
    Session.getActiveUser().getEmail()
  );

  if (!email) {
    throw new Error(
      'Google did not provide the signed-in account email. Access cannot be ' +
      'verified securely. Confirm that you are signed in with an authorised ' +
      'school Google account and that the web app is deployed using the ' +
      'recommended access settings.'
    );
  }

  return email;
}


/**
 * Returns the current authorised user, using a short user-scoped cache.
 *
 * @return {Object}
 */
function getCurrentUser_() {
  const signedInEmail =
    getSignedInEmail_();

  const cache =
    CacheService.getUserCache();

  const cacheKey =
    CACHE_CONFIG.KEYS.CURRENT_USER_PREFIX +
    signedInEmail;

  const cachedUser =
    getCachedJson_(
      cache,
      cacheKey
    );

  if (cachedUser) {
    return cachedUser;
  }

  const user =
    loadCurrentUserFromSheet_(
      signedInEmail
    );

  putCachedJson_(
    cache,
    cacheKey,
    user,
    CACHE_CONFIG.TTL.CURRENT_USER
  );

  return user;
}


/**
 * Reads and validates one user directly from the Users sheet.
 *
 * @param {string} signedInEmail
 * @return {Object}
 */
function loadCurrentUserFromSheet_(
  signedInEmail
) {
  const users =
    getSheetObjects_(
      APP_CONFIG.SHEETS.USERS
    );

  const matchingUsers =
    users.filter(
      function(user) {
        return normaliseEmail_(
          user['Email']
        ) === signedInEmail;
      }
    );

  if (matchingUsers.length === 0) {
    throw new Error(
      'Access denied. The signed-in account is not listed in the Users sheet.'
    );
  }

  if (matchingUsers.length > 1) {
    throw new Error(
      'Access denied because the Users sheet contains duplicate records for the signed-in account.'
    );
  }

  const userRecord =
    matchingUsers[0];

  const role =
    String(
      userRecord['Role'] || ''
    ).trim();

  const active =
    toBoolean_(
      userRecord['Active']
    );

  const fullName =
    String(
      userRecord['Full Name'] || ''
    ).trim();

  if (!active) {
    throw new Error(
      'Access denied. Your user account is inactive. Contact the system owner.'
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      ROLE_PERMISSIONS,
      role
    )
  ) {
    throw new Error(
      'Access denied. The role "' +
      role +
      '" is not recognised. Valid roles are Admin and Management.'
    );
  }

  return {
    email: signedInEmail,
    fullName:
      fullName || signedInEmail,
    role: role,
    active: true,
    permissions:
      ROLE_PERMISSIONS[role].slice()
  };
}


/**
 * Returns either an authorised application session or a blocked response.
 *
 * @return {Object}
 */
function getApplicationSession() {
  try {
    const databaseValidation =
      getCachedDatabaseValidation_();

    if (!databaseValidation.success) {
      return {
        authorised: false,
        reasonCode: 'DATABASE_INVALID',
        message:
          'The application database structure is invalid. Contact the system owner.',
        errors: databaseValidation.errors
      };
    }

    const user = getCurrentUser_();

    return {
      authorised: true,
      message: 'Access granted.',
      user: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions
      },
      app: {
        name: APP_CONFIG.APP_NAME
      }
    };

  } catch (error) {
    console.warn(
      'Access validation failed:',
      error
    );

    return {
      authorised: false,
      reasonCode:
        classifyAccessError_(error),
      message:
        getErrorMessage_(error),
      errors: []
    };
  }
}


/**
 * Confirms that the current user has the required permission.
 *
 * @param {string} requiredPermission
 * @return {Object}
 */
function requirePermission_(
  requiredPermission
) {
  const validPermissions =
    Object.keys(
      APP_CONFIG.PERMISSIONS
    ).map(function(key) {
      return APP_CONFIG.PERMISSIONS[key];
    });

  if (
    validPermissions.indexOf(
      requiredPermission
    ) === -1
  ) {
    throw new Error(
      'Application configuration error: unknown permission "' +
      requiredPermission +
      '".'
    );
  }

  const user = getCurrentUser_();

  if (
    user.permissions.indexOf(
      requiredPermission
    ) === -1
  ) {
    throw new Error(
      'Permission denied. Your ' +
      user.role +
      ' role does not allow this action.'
    );
  }

  return user;
}


/**
 * Checks a permission without throwing an access error.
 *
 * @param {Object} user
 * @param {string} permission
 * @return {boolean}
 */
function userHasPermission_(user, permission) {
  return Boolean(
    user &&
    Array.isArray(user.permissions) &&
    user.permissions.indexOf(permission) !== -1
  );
}


/**
 * Categorises access errors.
 *
 * @param {*} error
 * @return {string}
 */
function classifyAccessError_(error) {
  const message =
    getErrorMessage_(error)
      .toLowerCase();

  if (
    message.indexOf(
      'did not provide'
    ) !== -1
  ) {
    return 'EMAIL_UNAVAILABLE';
  }

  if (
    message.indexOf(
      'not listed'
    ) !== -1
  ) {
    return 'USER_NOT_LISTED';
  }

  if (
    message.indexOf(
      'inactive'
    ) !== -1
  ) {
    return 'USER_INACTIVE';
  }

  if (
    message.indexOf(
      'duplicate'
    ) !== -1
  ) {
    return 'DUPLICATE_USER';
  }

  if (
    message.indexOf(
      'role'
    ) !== -1
  ) {
    return 'INVALID_ROLE';
  }

  if (
    message.indexOf(
      'database'
    ) !== -1 ||
    message.indexOf(
      'spreadsheet'
    ) !== -1
  ) {
    return 'DATABASE_ERROR';
  }

  return 'ACCESS_DENIED';
}


/**
 * Returns information required to construct the application shell.
 *
 * @return {Object}
 */
function getApplicationShellData() {
  try {
    const user =
      getCurrentUser_();

    return {
      success: true,
      authorised: true,

      application: {
        name:
          APP_CONFIG.APP_NAME,
        shortName:
          'School Fees',
        organisationName:
          APP_CONFIG.ORGANISATION_NAME,
        academicYear:
          APP_CONFIG.DEFAULT_ACADEMIC_YEAR,
        currency:
          APP_CONFIG.CURRENCY,
        currencySymbol:
          APP_CONFIG.CURRENCY_SYMBOL
      },

      user: {
        email:
          user.email,
        fullName:
          user.fullName,
        role:
          user.role,
        initials:
          getInitials_(
            user.fullName
          ),
        permissions:
          user.permissions || []
      },

      navigation:
        buildNavigationForUser_(
          user.permissions || []
        )
    };

  } catch (error) {
    console.warn(
      'Application shell access failed:',
      error
    );

    return {
      success: false,
      authorised: false,
      reasonCode:
        classifyAccessError_(error),
      message:
        getErrorMessage_(error),
      application: null,
      user: null,
      navigation: []
    };
  }
}


/**
 * Builds navigation based on role permissions.
 *
 * @param {Array<string>} permissions
 * @return {Array<Object>}
 */
function buildNavigationForUser_(
  permissions
) {
  const permissionSet =
    new Set(permissions || []);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      requiredPermission:
        APP_CONFIG.PERMISSIONS.VIEW_DASHBOARD
    },

    {
      id: 'students',
      label: 'Students',
      icon: 'students',
      requiredPermission:
        APP_CONFIG.PERMISSIONS.SEARCH_STUDENTS
    },

    {
      id: 'add-student',
      label: 'Add Student',
      icon: 'add-student',
      requiredPermission:
        APP_CONFIG.PERMISSIONS.ADD_STUDENT
    },

    {
      id: 'record-payment',
      label: 'Record Payment',
      icon: 'payment',
      requiredPermission:
        APP_CONFIG.PERMISSIONS.RECORD_PAYMENT
    },

    {
      id: 'reports',
      label: 'Reports',
      icon: 'reports',
      requiredPermission:
        APP_CONFIG.PERMISSIONS.VIEW_REPORTS
    },

    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      requiredPermission:
        APP_CONFIG.PERMISSIONS.VIEW_SETTINGS
    },

    {
      id: 'users',
      label: 'Users',
      icon: 'users',
      requiredPermission:
        APP_CONFIG.PERMISSIONS.MANAGE_USERS
    }
  ];

  return navigationItems.filter(
    function(item) {
      return permissionSet.has(
        item.requiredPermission
      );
    }
  );
}


/**
 * Loads the authorised application shell and the first dashboard payload
 * in one client/server round trip.
 *
 * @return {Object}
 */
function getInitialApplicationData() {
  const shell = getApplicationShellData();

  if (!shell || shell.success !== true || shell.authorised !== true) {
    return shell;
  }

  const permissions = shell.user.permissions || [];

  // Dashboard data is loaded only for Management. Admin starts on Students.
  shell.initialDashboard = permissions.indexOf(
    APP_CONFIG.PERMISSIONS.VIEW_DASHBOARD
  ) !== -1
    ? getDashboardData()
    : null;

  shell.initialStudents = permissions.indexOf(
    APP_CONFIG.PERMISSIONS.SEARCH_STUDENTS
  ) !== -1
    ? getStudents()
    : null;

  shell.defaultPage = shell.initialDashboard
    ? 'dashboard'
    : 'students';

  return shell;
}
