/** Sanitized portfolio frontend module. */

function openRecordPaymentPanel(student) {
  const isRteStudent =
    student &&
    (
      student.isRte === true ||
      student.paymentStatus === 'RTE' ||
      String(student.fundingType || '').toUpperCase() === 'RTE'
    );

  if (isRteStudent) {
    showToast(
      'RTE students do not require family fee payments.',
      'error'
    );
    return;
  }

  const overlay =
    document.getElementById('recordPaymentOverlay');

  const panel =
    document.getElementById('recordPaymentPanel');

  overlay.hidden = false;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');

  document.getElementById(
    'recordPaymentStudentLabel'
  ).textContent = student.studentName;

  document.getElementById(
    'recordPaymentStudentId'
  ).value = student.studentId;

  document.getElementById(
    'recordPaymentBalanceHint'
  ).textContent =
    'Outstanding balance: ' +
    formatCurrency(student.outstandingBalance);

  document.getElementById(
    'recordPaymentAmount'
  ).value = '';

  document.getElementById(
    'recordPaymentMethod'
  ).selectedIndex = 0;

  document.getElementById(
    'recordPaymentReference'
  ).value = '';

  document.getElementById(
    'recordPaymentNotes'
  ).value = '';

  document.getElementById(
    'recordPaymentDate'
  ).valueAsDate = new Date();

  document.getElementById(
    'recordPaymentError'
  ).hidden = true;

  document.getElementById(
    'recordPaymentSuccess'
  ).hidden = true;

}

function closeRecordPaymentPanel() {

  document.getElementById(
    'recordPaymentOverlay'
  ).hidden = true;

  const panel =
    document.getElementById(
      'recordPaymentPanel'
    );

  panel.classList.remove('open');

  panel.setAttribute(
    'aria-hidden',
    'true'
  );

}

function submitRecordPaymentForm(event) {
  event.preventDefault();

  const studentId =
    document.getElementById(
      'recordPaymentStudentId'
    ).value.trim();

  const paymentDate =
    document.getElementById(
      'recordPaymentDate'
    ).value;

  const amount =
    Number(
      document.getElementById(
        'recordPaymentAmount'
      ).value
    );

  const paymentMethod =
    document.getElementById(
      'recordPaymentMethod'
    ).value;

  const referenceNumber =
    document.getElementById(
      'recordPaymentReference'
    ).value.trim();

  const notes =
    document.getElementById(
      'recordPaymentNotes'
    ).value.trim();

  const saveButton =
    document.getElementById(
      'savePaymentButton'
    );

  const errorMessage =
    document.getElementById(
      'recordPaymentError'
    );

  const successMessage =
    document.getElementById(
      'recordPaymentSuccess'
    );

  errorMessage.hidden = true;
  successMessage.hidden = true;

  if (!studentId) {
    showRecordPaymentError(
      'No student has been selected.'
    );
    return;
  }

  if (!paymentDate) {
    showRecordPaymentError(
      'Select the payment date.'
    );
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showRecordPaymentError(
      'Enter a valid payment amount.'
    );
    return;
  }

  if (!paymentMethod) {
    showRecordPaymentError(
      'Select a payment method.'
    );
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  const paymentData = {
    studentId: studentId,
    paymentDate: paymentDate,
    amount: amount,
    paymentMethod: paymentMethod,
    referenceNumber: referenceNumber,
    notes: notes
  };

  google.script.run
    .withSuccessHandler(function(response) {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Payment';

      if (!response || response.success !== true) {
        showRecordPaymentError(
          response && response.message
            ? response.message
            : 'The payment could not be saved.'
        );

        return;
      }

      showRecordPaymentSuccess(response);

      document.getElementById(
        'recordPaymentAmount'
      ).value = '';

      document.getElementById(
        'recordPaymentReference'
      ).value = '';

      document.getElementById(
        'recordPaymentNotes'
      ).value = '';

      applyFinanceRefreshPayload(
        response.refreshPayload,
        studentId
      );
    })
    .withFailureHandler(function(error) {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Payment';

      showRecordPaymentError(
        error && error.message
          ? error.message
          : 'The payment could not be saved.'
      );
    })
    .savePayment(paymentData);
}

function showRecordPaymentError(message) {
  const errorMessage =
    document.getElementById(
      'recordPaymentError'
    );

  const successMessage =
    document.getElementById(
      'recordPaymentSuccess'
    );

  successMessage.hidden = true;

  errorMessage.textContent =
    message || 'The payment could not be saved.';

  errorMessage.hidden = false;
}

function showRecordPaymentSuccess(response) {
  const errorMessage =
    document.getElementById(
      'recordPaymentError'
    );

  const successMessage =
    document.getElementById(
      'recordPaymentSuccess'
    );

  errorMessage.hidden = true;

  successMessage.innerHTML = `
    <strong>Payment saved successfully.</strong>
    <br>
    Receipt number:
    ${escapeHtml(response.receiptNumber || '—')}
  `;

  successMessage.hidden = false;
}

function openPaymentReceipt(paymentId) {
  if (!paymentId) {
    showToast('Payment ID is missing.');
    return;
  }

  google.script.run
    .withSuccessHandler(function(response) {
      if (!response || response.success !== true) {
        showToast(
          response && response.message
            ? response.message
            : 'The receipt could not be loaded.'
        );

        return;
      }

      printPaymentReceipt(
        response.receipt || {}
      );
    })
    .withFailureHandler(function(error) {
      showToast(
        error && error.message
          ? error.message
          : 'The receipt could not be loaded.'
      );
    })
    .getPaymentReceipt(paymentId);
}

function reverseStudentPayment(paymentId) {

    if (!paymentId) {
        showToast("Payment ID not found.");
        return;
    }

    const payment = currentStudent.paymentHistory.find(function(item){

        return item.paymentId === paymentId;

    });

    if(!payment){

        showToast("Payment not found.");

        return;

    }

    openReversePaymentModal(payment);

}

function printPaymentReceipt(receipt) {
  const receiptWindow = window.open(
    '',
    '_blank',
    'width=760,height=900'
  );

  if (!receiptWindow) {
    showToast(
      'Please allow pop-ups to print the receipt.'
    );
    return;
  }

  const classAndSection = [
    receipt.className,
    receipt.section
  ]
    .filter(function(value) {
      return value && value !== '—';
    })
    .join(' - ');

  receiptWindow.document.open();

  receiptWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">

        <title>
          Receipt ${escapeHtml(
            receipt.receiptNumber || ''
          )}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 40px;
            color: #101828;
            background: #f2f4f7;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
          }

          .receipt {
            width: 100%;
            max-width: 700px;
            margin: 0 auto;
            padding: 36px;
            background: #ffffff;
            border: 1px solid #d0d5dd;
            border-radius: 12px;
          }

          .receipt-header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 24px;
            border-bottom: 2px solid #101828;
          }

          .school-name {
            margin: 0;
            font-size: 24px;
          }

          .school-subtitle {
            margin: 6px 0 0;
            color: #667085;
            font-size: 13px;
          }

          .receipt-title {
            text-align: right;
          }

          .receipt-title h2 {
            margin: 0;
            font-size: 20px;
          }

          .receipt-title p {
            margin: 6px 0 0;
            color: #475467;
            font-size: 13px;
          }

          .details {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 18px 28px;
            padding: 28px 0;
          }

          .detail span {
            display: block;
            margin-bottom: 6px;
            color: #667085;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .detail strong {
            font-size: 14px;
            overflow-wrap: anywhere;
          }

          .amount-box {
            margin: 8px 0 28px;
            padding: 22px;
            background: #f9fafb;
            border: 1px solid #eaecf0;
            border-radius: 10px;
            text-align: center;
          }

          .amount-box span {
            display: block;
            margin-bottom: 8px;
            color: #667085;
            font-size: 12px;
          }

          .amount-box strong {
            font-size: 30px;
          }

          .notes {
            margin-bottom: 28px;
            padding: 16px;
            background: #f9fafb;
            border: 1px solid #eaecf0;
            border-radius: 8px;
          }

          .notes span {
            display: block;
            margin-bottom: 6px;
            color: #667085;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .notes p {
            margin: 0;
            font-size: 13px;
            line-height: 1.5;
          }

          .receipt-footer {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding-top: 24px;
            border-top: 1px solid #d0d5dd;
            color: #667085;
            font-size: 11px;
          }

          .print-actions {
            max-width: 700px;
            margin: 18px auto 0;
            text-align: right;
          }

          .print-button {
            padding: 10px 18px;
            color: #ffffff;
            background: #2563eb;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 700;
          }

          @media print {
            body {
              padding: 0;
              background: #ffffff;
            }

            .receipt {
              max-width: none;
              border: 0;
              border-radius: 0;
            }

            .print-actions {
              display: none;
            }
          }
        
        </style>
      </head>

      <body>
        <main class="receipt">
          <header class="receipt-header">
            <div>
              <h1 class="school-name">
                Demo School
              </h1>

              <p class="school-subtitle">
                Official School Fee Receipt
              </p>
            </div>

            <div class="receipt-title">
              <h2>Payment Receipt</h2>

              <p>
                ${escapeHtml(
                  receipt.receiptNumber || '—'
                )}
              </p>
            </div>
          </header>

          <section class="details">
            <div class="detail">
              <span>Student</span>

              <strong>
                ${escapeHtml(
                  receipt.studentName || '—'
                )}
              </strong>
            </div>

            <div class="detail">
              <span>Student ID</span>

              <strong>
                ${escapeHtml(
                  receipt.studentId || '—'
                )}
              </strong>
            </div>

            <div class="detail">
              <span>Class and section</span>

              <strong>
                ${escapeHtml(
                  classAndSection || '—'
                )}
              </strong>
            </div>

            <div class="detail">
              <span>Payment date</span>

              <strong>
                ${escapeHtml(
                  receipt.paymentDate || '—'
                )}
              </strong>
            </div>

            <div class="detail">
              <span>Payment method</span>

              <strong>
                ${escapeHtml(
                  receipt.paymentMethod || '—'
                )}
              </strong>
            </div>

            <div class="detail">
              <span>Reference number</span>

              <strong>
                ${escapeHtml(
                  receipt.referenceNumber || '—'
                )}
              </strong>
            </div>
          </section>

          <section class="amount-box">
            <span>Amount received</span>

            <strong>
              ${formatCurrency(receipt.amount)}
            </strong>
          </section>

          <section class="notes">
            <span>Notes</span>

            <p>
              ${escapeHtml(receipt.notes || '—')}
            </p>
          </section>

          <footer class="receipt-footer">
            <div>
              Payment ID:
              ${escapeHtml(
                receipt.paymentId || '—'
              )}
            </div>

            <div>
              Entered by:
              ${escapeHtml(
                receipt.enteredBy || '—'
              )}
            </div>
          </footer>
        </main>

        <div class="print-actions">
          <button
            class="print-button"
            type="button"
            onclick="window.print()"
          >
            Print Receipt
          </button>
        </div>
      </body>
    </html>
  `);

  receiptWindow.document.close();
  receiptWindow.focus();
}
let paymentBeingReversed = null;
let activeStudentId = '';

function openReversePaymentModal(payment) {
  console.log(
    'Opening reverse modal:',
    payment
  );

  if (!payment) {
    showToast(
      'Payment information could not be loaded.'
    );
    return;
  }

  const overlay =
    document.getElementById(
      'reversePaymentOverlay'
    );

  const receiptElement =
    document.getElementById(
      'reverseReceiptNumber'
    );

  const amountElement =
    document.getElementById(
      'reverseAmount'
    );

  const reversalAmountElement =
    document.getElementById(
      'reverseAmountInput'
    );

  const remainingElement =
    document.getElementById(
      'reverseRemainingAmount'
    );

  const reasonElement =
    document.getElementById(
      'reverseReason'
    );

  if (!overlay) {
    console.error(
      'reversePaymentOverlay was not found.'
    );

    showToast(
      'Reverse payment modal is missing from the HTML.'
    );
    return;
  }

  paymentBeingReversed = payment;

  if (receiptElement) {
    receiptElement.textContent =
      payment.receiptNumber || '—';
  }

  const remainingAmount = Number(
    payment.remainingReversibleAmount !== undefined
      ? payment.remainingReversibleAmount
      : payment.amount || 0
  );

  if (amountElement) {
    amountElement.textContent = formatCurrency(
      payment.originalAmount !== undefined
        ? payment.originalAmount
        : payment.amount || 0
    );
  }

  if (remainingElement) {
    remainingElement.textContent = formatCurrency(remainingAmount);
  }

  if (reversalAmountElement) {
    reversalAmountElement.value = remainingAmount.toFixed(2);
    reversalAmountElement.max = remainingAmount.toFixed(2);
  }

  if (reasonElement) {
    reasonElement.value = '';
  }

  overlay.classList.remove('hidden');

  overlay.style.display = 'flex';
}

function closeReversePaymentModal() {
  const overlay =
    document.getElementById(
      'reversePaymentOverlay'
    );

  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = '';
  }

  paymentBeingReversed = null;
}

function confirmReversePayment() {
  if (!paymentBeingReversed) {
    showToast(
      'No payment has been selected.',
      'error'
    );
    return;
  }

  const amountElement =
    document.getElementById('reverseAmountInput');

  const reasonElement =
    document.getElementById('reverseReason');

  if (!amountElement) {
    showToast(
      'The reversal amount field is missing.',
      'error'
    );
    return;
  }

  if (!reasonElement) {
    showToast(
      'The reversal reason field is missing.',
      'error'
    );
    return;
  }

  const reversalAmount = Number(amountElement.value);
  const maximumAmount = Number(amountElement.max || 0);
  const reason = reasonElement.value.trim();

  if (!Number.isFinite(reversalAmount) || reversalAmount <= 0) {
    showToast(
      'Enter a valid reversal amount greater than zero.',
      'error'
    );
    return;
  }

  if (maximumAmount > 0 && reversalAmount > maximumAmount) {
    showToast(
      'The reversal amount cannot exceed ' + formatCurrency(maximumAmount) + '.',
      'error'
    );
    return;
  }

  if (!reason) {
    showToast(
      'Please enter a reversal reason.',
      'error'
    );
    return;
  }

  const paymentId =
    paymentBeingReversed.paymentId;

  const studentIdToRefresh =
    activeStudentId;

  google.script.run
    .withSuccessHandler(function(response) {
      if (!response || response.success !== true) {
        showToast(
          response && response.message
            ? response.message
            : 'Unable to reverse payment.',
          'error'
        );
        return;
      }

      closeReversePaymentModal();

      showToast(
        response.message || 'Payment reversal saved successfully.',
        'success'
      );

      applyFinanceRefreshPayload(
        response.refreshPayload,
        studentIdToRefresh
      );
    })
    .withFailureHandler(function(error) {
      showToast(
        error && error.message
          ? error.message
          : 'Unable to reverse payment.',
        'error'
      );
    })
    .reversePayment(
      paymentId,
      reversalAmount,
      reason
    );
}
