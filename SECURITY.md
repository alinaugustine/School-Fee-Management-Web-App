# Security and Privacy

## Public Repository Rules

Never commit:

- Real student names
- Parent names
- Phone numbers
- Addresses
- School credentials
- Spreadsheet IDs
- Script properties
- API keys
- Payment references
- Bank details
- Production URLs
- Private school logos without permission
- Screenshots containing confidential data

## Screenshot Standard

Before uploading screenshots:

1. Remove the school name and logo unless publication is authorized.
2. Replace student names with `XYZ`.
3. Mask phone numbers.
4. Replace financial amounts with `$$$`.
5. Remove payment references.
6. Remove user email addresses.
7. Remove spreadsheet URLs and IDs.
8. Confirm browser tabs and bookmarks are not visible.

## Configuration

Use Script Properties or another secure configuration method for values that should not be stored in source code.

Example values that should remain private:

```text
SPREADSHEET_ID
ADMIN_EMAILS
API_KEYS
PRODUCTION_URL
```

## Access Management

- Apply least-privilege permissions.
- Restrict administrative functions.
- Review deployed web-app access settings.
- Test access using a non-owner account.
- Remove access when a user leaves.
- Maintain a documented authorized-user list.

## Incident Reporting

Security issues should not be posted publicly with sensitive details. Contact the repository owner privately.
