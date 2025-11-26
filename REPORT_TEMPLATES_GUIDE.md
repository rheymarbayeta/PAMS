# Report Templates System Guide

This guide explains how to use the Word document template system for generating permit reports in PAMS.

## Overview

The template system uses **docxtemplater** to generate Microsoft Word documents (.docx) from templates with placeholder variables. This allows non-technical users to create and modify report formats using Microsoft Word.

## Setup

### 1. Run the Database Migration

Execute the migration to create the Report_Templates table:

```sql
-- Run this in your MySQL client
SOURCE database/migrations/add_report_templates.sql;
```

Or connect to your database and run the contents of `database/migrations/add_report_templates.sql`.

### 2. Restart the Backend Server

The backend server needs to be restarted to load the new routes:

```bash
cd backend
npm run dev
```

## Creating a Template

### Step 1: Create a Word Document

1. Open Microsoft Word
2. Design your permit report layout with headers, formatting, tables, etc.
3. Add placeholder variables using curly braces `{variable_name}`

### Step 2: Add Placeholders

Use these placeholders in your template:

#### Application Information
- `{application_number}` - Application number (e.g., 2025-11-001)
- `{application_date}` - Application submission date
- `{status}` - Current application status

#### Permit Information
- `{permit_number}` - Issued permit number
- `{permit_type}` - Type of permit (e.g., "Mayor's Permit")
- `{permit_description}` - Permit type description
- `{permit_valid_from}` - Permit validity start date
- `{permit_valid_until}` - Permit validity end date
- `{issued_date}` - Date permit was issued
- `{issued_date_ordinal}` - Issued date with ordinal (e.g., "26th day of November, 2025")

#### Business/Entity Information
- `{business_name}` - Name of the business/entity
- `{entity_name}` - Same as business_name
- `{entity_type}` - Type of entity
- `{registration_number}` - Business registration number
- `{contact_person}` - Contact person name
- `{email}` - Business email
- `{phone}` - Business phone number
- `{business_address}` - Business address

#### Category Information
- `{attribute_name}` - Attribute/category name
- `{category}` - Same as attribute_name
- `{attribute_description}` - Category description

#### Fees Table (Loop)
Use this syntax for a table of fees:

```
{#fees}
| {row_number} | {fee_name} | {quantity} | {unit_amount} | {amount} |
{/fees}
```

Available fields in the loop:
- `{fees.row_number}` - Row number (1, 2, 3...)
- `{fees.fee_name}` - Name of the fee
- `{fees.quantity}` - Quantity assessed
- `{fees.unit_amount}` - Amount per unit (formatted with ₱)
- `{fees.amount}` - Total amount (formatted with ₱)

#### Permit Activities Table (Loop)
```
{#permit_activities}
| {row_number} | {activity} | {quantity} | {unit_price} | {total_price} |
{/permit_activities}
```

#### Assessment Totals
- `{total_assessed}` - Total assessed amount (formatted)
- `{total_annual_fee}` - Total annual fee
- `{first_quarter}` - First quarter amount
- `{second_quarter}` - Second quarter amount
- `{third_quarter}` - Third quarter amount
- `{fourth_quarter}` - Fourth quarter amount
- `{assessed_by}` - Name of assessor
- `{assessment_date}` - Date of assessment

#### Payment Information
- `{total_paid}` - Total amount paid
- `{balance_due}` - Remaining balance
- `{latest_receipt_number}` - Most recent receipt number
- `{latest_payment_date}` - Most recent payment date
- `{latest_payment_amount}` - Most recent payment amount

#### Payments Table (Loop)
```
{#payments}
| {row_number} | {receipt_number} | {payment_date} | {amount} |
{/payments}
```

#### Signatory Information
- `{signatory_name}` - Signatory name from system settings
- `{signatory_title}` - Signatory title
- `{signatory_department}` - Signatory department
- `{municipality_name}` - Municipality name
- `{municipality_address}` - Municipality address

#### Date Placeholders
- `{current_date}` - Current date (e.g., "November 26, 2025")
- `{current_date_ordinal}` - Current date with ordinal
- `{current_year}` - Current year (e.g., "2025")

### Step 3: Upload the Template

1. Go to **Admin > Report Templates** in the PAMS system
2. Click **Upload Template**
3. Select your Word document
4. Enter a template name
5. Optionally assign it to a specific permit type
6. Check "Set as default" if this should be the default template
7. Click **Upload**

## Using Templates

### Generate a Document

1. Open an application that is in "Paid", "Issued", or "Released" status
2. Click the **Generate Word** button
3. The system will download a Word document with all placeholders filled in

### Managing Templates

- **Download**: Download the original template file
- **Set as Default**: Make this template the default for its permit type
- **Delete**: Remove the template from the system

## Example Template

Here's a simple example of a permit template:

```
                    REPUBLIC OF THE PHILIPPINES
                    Municipality of {municipality_name}
                    Province of {municipality_province}
                    
                    MAYOR'S PERMIT
                    
Permit No.: {permit_number}                    Date Issued: {issued_date}

This is to certify that:

    Business Name: {business_name}
    Business Address: {business_address}
    Contact Person: {contact_person}
    Permit Type: {permit_type}
    
Is hereby granted permission to operate the above-described business 
from {permit_valid_from} to {permit_valid_until}.

FEES ASSESSED:

| No. | Description | Qty | Unit Amount | Total |
|-----|-------------|-----|-------------|-------|
{#fees}
| {row_number} | {fee_name} | {quantity} | {unit_amount} | {amount} |
{/fees}

TOTAL: {total_assessed}

OR No.: {latest_receipt_number}
Date Paid: {latest_payment_date}

                                        ____________________________
                                        {signatory_name}
                                        {signatory_title}
```

## Troubleshooting

### "No template available" error
- Upload a template in Admin > Report Templates
- Make sure the template is set as "Active"
- For permit-type-specific templates, ensure the permit type matches

### Placeholders not replaced
- Check that placeholder names are spelled correctly
- Ensure placeholders use curly braces: `{variable_name}`
- Verify the data exists in the application (some fields may be empty)

### Table loops not working
- Use `{#loop_name}` to start the loop
- Use `{/loop_name}` to end the loop
- Each row in the loop should be on its own line

## Technical Details

- Supported file formats: `.docx` (recommended), `.doc`
- Maximum file size: 10MB
- Templates are stored in: `backend/uploads/templates/`
- Uses: docxtemplater, pizzip libraries
