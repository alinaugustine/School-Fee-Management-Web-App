/** Sanitized portfolio frontend module. */

function loadOutstandingReport() {
  const tableBody =
    document.getElementById('reportTableBody');

  const emptyState =
    document.getElementById('reportEmptyState');

  const studentCount =
    document.getElementById('reportStudentCount');

  if (
    !tableBody ||
    !emptyState ||
    !studentCount
  ) {
    console.error(
      'Student outreach report elements are missing.'
    );

    return;
  }

function renderOutstandingReport(students) {
  const tableBody =
    document.getElementById('reportTableBody');

  const emptyState =
    document.getElementById('reportEmptyState');

  if (!tableBody || !emptyState) {
    return;
  }

  const outstandingStudents =
    Array.isArray(students)
      ? students
      : [];

  const allRegularStudents =
    applicationState.students.filter(function(student) {
      const isRte =
        student.isRte === true ||
        student.paymentStatus === 'RTE' ||
        String(student.fundingType || '')
          .trim()
          .toUpperCase() === 'RTE';

      return !isRte;
    });

  const unpaidCount =
    allRegularStudents.filter(function(student) {
      return student.paymentStatus === 'Unpaid';
    }).length;

  const partialCount =
    allRegularStudents.filter(function(student) {
      return student.paymentStatus === 'Partially Paid';
    }).length;

  const paidCount =
    allRegularStudents.filter(function(student) {
      return student.paymentStatus === 'Fully Paid';
    }).length;

  const totalStudents =
    allRegularStudents.length;

  const completionRate =
    totalStudents > 0
      ? Math.round((paidCount / totalStudents) * 100)
      : 0;

  document.getElementById(
    'reportStudentCount'
  ).textContent =
    String(outstandingStudents.length);

  document.getElementById(
    'reportStudentCountNote'
  ).textContent =
    'Out of ' +
    totalStudents +
    ' active fee-paying students';

  document.getElementById(
    'reportUnpaidCount'
  ).textContent =
    String(unpaidCount);

  document.getElementById(
    'reportPartialCount'
  ).textContent =
    String(partialCount);

  document.getElementById(
    'reportPaidCount'
  ).textContent =
    String(paidCount);

  document.getElementById(
    'reportCompletionRate'
  ).textContent =
    completionRate + '%';

  document.getElementById(
    'reportCompletionBar'
  ).style.width =
    completionRate + '%';

  document.getElementById(
    'reportCompletionText'
  ).textContent =
    paidCount +
    ' of ' +
    totalStudents +
    ' students fully paid';

  document.getElementById(
    'reportRemainingText'
  ).textContent =
    outstandingStudents.length +
    (
      outstandingStudents.length === 1
        ? ' student remaining'
        : ' students remaining'
    );

  tableBody.innerHTML = '';

  if (outstandingStudents.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent =
      'All active fee-paying students are fully paid.';

    return;
  }

  outstandingStudents.forEach(function(student) {
    const row =
      document.createElement('tr');

    const fatherContact =
      [
        student.fatherName,
        student.fatherPhone
      ]
        .filter(Boolean)
        .join(' · ') || '—';

    const motherContact =
      [
        student.motherName,
        student.motherPhone
      ]
        .filter(Boolean)
        .join(' · ') || '—';

    const statusClass =
      student.paymentStatus === 'Partially Paid'
        ? 'student-status-partial'
        : 'student-status-unpaid';

    row.innerHTML = `
      <td>
        <div class="student-cell">
          <strong>
            ${escapeHtml(
              student.studentName || '—'
            )}
          </strong>

          <span>
            ${escapeHtml(
              student.studentId || '—'
            )}
          </span>
        </div>
      </td>

      <td>
        ${escapeHtml(
          student.className || '—'
        )}
      </td>

      <td>
        ${escapeHtml(
          student.section || '—'
        )}
      </td>

      <td>
        ${escapeHtml(fatherContact)}
      </td>

      <td>
        ${escapeHtml(motherContact)}
      </td>

      <td>
        <span class="student-status-badge ${statusClass}">
          ${escapeHtml(
            student.paymentStatus || 'Unpaid'
          )}
        </span>
      </td>
    `;

    tableBody.appendChild(row);
  });

  emptyState.hidden = true;
}

function populateReportFilters(students) {
  const classSelect =
    document.getElementById(
      'reportClassFilter'
    );

  const sectionSelect =
    document.getElementById(
      'reportSectionFilter'
    );

  if (!classSelect || !sectionSelect) {
    return;
  }

  const classes = [
    ...new Set(
      students
        .map(function(student) {
          return String(
            student.className || ''
          ).trim();
        })
        .filter(Boolean)
    )
  ].sort();

  const sections = [
    ...new Set(
      students
        .map(function(student) {
          return String(
            student.section || ''
          ).trim();
        })
        .filter(Boolean)
    )
  ].sort();

  classSelect.innerHTML =
    '<option value="">All classes</option>';

  sectionSelect.innerHTML =
    '<option value="">All sections</option>';

  classes.forEach(function(className) {
    const option =
      document.createElement('option');

    option.value = className;
    option.textContent = className;

    classSelect.appendChild(option);
  });

  sections.forEach(function(section) {
    const option =
      document.createElement('option');

    option.value = section;
    option.textContent = section;

    sectionSelect.appendChild(option);
  });
}

function applyReportFilters() {
  const searchInput =
    document.getElementById(
      'reportSearch'
    );

  const classSelect =
    document.getElementById(
      'reportClassFilter'
    );

  const sectionSelect =
    document.getElementById(
      'reportSectionFilter'
    );

  const sortSelect =
    document.getElementById(
      'reportSort'
    );

  if (
    !searchInput ||
    !classSelect ||
    !sectionSelect ||
    !sortSelect
  ) {
    console.error(
      'Report filter controls are missing.'
    );

    return;
  }

  let students = [
    ...applicationState.reportStudents
  ];

  const search =
    String(searchInput.value || '')
      .trim()
      .toLowerCase();

  const classFilter =
    String(classSelect.value || '')
      .trim();

  const sectionFilter =
    String(sectionSelect.value || '')
      .trim();

  const sort =
    String(sortSelect.value || 'name-asc');

  if (search) {
    students = students.filter(
      function(student) {
        const searchableText = [
          student.studentName,
          student.studentId,
          student.className,
          student.section,
          student.fatherName,
          student.fatherPhone,
          student.motherName,
          student.motherPhone
        ]
          .map(function(value) {
            return String(value || '');
          })
          .join(' ')
          .toLowerCase();

        return searchableText.includes(
          search
        );
      }
    );
  }

  if (classFilter) {
    students = students.filter(
      function(student) {
        return (
          String(
            student.className || ''
          ).trim() === classFilter
        );
      }
    );
  }

  if (sectionFilter) {
    students = students.filter(
      function(student) {
        return (
          String(
            student.section || ''
          ).trim() === sectionFilter
        );
      }
    );
  }

  switch (sort) {
    case 'name-desc':
      students.sort(function(a, b) {
        return String(
          b.studentName || ''
        ).localeCompare(
          String(a.studentName || '')
        );
      });
      break;

    case 'class-asc':
      students.sort(function(a, b) {
        const classComparison =
          String(a.className || '')
            .localeCompare(
              String(b.className || ''),
              undefined,
              { numeric: true }
            );

        if (classComparison !== 0) {
          return classComparison;
        }

        return String(
          a.studentName || ''
        ).localeCompare(
          String(b.studentName || '')
        );
      });
      break;

    case 'unpaid-first':
      students.sort(function(a, b) {
        const statusOrder = {
          Unpaid: 1,
          'Partially Paid': 2
        };

        return (
          (statusOrder[a.paymentStatus] || 99) -
          (statusOrder[b.paymentStatus] || 99)
        );
      });
      break;

    case 'partial-first':
      students.sort(function(a, b) {
        const statusOrder = {
          'Partially Paid': 1,
          Unpaid: 2
        };

        return (
          (statusOrder[a.paymentStatus] || 99) -
          (statusOrder[b.paymentStatus] || 99)
        );
      });
      break;

    case 'name-asc':
    default:
      students.sort(function(a, b) {
        return String(
          a.studentName || ''
        ).localeCompare(
          String(b.studentName || '')
        );
      });
  }

  renderOutstandingReport(students);
}

function showOutstandingReportError(
  message
) {
  const tableBody =
    document.getElementById('reportTableBody');

  const emptyState =
    document.getElementById('reportEmptyState');

  const studentCount =
    document.getElementById('reportStudentCount');

  if (tableBody) {
    tableBody.innerHTML = '';
  }

  if (studentCount) {
    studentCount.textContent = '0';
  }

  [
    'reportUnpaidCount',
    'reportPartialCount',
    'reportPaidCount'
  ].forEach(function(id) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = '0';
    }
  });

  const rate =
    document.getElementById('reportCompletionRate');

  const bar =
    document.getElementById('reportCompletionBar');

  const completionText =
    document.getElementById('reportCompletionText');

  const remainingText =
    document.getElementById('reportRemainingText');

  if (rate) {
    rate.textContent = '0%';
  }

  if (bar) {
    bar.style.width = '0%';
  }

  if (completionText) {
    completionText.textContent =
      '0 of 0 students fully paid';
  }

  if (remainingText) {
    remainingText.textContent =
      '0 students remaining';
  }

  if (emptyState) {
    emptyState.hidden = false;
    emptyState.textContent =
      message ||
      'Unable to load the student outreach report.';
  }

  applicationState.reportsLoaded = false;
}
