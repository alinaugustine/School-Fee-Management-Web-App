# System Architecture

## 1. Purpose

The School Fee Management System provides a centralized interface for student fee administration, payment tracking, balance monitoring, and financial reporting.

The application is designed for schools that need a practical, low-cost system built within the Google Workspace ecosystem.

## 2. Architecture Overview

```text
Presentation Layer
HTML + CSS + JavaScript
        |
        v
Application Interface
google.script.run
        |
        v
Service Layer
Google Apps Script
        |
        +-------------------------+
        |                         |
        v                         v
Business Rules              Reporting Services
        |                         |
        +------------+------------+
                     |
                     v
Data Layer
Google Sheets
```

## 3. Main Components

### Presentation Layer

The browser interface provides:

- Dashboard
- Student list
- Student profile
- Add-student form
- Payment-entry form
- Reports
- Settings
- User administration

### Application Layer

Google Apps Script handles:

- Reading and writing records
- Student ID generation
- Payment ID generation
- Fee calculations
- Balance calculations
- Search and filter requests
- Validation
- Reporting
- User actions
- Error handling

### Data Layer

Google Sheets acts as a lightweight structured data store.

Suggested sheets:

| Sheet | Purpose |
|---|---|
| Students | Student master records |
| Payments | Payment transactions |
| Fee_Structure | Class and funding fee rules |
| Academic_Years | Academic-year configuration |
| Users | Authorized users and roles |
| Settings | Application configuration |
| Audit_Log | User activity and change history |

## 4. Suggested Relationships

```text
Students.StudentID 1 ---- * Payments.StudentID
Fee_Structure.Class 1 ---- * Students.Class
Academic_Years.Year 1 ---- * Students.AcademicYear
Users.Email 1 ---- * Audit_Log.UserEmail
```

Google Sheets is not a relational database, so these relationships must be enforced through application logic and validation.

## 5. Transaction Flow

### Add Student

1. Administrator opens the Add Student form.
2. Required fields are validated.
3. Duplicate checks are performed.
4. A unique student ID is generated.
5. The applicable fee is assigned.
6. The record is saved to the Students sheet.
7. An audit event is recorded.

### Record Payment

1. Administrator selects a student.
2. Current fee and balance are displayed.
3. Payment details are entered.
4. Amount and reference fields are validated.
5. Duplicate-payment checks are performed.
6. A unique payment ID is generated.
7. The payment is written to the Payments sheet.
8. Student balance and payment status are recalculated.
9. An audit event is recorded.

### Reporting

1. User selects filters.
2. Apps Script reads the relevant data.
3. Business rules classify the records.
4. Aggregated results are returned to the browser.
5. The interface renders cards, tables, and progress indicators.

## 6. Scalability Considerations

Google Sheets is appropriate for small and moderate workloads, but performance may decline as transaction volume grows.

Recommended optimization practices:

- Read data in batches
- Write data in batches
- Avoid repeated cell-by-cell operations
- Cache reference data
- Use indexed in-memory maps
- Limit dashboard queries
- Paginate large tables
- Archive prior academic years
- Separate reporting logic from transaction processing

A future version may move authentication and data storage to Firebase, Cloud SQL, or another managed database.
