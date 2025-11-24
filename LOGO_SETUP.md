# Logo Setup Instructions

The Municipality of Dalaguete logo has been integrated into the PAMS application. To complete the setup, please add your logo image file in the following locations:

## Frontend Logo

1. Place your logo image file (PNG format recommended) in:
   ```
   frontend/public/dalaguete-logo.png
   ```

2. The logo will appear in:
   - Navigation bar (top left, next to "PAMS" text)
   - Application detail pages (header section)

## Backend Logo (for PDF generation)

1. Place your logo image file (PNG format recommended) in:
   ```
   backend/assets/dalaguete-logo.png
   ```

2. The logo will appear in:
   - Generated Permit PDFs
   - Generated Assessment Report PDFs

## Image Requirements

- **Format**: PNG (recommended) or JPG
- **Size**: Recommended 200x200 pixels or larger (square format works best)
- **Transparency**: PNG with transparency is recommended for best appearance
- **File name**: Must be exactly `dalaguete-logo.png` (case-sensitive)

## Notes

- If the logo file is not found, the application will continue to work without displaying the logo
- The logo will be automatically resized to fit the display area
- For best results, use a high-quality image with a transparent background

