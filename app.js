/** Application bootstrap and navigation — sanitized portfolio version. */

const PAGE_CONFIGURATION = {
      dashboard: {
        title: 'Dashboard',
        subtitle: 'School fee collection overview'
      },

      students: {
        title: 'Students',
        subtitle: 'Search and review student fee accounts'
      },

      'record-payment': {
        title: 'Record Payment',
        subtitle: 'Enter and confirm a student fee payment'
      },

      reports: {
        title: 'Reports',
        subtitle: 'Track student outreach and payment completion'
      },

      settings: {
        title: 'Settings',
        subtitle: 'Manage application configuration'
      }
    };

let selectedStudentRecord = null;

    let applicationState = {
  currentPage: 'dashboard',
  session: null,

  students: [],
  studentsLoaded: false,
  dashboardLoaded: false,
  initialDashboard: null,
  initialStudents: null,
  studentFilterOptionsLoaded: false,

  reportStudents: [],
  reportsLoaded: false
};


  document.addEventListener('DOMContentLoaded', function() {
    document
  .getElementById('reportSearch')
  ?.addEventListener(
    'input',
    applyReportFilters
  );

document
  .getElementById('reportClassFilter')
  ?.addEventListener(
    'change',
    applyReportFilters
  );

document
  .getElementById('reportSectionFilter')
  ?.addEventListener(
    'change',
    applyReportFilters
  );

document
  .getElementById('reportSort')
  ?.addEventListener(
    'change',
    applyReportFilters
  );
  injectIcons();
  loadApplication();

  const confirmReverseButton =
  document.getElementById('confirmReverseButton');

if (confirmReverseButton) {
  confirmReverseButton.addEventListener(
    'click',
    confirmReversePayment
  );
}
  const studentSearchInput =
    document.getElementById('studentSearchInput');

  const studentClassFilter =
    document.getElementById('studentClassFilter');

  const studentSectionFilter =
    document.getElementById('studentSectionFilter');

  const studentStatusFilter =
    document.getElementById('studentStatusFilter');

  const clearStudentFiltersButton =
    document.getElementById('clearStudentFiltersButton');

  const refreshStudentsButton =
    document.getElementById('refreshStudentsButton');

  if (studentSearchInput) {
    studentSearchInput.addEventListener(
      'input',
      applyStudentFilters
    );
  }

  if (studentClassFilter) {
    studentClassFilter.addEventListener(
      'change',
      applyStudentFilters
    );
  }

  if (studentSectionFilter) {
    studentSectionFilter.addEventListener(
      'change',
      applyStudentFilters
    );
  }

  if (studentStatusFilter) {
    studentStatusFilter.addEventListener(
      'change',
      applyStudentFilters
    );
  }

  if (clearStudentFiltersButton) {
    clearStudentFiltersButton.addEventListener(
      'click',
      function() {
        studentSearchInput.value = '';
        studentClassFilter.value = '';
        studentSectionFilter.value = '';
        studentStatusFilter.value = '';

        applyStudentFilters();
      }
    );
  }

  if (refreshStudentsButton) {
    refreshStudentsButton.addEventListener(
      'click',
      function() {
        loadStudents(true);
      }
    );
  }
  const recordPaymentForm =
  document.getElementById(
    'recordPaymentForm'
  );

if (recordPaymentForm) {
  recordPaymentForm.addEventListener(
    'submit',
    submitRecordPaymentForm
  );
}

const addStudentForm =
  document.getElementById('addStudentForm');

if (addStudentForm) {
  addStudentForm.addEventListener(
    'submit',
    saveNewStudent
  );
}
const editStudentButton =
  document.getElementById('editStudentButton');

if (editStudentButton) {
  editStudentButton.addEventListener(
    'click',
    openEditStudentPanel
  );
}
});


    /**
     * Attempts to load the real Phase 4 authorised session.
     */

function loadApplication() {
      showLoadingScreen();

      google.script.run
        .withSuccessHandler(handleApplicationResponse)
        .withFailureHandler(handleApplicationFailure)
        .getInitialApplicationData();
    }


    /**
     * Loads a temporary shell-only preview.
     */

function handleApplicationResponse(response) {
      if (!response || !response.success || !response.authorised) {
        showAccessScreen(
          response && response.message
            ? response.message
            : 'The application could not create an authorised session.'
        );

        return;
      }

      applicationState.session = response;
      false = Boolean(response.previewMode);

      if (
        response.initialDashboard &&
        response.initialDashboard.success === true
      ) {
        applicationState.initialDashboard = response.initialDashboard;
      }

      if (
        response.initialStudents &&
        response.initialStudents.success === true
      ) {
        applicationState.initialStudents = response.initialStudents;
      }

      renderApplication(response);
    }

function handleApplicationFailure(error) {
      const message =
        error && error.message
          ? error.message
          : String(error || 'An unexpected application error occurred.');

      showAccessScreen(message);
    }

function renderApplication(session) {
  renderBrand(session.application);
  renderUser(session.user);
  renderNavigation(session.navigation || []);

  const academicYearBadge =
    document.getElementById('academicYearBadge');

  if (academicYearBadge) {
    academicYearBadge.textContent =
      session.application.academicYear || '';
  }

  const previewBanner =
    document.getElementById('previewBanner');

  if (previewBanner) {
    previewBanner.classList.toggle(
      'hidden',
      !false
    );
  }

  const accessScreen =
    document.getElementById('accessScreen');

  if (accessScreen) {
    accessScreen.classList.add('hidden');
  }

  const applicationShell =
    document.getElementById('applicationShell');

  if (applicationShell) {
    applicationShell.classList.remove('hidden');
  }

  hideLoadingScreen();

  const defaultPage =
    getDefaultPage(session.navigation || []);

  /*
   * Allow the branded shell to render before starting the
   * first spreadsheet-backed page request.
   */
  window.requestAnimationFrame(function() {
    navigateTo(defaultPage, false);
  });
}

function renderBrand(application) {
      const applicationName =
        document.getElementById('sidebarApplicationName');

      const organisationName =
        document.getElementById('sidebarOrganisationName');

      if (applicationName) {
        applicationName.textContent =
          application.shortName || application.name || 'School Fees';
      }

      if (organisationName) {
        organisationName.textContent =
          application.organisationName || 'Demo School';
      }
    }

function renderUser(user) {
  const initials = user.initials || 'U';
  const fullName = user.fullName || 'User';
  const role = user.role || '';

  const sidebarInitials =
    document.getElementById('sidebarUserInitials');

  const sidebarName =
    document.getElementById('sidebarUserName');

  const sidebarRole =
    document.getElementById('sidebarUserRole');

  if (sidebarInitials) {
    sidebarInitials.textContent = initials;
  }

  if (sidebarName) {
    sidebarName.textContent = fullName;
  }

  if (sidebarRole) {
    sidebarRole.textContent = role;
  }
}

function renderNavigation(navigationItems) {
  const navigationList =
    document.getElementById('navigationList');

  if (!navigationList) {
    return;
  }

  navigationList.innerHTML = '';

  navigationItems.forEach(function(item) {
    if (item.id === 'record-payment') {
      return;
    }

    const button =
      document.createElement('button');

    button.type = 'button';
    button.className = 'navigation-item';
    button.dataset.page = item.id;

    button.innerHTML = `
      <span class="navigation-icon">
        ${getIconMarkup(item.icon)}
      </span>

      <span class="navigation-text">
        ${escapeHtml(item.label)}
      </span>
    `;

    button.addEventListener('click', function() {
      if (item.id === 'add-student') {
        openAddStudentPanel();
        closeMobileSidebar();
        return;
      }

      navigateTo(item.id, true);
    });

    navigationList.appendChild(button);
  });
}

function getDefaultPage(navigationItems) {
      const dashboardAvailable = navigationItems.some(function(item) {
        return item.id === 'dashboard';
      });

      if (dashboardAvailable) {
        return 'dashboard';
      }

      return navigationItems.length
        ? navigationItems[0].id
        : 'dashboard';
    }


    /**
     * Changes visible pages without reloading the web app.
     */

function navigateTo(pageId, announceNavigation) {
      if (pageId === 'add-student') {
  openAddStudentPanel();

  document
    .querySelectorAll('.navigation-item')
    .forEach(function(item) {
      item.classList.toggle(
        'active',
        item.dataset.page === 'add-student'
      );
    });

  closeMobileSidebar();

  return;
}
      const targetPage =
        document.getElementById('page-' + pageId);

      if (!targetPage) {
        showToast('This page is not available.', 'error');
        return;
      }

      applicationState.currentPage = pageId;

      document
        .querySelectorAll('.page-section')
        .forEach(function(page) {
          page.classList.remove('active');
        });

      targetPage.classList.add('active');

      document
        .querySelectorAll('.navigation-item')
        .forEach(function(item) {
          item.classList.toggle(
            'active',
            item.dataset.page === pageId
          );
        });

      const pageConfig =
        PAGE_CONFIGURATION[pageId] || {
          title: 'School Fee Management',
          subtitle: ''
        };

      document.getElementById('pageTitle').textContent =
        pageConfig.title;

      document.getElementById('pageSubtitle').textContent =
        pageConfig.subtitle;

      closeMobileSidebar();

      if (
  pageId === 'dashboard' &&
  !applicationState.dashboardLoaded
) {
  if (applicationState.initialDashboard) {
    renderDashboardData(applicationState.initialDashboard);
    applicationState.dashboardLoaded = true;
    applicationState.initialDashboard = null;

    document
      .getElementById('dashboardLoading')
      ?.classList.add('hidden');

    document
      .getElementById('dashboardContent')
      ?.classList.remove('hidden');
  } else {
    loadDashboardData(false);
  }
}

if (
  pageId === 'students' &&
  !applicationState.studentsLoaded
) {
  if (applicationState.initialStudents) {
    applyStudentsResponse(applicationState.initialStudents);
    applicationState.initialStudents = null;

    document.getElementById('studentsLoadingState').hidden = true;
    applyStudentFilters();
  } else {
    loadStudents(false);
  }
}
if (
  pageId === 'reports' &&
  !applicationState.reportsLoaded
) {
  loadOutstandingReport();
}
if (announceNavigation) {
  showToast(pageConfig.title + ' opened.');
}
}

function openMobileSidebar() {
      document
        .getElementById('sidebar')
        .classList.add('open');

      document
        .getElementById('sidebarOverlay')
        .classList.add('visible');
    }

function closeMobileSidebar() {
      document
        .getElementById('sidebar')
        .classList.remove('open');

      document
        .getElementById('sidebarOverlay')
        .classList.remove('visible');
    }

function showLoadingScreen() {
      document
        .getElementById('loadingScreen')
        .classList.remove('hidden');

      document
        .getElementById('accessScreen')
        .classList.add('hidden');

      document
        .getElementById('applicationShell')
        .classList.add('hidden');
    }

function hideLoadingScreen() {
      document
        .getElementById('loadingScreen')
        .classList.add('hidden');
    }

function showAccessScreen(message) {
      hideLoadingScreen();

      document.getElementById('accessMessage').textContent =
        message;

      document
        .getElementById('applicationShell')
        .classList.add('hidden');

      document
        .getElementById('accessScreen')
        .classList.remove('hidden');
    }

function useStudents(students) {
    applicationState.students =
      Array.isArray(students)
        ? students
        : [];

    applicationState.studentsLoaded = true;

    applicationState.reportStudents =
      applicationState.students.filter(
        function(student) {
          const isRte =
            student.isRte === true ||
            student.paymentStatus === 'RTE' ||
            String(student.fundingType || '')
              .trim()
              .toUpperCase() === 'RTE';

          return (
            !isRte &&
            Number(student.outstandingBalance || 0) > 0
          );
        }
      );

    applicationState.reportsLoaded = true;

    populateReportFilters(
      applicationState.reportStudents
    );

    renderOutstandingReport(
      applicationState.reportStudents
    );
  }

  if (
    applicationState.studentsLoaded &&
    Array.isArray(applicationState.students)
  ) {
    useStudents(applicationState.students);
    return;
  }

  tableBody.innerHTML = '';

  emptyState.hidden = false;
  emptyState.textContent =
    'Loading student outreach records...';

  studentCount.textContent = '—';

  google.script.run
    .withSuccessHandler(function(response) {
      if (
        !response ||
        response.success !== true
      ) {
        showOutstandingReportError(
          response && response.message
            ? response.message
            : 'Unable to load the student outreach report.'
        );

        return;
      }

      useStudents(response.students);
    })
    .withFailureHandler(function(error) {
      showOutstandingReportError(
        error && error.message
          ? error.message
          : 'Unable to load the student outreach report.'
      );
    })
    .getStudents();
}
