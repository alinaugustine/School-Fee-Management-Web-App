# Financial and Data Controls

## Purpose

This document describes controls designed to protect data quality, prevent duplicate transactions, improve reconciliation, and support reliable fee reporting.

## Student Master Controls

- Automatically generated student ID
- Required student name
- Required class and section
- Controlled funding-type values
- Controlled active/inactive status
- Duplicate checks using selected student attributes
- Fee assignment based on approved fee structure
- Academic-year association
- Restricted deletion or deactivation

## Payment Controls

- Automatically generated payment ID
- Required student ID
- Payment amount greater than zero
- Payment date validation
- Controlled payment-method values
- Reference number required for applicable payment methods
- Duplicate checks using student, date, amount, and reference
- Prevention of payments exceeding configured thresholds
- Reversal instead of hard deletion
- User and timestamp tracking

## Reporting Controls

- Exclude reversed or invalid payments
- Reconcile total payments to payment-detail records
- Reconcile student balances to assigned fees less valid payments
- Separate RTE students from regular fee-paying students
- Filter results by academic year
- Display dashboard refresh timestamp
- Provide exception reports for unusual records

## Suggested Reconciliation Checks

```text
Total Assigned Fees
- Valid Payments
= Outstanding Balance
```

```text
Student-Level Outstanding Balances
= Dashboard Outstanding Balance
```

```text
Payment Detail Total
= Dashboard Payments Received
```

## Manager Review Controls

A manager dashboard should surface:

- Duplicate student candidates
- Duplicate payment candidates
- Payments without references
- Payments exceeding student balance
- Reversed transactions
- Recently edited records
- Unmapped classes or fee structures
- Students with missing contact details
- Dashboard-to-ledger reconciliation differences

## Audit Trail

Each material action should capture:

- Event ID
- Timestamp
- User email
- Action type
- Record type
- Record ID
- Previous value
- New value
- Reason or comment

## Access Controls

Suggested roles:

| Role | Access |
|---|---|
| Viewer | Read-only dashboards and reports |
| Finance User | Record payments and view students |
| Administrator | Manage students, settings, and users |
| Manager | Review exceptions, reversals, and reconciliations |

The production implementation should apply least-privilege access.
