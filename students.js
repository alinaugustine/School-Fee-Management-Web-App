/** Sanitized portfolio frontend module. */

function applyStudentsResponse(response) {
  applicationState.students = Array.isArray(
    response && response.students
  )
    ? response.students
    : [];

  applicationState.studentsLoaded = true;
  applicationState.reportStudents =
    applicationState.students.filter(function(student) {
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
    });
  applicationState.reportsLoaded = false;

  populateStudentFilters(
    response && response.filters
      ? response.filters
      : {}
  );
}

function applyFinanceRefreshPayload(payload, selectedStudentId) {
  if (!payload) {
    return;
  }

  if (payload.dashboard && payload.dashboard.success === true) {
    renderDashboardData(payload.dashboard);
    applicationState.dashboardLoaded = true;
  }

  if (payload.students && payload.students.success === true) {
    applyStudentsResponse(payload.students);

    if (applicationState.currentPage === 'students') {
      applyStudentFilters();
    }

    if (applicationState.currentPage === 'reports') {
      applicationState.reportsLoaded = true;
      populateReportFilters(applicationState.reportStudents);
      renderOutstandingReport(applicationState.reportStudents);
    }
  }

  if (
    payload.studentDetails &&
    payload.studentDetails.success === true &&
    selectedStudentId
  ) {
    selectedStudentRecord = payload.studentDetails.student || null;
    renderStudentDetail(
      payload.studentDetails.student || {},
      payload.studentDetails.payments || []
    );
  }
}

function loadStudents(showRefreshMessage) {
  const loadingState = document.getElementById(
    'studentsLoadingState'
  );

  const errorState = document.getElementById(
    'studentsErrorState'
  );

  const emptyState = document.getElementById(
    'studentsEmptyState'
  );

  const tableContainer = document.getElementById(
    'studentsTableContainer'
  );

  const resultsCount = document.getElementById(
    'studentResultsCount'
  );

  const refreshButton = document.getElementById(
    'refreshStudentsButton'
  );

  if (
    !loadingState ||
    !errorState ||
    !emptyState ||
    !tableContainer ||
    !resultsCount
  ) {
    return;
  }

  loadingState.hidden = false;
  errorState.hidden = true;
  emptyState.hidden = true;
  tableContainer.hidden = true;

  resultsCount.textContent = 'Loading students...';

  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    refreshButton.disabled = true;
  }

  google.script.run
    .withSuccessHandler(function(response) {
      if (refreshButton) {
        refreshButton.classList.remove('refreshing');
        refreshButton.disabled = false;
      }

      if (!response || response.success !== true) {
        showStudentsError(
          response && response.message
            ? response.message
            : 'Unable to load students.'
        );

        return;
      }

      applyStudentsResponse(response);

      loadingState.hidden = true;

      applyStudentFilters();

      if (showRefreshMessage === true) {
        showToast(
          'Student records refreshed.',
          'success'
        );
      }
    })
    .withFailureHandler(function(error) {
      if (refreshButton) {
        refreshButton.classList.remove('refreshing');
        refreshButton.disabled = false;
      }

      showStudentsError(
        error && error.message
          ? error.message
          : 'Unable to load students.'
      );
    })
    .getStudents();
}

function showStudentsError(message) {
  const loadingState =
    document.getElementById('studentsLoadingState');

  const errorState =
    document.getElementById('studentsErrorState');

  const emptyState =
    document.getElementById('studentsEmptyState');

  const tableContainer =
    document.getElementById('studentsTableContainer');

  const resultsCount =
    document.getElementById('studentResultsCount');

  const refreshButton =
    document.getElementById('refreshStudentsButton');

  if (loadingState) {
    loadingState.hidden = true;
  }

  if (emptyState) {
    emptyState.hidden = true;
  }

  if (tableContainer) {
    tableContainer.hidden = true;
  }

  if (errorState) {
    errorState.hidden = false;
    errorState.textContent =
      message || 'Unable to load students.';
  }

  if (resultsCount) {
    resultsCount.textContent =
      'Student records could not be loaded.';
  }

  if (refreshButton) {
    refreshButton.classList.remove('refreshing');
    refreshButton.disabled = false;
  }
}

function populateStudentFilters(filters) {
  const classFilter =
    document.getElementById('studentClassFilter');

  const sectionFilter =
    document.getElementById('studentSectionFilter');

  const statusFilter =
    document.getElementById('studentStatusFilter');

  if (!classFilter || !sectionFilter || !statusFilter) {
    console.error('Student filter elements are missing.');
    return;
  }

  if (applicationState.studentFilterOptionsLoaded) {
    return;
  }

  const classes = Array.isArray(filters.classes)
    ? filters.classes
    : [];

  const sections = Array.isArray(filters.sections)
    ? filters.sections
    : [];

  const statuses = Array.isArray(filters.statuses)
    ? filters.statuses
    : [];

  classes.forEach(function(className) {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    classFilter.appendChild(option);
  });

  sections.forEach(function(sectionName) {
    const option = document.createElement('option');
    option.value = sectionName;
    option.textContent = sectionName;
    sectionFilter.appendChild(option);
  });

  statuses.forEach(function(statusName) {
    const option = document.createElement('option');
    option.value = statusName;
    option.textContent = statusName;
    statusFilter.appendChild(option);
  });

  applicationState.studentFilterOptionsLoaded = true;
}

function applyStudentFilters() {
  const searchText = (
    document.getElementById('studentSearchInput')?.value || ''
  )
    .trim()
    .toLowerCase();

  const classFilter =
    document.getElementById('studentClassFilter')?.value || '';

  const sectionFilter =
    document.getElementById('studentSectionFilter')?.value || '';

  const statusFilter =
    document.getElementById('studentStatusFilter')?.value || '';

  let filteredStudents = applicationState.students.filter(function(student) {

    if (
      searchText &&
      !(
        String(student.studentName).toLowerCase().includes(searchText) ||
        String(student.studentId).toLowerCase().includes(searchText)
      )
    ) {
      return false;
    }

    if (
      classFilter &&
      student.className !== classFilter
    ) {
      return false;
    }

    if (
      sectionFilter &&
      student.section !== sectionFilter
    ) {
      return false;
    }

    if (
      statusFilter &&
      student.paymentStatus !== statusFilter
    ) {
      return false;
    }

    return true;
  });

  renderStudentsTable(filteredStudents);
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsTableBody');

  const loadingState = document.getElementById('studentsLoadingState');
  const errorState = document.getElementById('studentsErrorState');
  const emptyState = document.getElementById('studentsEmptyState');
  const tableContainer = document.getElementById('studentsTableContainer');
  const resultsCount = document.getElementById('studentResultsCount');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  if (loadingState) loadingState.hidden = true;
  if (errorState) errorState.hidden = true;

  if (!students.length) {
    if (emptyState) emptyState.hidden = false;
    if (tableContainer) tableContainer.hidden = true;
    if (resultsCount) {
      resultsCount.textContent = '0 students found';
    }
    return;
  }

  if (emptyState) emptyState.hidden = true;
  if (tableContainer) tableContainer.hidden = false;

  if (resultsCount) {
    resultsCount.textContent =
      students.length +
      (students.length === 1 ? ' student found' : ' students found');
  }

  students.forEach(function(student) {
    let statusClass = 'student-status-unpaid';

    if (student.paymentStatus === 'RTE') {
      statusClass = 'student-status-rte';
    } else if (student.paymentStatus === 'Fully Paid') {
      statusClass = 'student-status-paid';
    } else if (student.paymentStatus === 'Partially Paid') {
      statusClass = 'student-status-partial';
    }

    const row = document.createElement('tr');

    row.innerHTML = `
      <td class="student-id-cell">${student.studentId}</td>
      <td class="student-name-cell">${student.studentName}</td>
      <td>${student.className}</td>
      <td>${student.section}</td>
     <td class="student-money-cell ${
  student.paymentStatus === 'RTE'
    ? 'rte-money'
    : ''
}">
  ${
    student.paymentStatus === 'RTE'
      ? formatCurrency(0)
      : formatCurrency(student.totalFee)
  }
</td>

<td class="student-money-cell student-paid-amount ${
  student.paymentStatus === 'RTE'
    ? 'rte-money'
    : ''
}">
  ${
    student.paymentStatus === 'RTE'
      ? formatCurrency(0)
      : formatCurrency(student.amountPaid)
  }
</td>

<td class="student-money-cell student-outstanding-amount ${
  student.paymentStatus === 'RTE'
    ? 'outstanding-paid rte-money'
    : getOutstandingClass(student.outstandingBalance)
}">
  ${
    student.paymentStatus === 'RTE'
      ? formatCurrency(0)
      : formatCurrency(student.outstandingBalance)
  }
</td>
      <td class="progress-cell">
      ${createPaymentProgress(student)}
      </td>
      <td class="student-action-cell">
       <button
    class="student-view-button"
    data-student-id="${student.studentId}"
    title="View student details"
    aria-label="View student details">
    <svg xmlns="http://www.w3.org/2000/svg"
         width="18"
         height="18"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         stroke-width="2"
         stroke-linecap="round"
         stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
</button>
      </td>
    `;
    const viewButton =
  row.querySelector('.student-view-button');

if (viewButton) {
  viewButton.addEventListener('click', function() {
    openStudentDetailPanel(
      viewButton.dataset.studentId
    );
  });
}
    tbody.appendChild(row);
  });
}

function openStudentDetailPanel(studentId) {
  const overlay =
    document.getElementById('studentDetailOverlay');

  const panel =
    document.getElementById('studentDetailPanel');

  const loadingState =
    document.getElementById('studentDetailLoading');

  const errorState =
    document.getElementById('studentDetailError');

  const content =
    document.getElementById('studentDetailContent');

  const paymentButton =
    document.getElementById(
      'studentDetailRecordPaymentButton'
    );

  const editButton =
    document.getElementById('editStudentButton');

  if (
    !overlay ||
    !panel ||
    !loadingState ||
    !errorState ||
    !content
  ) {
    return;
  }

  selectedStudentRecord = null;

  overlay.hidden = false;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');

  loadingState.hidden = false;
  errorState.hidden = true;
  content.hidden = true;

  if (paymentButton) {
    paymentButton.disabled = true;
    paymentButton.dataset.studentId = '';
  }

  if (editButton) {
    editButton.disabled = true;
  }

  google.script.run
    .withSuccessHandler(function(response) {
      if (
        !response ||
        response.success !== true
      ) {
        showStudentDetailError(
          response && response.message
            ? response.message
            : 'Unable to load student information.'
        );

        return;
      }

      selectedStudentRecord =
        response.student || null;

      if (editButton) {
        editButton.disabled =
          !selectedStudentRecord;
      }

      renderStudentDetail(
        response.student || {},
        response.payments || []
      );
    })
    .withFailureHandler(function(error) {
      selectedStudentRecord = null;

      if (editButton) {
        editButton.disabled = true;
      }

      showStudentDetailError(
        error && error.message
          ? error.message
          : 'Unable to load student information.'
      );
    })
    .getStudentDetails(studentId);
}

function closeStudentDetailPanel() {
  selectedStudentRecord = null;

const editButton =
  document.getElementById('editStudentButton');

if (editButton) {
  editButton.disabled = true;
}
  const overlay =
    document.getElementById('studentDetailOverlay');

  const panel =
    document.getElementById('studentDetailPanel');

  if (overlay) {
    overlay.hidden = true;
  }

  if (panel) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
}

function refreshStudentAfterPayment(studentId) {
  google.script.run
    .withSuccessHandler(function(response) {
      if (!response || response.success !== true) {
        return;
      }

      const student = response.student || {};

      document.getElementById(
        'recordPaymentBalanceHint'
      ).textContent =
        'Outstanding balance: ' +
        formatCurrency(
          student.outstandingBalance
        );

      renderStudentDetail(
        student,
        response.payments || []
      );
    })
    .getStudentDetails(studentId);
}

function showStudentDetailError(message) {
  const loadingState =
    document.getElementById('studentDetailLoading');

  const errorState =
    document.getElementById('studentDetailError');

  const content =
    document.getElementById('studentDetailContent');

  if (loadingState) {
    loadingState.hidden = true;
  }

  if (content) {
    content.hidden = true;
  }

  if (errorState) {
    errorState.hidden = false;
    errorState.textContent =
      message || 'Unable to load student information.';
  }
}

function renderStudentDetail(student, payments) {
  activeStudentId =
    student.studentId || '';
  const loadingState =
    document.getElementById('studentDetailLoading');

  const errorState =
    document.getElementById('studentDetailError');

  const content =
    document.getElementById('studentDetailContent');

  document.getElementById('studentDetailName').textContent =
    student.studentName || 'Student';

  document.getElementById('studentDetailId').textContent =
    student.studentId || '—';

  document.getElementById('studentDetailClass').textContent =
    student.className || '—';

  document.getElementById('studentDetailSection').textContent =
    student.section || '—';

document.getElementById('studentDetailFatherName').textContent =
  student.fatherName || '—';

document.getElementById('studentDetailFatherPhone').textContent =
  student.fatherPhone || '—';

document.getElementById('studentDetailMotherName').textContent =
  student.motherName || '—';

document.getElementById('studentDetailMotherPhone').textContent =
  student.motherPhone || '—';

  document.getElementById('studentDetailFundingType').textContent =
    student.isRte || student.paymentStatus === 'RTE'
      ? 'RTE'
      : (student.fundingType || 'Regular');

  document.getElementById('studentDetailTotalFee').textContent =
    student.isRte || student.paymentStatus === 'RTE'
      ? formatCurrency(0)
      : formatCurrency(student.totalFee);

  const isRteStudent =
    student.isRte === true ||
    student.paymentStatus === 'RTE' ||
    String(student.fundingType || '').toUpperCase() === 'RTE';

  document.getElementById('studentDetailAmountPaid').textContent =
    isRteStudent
      ? formatCurrency(0)
      : formatCurrency(student.amountPaid);

  document.getElementById('studentDetailOutstanding').textContent =
    isRteStudent
      ? formatCurrency(0)
      : formatCurrency(student.outstandingBalance);

  document.getElementById('studentDetailStatus').textContent =
    isRteStudent
      ? 'RTE – Government Funded'
      : (student.paymentStatus || '—');

  renderStudentPaymentHistory(payments);

  const paymentButton =
    document.getElementById(
      'studentDetailRecordPaymentButton'
    );

  paymentButton.disabled = isRteStudent;
  paymentButton.textContent = isRteStudent
    ? 'RTE – No Payment Required'
    : 'Record Payment';

  paymentButton.onclick = isRteStudent
    ? null
    : function() {
        openRecordPaymentPanel(student);
      };

  if (loadingState) {
    loadingState.hidden = true;
  }

  if (errorState) {
    errorState.hidden = true;
  }

  if (content) {
    content.hidden = false;
  }
}

function renderStudentPaymentHistory(payments) {

  const tbody =
    document.getElementById(
      'studentPaymentHistoryBody'
    );

  const emptyState =
    document.getElementById(
      'studentPaymentHistoryEmpty'
    );

  const container =
    document.getElementById(
      'studentPaymentHistoryContainer'
    );

  if (
    !tbody ||
    !emptyState ||
    !container
  ) {
    return;
  }

  tbody.innerHTML = '';

  if (
    !Array.isArray(payments) ||
    payments.length === 0
  ) {
    emptyState.hidden = false;
    container.hidden = true;
    return;
  }

  payments.forEach(function(payment) {

    const row =
      document.createElement('tr');

    row.innerHTML = `
      <td>${escapeHtml(payment.paymentDate || '—')}</td>

      <td>${escapeHtml(payment.receiptNumber || '—')}</td>

      <td>${escapeHtml(payment.paymentMethod || '—')}</td>

      <td>${escapeHtml(payment.referenceNumber || '—')}</td>

      <td>${escapeHtml(payment.enteredBy || '—')}</td>

      <td>
        ${formatCurrency(payment.amount)}
        ${Number(payment.reversedAmount || 0) > 0
          ? `<div style="font-size:10px;color:#667085;margin-top:3px;">Reversed: ${formatCurrency(payment.reversedAmount)}</div>`
          : ''}
      </td>

<td>
    <button
        type="button"
        class="button button-secondary payment-print-button"
        data-payment-id="${escapeHtml(payment.paymentId)}"
    >
        Print
    </button>

    <button
        type="button"
        class="button button-danger payment-reverse-button"
        data-payment-id="${escapeHtml(payment.paymentId)}"
    >
        Reverse
    </button>
</td>
    `;
    const printButton =
  row.querySelector('.payment-print-button');

if (printButton) {
  printButton.addEventListener(
    'click',
    function(event) {
      event.preventDefault();
      event.stopPropagation();

      openPaymentReceipt(
        payment.paymentId
      );
    }
  );
}

const reverseButton =
  row.querySelector('.payment-reverse-button');

if (reverseButton) {
  reverseButton.addEventListener(
    'click',
    function(event) {
      event.preventDefault();
      event.stopPropagation();

      openReversePaymentModal(payment);
    }
  );
}
    tbody.appendChild(row);

  });

  emptyState.hidden = true;

  container.hidden = false;

}

function createPaymentProgress(student) {
  const isRteStudent =
    student &&
    (
      student.isRte === true ||
      student.paymentStatus === 'RTE' ||
      String(student.fundingType || '').toUpperCase() === 'RTE'
    );

  if (isRteStudent) {
    return `
      <div class="payment-progress">
        <div class="progress-track">
          <div
            class="progress-fill progress-blue"
            style="width:100%"
            aria-label="RTE government funded"
          ></div>
        </div>

        <span class="rte-badge">
          RTE
        </span>
      </div>
    `;
  }

  const total = Number(student.totalFee) || 0;
  const paid = Number(student.amountPaid) || 0;

  const rawPercent =
    total > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((paid / total) * 100)
          )
        )
      : 0;

  let displayPercent = 0;
  let colorClass = 'progress-grey';

  if (rawPercent >= 100) {
    displayPercent = 100;
    colorClass = 'progress-green';
  } else if (rawPercent >= 75) {
    displayPercent = 75;
    colorClass = 'progress-yellow';
  } else if (rawPercent >= 50) {
    displayPercent = 50;
    colorClass = 'progress-orange';
  } else if (rawPercent >= 25) {
    displayPercent = 25;
    colorClass = 'progress-red';
  }

  return `
    <div class="payment-progress">
      <div class="progress-track">
        <div
          class="progress-fill ${colorClass}"
          style="width:${displayPercent}%"
          aria-label="${displayPercent}% paid"
        ></div>
      </div>

      <span class="progress-percent">
        ${displayPercent}%
      </span>
    </div>
  `;
}

function getOutstandingClass(outstandingAmount) {
    const amount = Number(outstandingAmount) || 0;

    if (amount <= 0) {
        return "outstanding-paid";
    }

    if (amount <= 5000) {
        return "outstanding-low";
    }

    return "outstanding-high";
}

function openEditStudentPanel() {
  if (!selectedStudentRecord) {
    showToast(
      'No student record is selected.',
      'error'
    );

    return;
  }

  const panel =
    document.getElementById('addStudentPanel');

  const overlay =
    document.getElementById('addStudentOverlay');

  const form =
    document.getElementById('addStudentForm');

  if (!panel || !overlay || !form) {
    showToast(
      'The student form is not available.',
      'error'
    );

    return;
  }

  document.getElementById(
    'newStudentId'
  ).value =
    selectedStudentRecord.studentId || '';

  document.getElementById(
    'newStudentName'
  ).value =
    selectedStudentRecord.studentName || '';

  document.getElementById(
    'newStudentClass'
  ).value =
    selectedStudentRecord.className || '';

  document.getElementById(
    'newStudentSection'
  ).value =
    selectedStudentRecord.section || '';

  document.getElementById(
    'newStudentAdmissionDate'
  ).value =
    selectedStudentRecord.admissionDate || '';

  document.getElementById(
    'newStudentFatherName'
  ).value =
    selectedStudentRecord.fatherName || '';

  document.getElementById(
    'newStudentFatherPhone'
  ).value =
    selectedStudentRecord.fatherPhone || '';

  document.getElementById(
    'newStudentMotherName'
  ).value =
    selectedStudentRecord.motherName || '';

  document.getElementById(
    'newStudentMotherPhone'
  ).value =
    selectedStudentRecord.motherPhone || '';

  document.getElementById(
    'newStudentFundingType'
  ).value =
    selectedStudentRecord.isRte === true ||
    selectedStudentRecord.paymentStatus === 'RTE'
      ? 'RTE'
      : (selectedStudentRecord.fundingType || 'Regular');

  updateStudentTotalFee();
  handleFundingTypeChange();

  document.getElementById(
    'newStudentStatus'
  ).value =
    selectedStudentRecord.studentStatus ||
    selectedStudentRecord.activeStatus ||
    'Active';

  document.getElementById(
    'newStudentId'
  ).readOnly = true;

  document.getElementById(
    'addStudentError'
  ).hidden = true;

  document.getElementById(
    'addStudentSuccess'
  ).hidden = true;

  const heading =
    panel.querySelector(
      '.add-student-header h2'
    );

  const description =
    panel.querySelector(
      '.add-student-header p:last-child'
    );

  const saveButton =
    document.getElementById(
      'saveStudentButton'
    );

  if (heading) {
    heading.textContent = 'Edit Student';
  }

  if (description) {
    description.textContent =
      'Update the selected student record.';
  }

  if (saveButton) {
    saveButton.textContent =
      'Update Student';
  }

  form.dataset.mode = 'edit';

  closeStudentDetailPanel();

  overlay.hidden = false;
  panel.classList.add('open');
  panel.setAttribute(
    'aria-hidden',
    'false'
  );

  setTimeout(function() {
    document
      .getElementById('newStudentName')
      .focus();
  }, 100);
}

function openAddStudentPanel() {
      const panel =
        document.getElementById('addStudentPanel');

      const overlay =
        document.getElementById('addStudentOverlay');

      const form =
        document.getElementById('addStudentForm');

      if (!panel || !overlay || !form) {
        showToast('The Add Student form is not available.', 'error');
        return;
      }

      form.reset();
      form.dataset.mode = 'add';

      const studentIdField =
        document.getElementById('newStudentId');

      studentIdField.readOnly = true;
      studentIdField.value = 'Generated automatically';
      document.getElementById('newStudentStatus').value = 'Active';
      document.getElementById('newStudentFundingType').value = 'Regular';
      document.getElementById('newStudentClass').value = '';

      const heading =
        panel.querySelector('.add-student-header h2');

      const description =
        panel.querySelector('.add-student-header p:last-child');

      const saveButton =
        document.getElementById('saveStudentButton');

      if (heading) {
        heading.textContent = 'Add Student';
      }

      if (description) {
        description.textContent =
          'Create a new student fee account.';
      }

      if (saveButton) {
        saveButton.textContent = 'Save Student';
      }

      handleFundingTypeChange();

      document.getElementById('addStudentError').hidden = true;
      document.getElementById('addStudentSuccess').hidden = true;

      overlay.hidden = false;
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');

      setTimeout(function() {
        document.getElementById('newStudentName').focus();
      }, 100);
    }

function closeAddStudentPanel() {
      const panel =
        document.getElementById('addStudentPanel');

      const overlay =
        document.getElementById('addStudentOverlay');

      if (panel) {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
      }

      if (overlay) {
        overlay.hidden = true;
      }
    }

function getStandardStudentFee(className, fundingType) {
  const funding =
    String(fundingType || '')
      .trim()
      .toUpperCase();

  const studentClass =
    String(className || '')
      .trim()
      .toUpperCase();

  if (funding === 'RTE') {
    return 0;
  }

  if (studentClass === 'NURSERY') {
    return 12000;
  }

  const standardClasses = [
    'LKG',
    'UKG',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8'
  ];

  return standardClasses.includes(studentClass)
    ? 15000
    : 0;
}

function updateStudentTotalFee() {
  const classField =
    document.getElementById('newStudentClass');

  const fundingField =
    document.getElementById('newStudentFundingType');

  const totalFeeField =
    document.getElementById('newStudentTotalFee');

  if (!classField || !fundingField || !totalFeeField) {
    return;
  }

  totalFeeField.value = String(
    getStandardStudentFee(
      classField.value,
      fundingField.value
    )
  );
}

function handleFundingTypeChange() {
  const fundingType =
    document.getElementById(
      'newStudentFundingType'
    );

  const hint =
    document.getElementById(
      'newStudentTotalFeeHint'
    );

  if (!fundingType) {
    return;
  }

  const isRte =
    String(fundingType.value || '')
      .trim()
      .toUpperCase() === 'RTE';

  updateStudentTotalFee();

  if (hint) {
    hint.textContent = isRte
      ? 'RTE students have a family fee of ₹0.'
      : 'The total fee is assigned automatically based on class.';
  }
}

function saveNewStudent(event) {
  event.preventDefault();

  updateStudentTotalFee();

  const form =
    document.getElementById('addStudentForm');

  const saveButton =
    document.getElementById('saveStudentButton');

  const errorBox =
    document.getElementById('addStudentError');

  const successBox =
    document.getElementById('addStudentSuccess');

  const formData = new FormData(form);

  const isEditMode =
    form.dataset.mode === 'edit';

  const student = {
    studentName: String(
      formData.get('studentName') || ''
    ).trim(),

    className: String(
      formData.get('className') || ''
    ).trim(),

    section: String(
      formData.get('section') || ''
    ).trim(),

    admissionDate: String(
      formData.get('admissionDate') || ''
    ).trim(),

    fatherName: String(
      formData.get('fatherName') || ''
    ).trim(),

    fatherPhone: String(
      formData.get('fatherPhone') || ''
    ).trim(),

    motherName: String(
      formData.get('motherName') || ''
    ).trim(),

    motherPhone: String(
      formData.get('motherPhone') || ''
    ).trim(),

    fundingType: String(
      formData.get('fundingType') || 'Regular'
    ).trim(),

    totalFee:
      String(
        formData.get('fundingType') || 'Regular'
      ).trim().toUpperCase() === 'RTE'
        ? 0
        : Number(
            formData.get('totalFee') || 0
          ),

    studentStatus: String(
      formData.get('studentStatus') || 'Active'
    ).trim()
  };

  if (isEditMode) {
    student.studentId = String(
      formData.get('studentId') || ''
    ).trim();
  }

  errorBox.hidden = true;
  successBox.hidden = true;

  saveButton.disabled = true;
  saveButton.textContent =
    isEditMode
      ? 'Updating...'
      : 'Saving...';

  const runner =
    google.script.run
      .withSuccessHandler(function(response) {
        saveButton.disabled = false;

        saveButton.textContent =
          isEditMode
            ? 'Update Student'
            : 'Save Student';

        if (
          !response ||
          response.success !== true
        ) {
          errorBox.textContent =
            response && response.message
              ? response.message
              : isEditMode
                ? 'The student could not be updated.'
                : 'The student could not be saved.';

          errorBox.hidden = false;
          return;
        }

        const successMessage =
          response.message ||
          (
            isEditMode
              ? 'Student updated successfully.'
              : 'Student added successfully.'
          );

        successBox.textContent =
          successMessage;

        successBox.hidden = false;

        applicationState.studentFilterOptionsLoaded = false;

        showToast(
          successMessage,
          'success'
        );

        const savedStudentId =
          response.studentId ||
          student.studentId ||
          '';

        applyFinanceRefreshPayload(
          response.refreshPayload,
          isEditMode ? savedStudentId : ''
        );

        setTimeout(function() {
          closeAddStudentPanel();

          navigateTo(
            'students',
            false
          );

          if (isEditMode) {
            openStudentDetailPanel(
              savedStudentId
            );
          } else {
            applyStudentFilters();
          }
        }, 700);
      })
      .withFailureHandler(function(error) {
        saveButton.disabled = false;

        saveButton.textContent =
          isEditMode
            ? 'Update Student'
            : 'Save Student';

        errorBox.textContent =
          error && error.message
            ? error.message
            : String(
                error ||
                (
                  isEditMode
                    ? 'The student could not be updated.'
                    : 'The student could not be saved.'
                )
              );

        errorBox.hidden = false;
      });

  if (isEditMode) {
    runner.updateStudent(student);
  } else {
    runner.addStudent(student);
  }
}
