# Jasper Reports Service Setup Guide

## Overview
This is a PHP-based microservice that integrates Jasper Reports with the PAMS backend. It handles report generation from templates designed in Jasper Studio.

## Architecture

The system uses Jasper Studio-designed templates (`.jrxml` files) with a **simplified PHP fallback approach** that:
- Parses Jasper report templates
- Converts data to multiple formats (HTML, CSV, XML, etc.)
- Returns encoded reports for client use
- Supports future integration with full JasperReports CLI tools

## Directory Structure
```
jasper-service/
├── api/                    # API endpoint files
│   ├── index.php          # Router
│   └── generate-report.php # Main report generator
├── config/                # Configuration files
├── reports/               # .jrxml template files (designed in Jasper Studio)
│   ├── applications.jrxml # Sample application report
│   └── permits.jrxml      # Sample permit report
├── output/                # Generated reports (temporary storage)
├── composer.json          # PHP dependencies
├── Dockerfile             # Docker container setup
├── .htaccess             # Apache URL rewriting rules
└── README.md             # This file
```

## Setup Instructions

### 1. Service is Already Containerized
The Jasper service is included in `docker-compose.yml` and automatically builds and runs with:
```bash
docker-compose up -d jasper-service
```

### 2. Service Access
- **From backend (container)**: `http://jasper-service:9000`
- **From host machine**: `http://localhost:9000`
- **API Endpoint**: `POST /api/generate-report`

### 3. Create Reports with Jasper Studio

#### Design Your Report in Jasper Studio

1. **Launch Jasper Studio** (already installed on your system)
2. **Create New Report**: File → New → Jasper Report
3. **Configure Data Source**:
   - Use JSON data adapter (recommended)
   - Or configure MySQL direct connection if desired
4. **Design Layout**:
   - **Title Band**: Report header with title and metadata
   - **Column Header**: Field labels
   - **Detail Band**: Data rows
   - **Summary Band**: Totals and statistics

5. **Define Fields** to match your data:
   ```
   - application_id (Integer)
   - application_number (String)
   - business_name (String)
   - permit_type_name (String)
   - attribute_name (String)
   - status (String)
   - total_amount_due (Double)
   - created_at (Date)
   ```

6. **Define Parameters** (optional):
   ```
   - generatedAt (String)
   - generatedBy (String)
   - totalRecords (Integer)
   - totalAmount (Double)
   ```

7. **Export as JRXML**: Save template as `.jrxml` file
8. **Deploy**: Copy to `jasper-service/reports/` directory

## API Usage

### Endpoint: POST /api/generate-report

**Request:**
```json
{
  "template": "applications.jrxml",
  "format": "html",
  "data": {
    "records": [
      {
        "application_id": 1,
        "application_number": "APP-001",
        "business_name": "Sample Business",
        "permit_type_name": "Business Permit",
        "attribute_name": "Commercial",
        "status": "Approved",
        "total_amount_due": 5000.00,
        "created_at": "2026-03-24T10:30:00Z"
      }
    ],
    "generatedAt": "2026-03-24T12:00:00Z",
    "generatedBy": "Admin User",
    "totalRecords": 1,
    "totalAmount": 5000.00
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Report generated successfully",
  "filename": "report_20260324120000.html",
  "format": "html",
  "size": 2439,
  "data": "base64_encoded_content...",
  "contentType": "text/html; charset=utf-8"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Template not found: invalid.jrxml"
}
```

## Supported Formats

- **html** - HTML format (styled, recommended for web viewing)
- **csv** - Comma-separated values (Excel-compatible)
- **xml** - XML format (machine-readable)
- **pdf** - PDF format (returns HTML, convert client-side using browser)
- **xlsx/xls** - Excel format (currently returns CSV, can enhance with PHPExcel)

## Node.js Backend Integration

The backend calls this service via the `/api/reports/generate` endpoint:

```javascript
POST /api/reports/generate
{
  "templateName": "applications",
  "format": "html",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "statusFilter": "Approved"
}
```

**Backend Flow:**
1. Authenticates user request
2. Fetches filtered data from MySQL
3. Formats data for Jasper
4. Calls `http://jasper-service:9000/api/generate-report`
5. Returns generated report file to client

## Testing

### Test with cURL
```bash
curl -X POST http://localhost:9000/api/generate-report \
  -H "Content-Type: application/json" \
  -d '{
    "template": "applications.jrxml",
    "format": "html",
    "data": {
      "records": [{"application_number": "APP-001", "business_name": "Test"}],
      "totalRecords": 1
    }
  }'
```

### Check Service Status
```bash
# View logs
docker logs pams-jasper

# Verify running
docker ps | grep pams-jasper

# Test connectivity from backend
docker exec pams-backend curl http://jasper-service:9000/api/index.php
```

## Troubleshooting

### Template Not Found
- Verify template file exists in `jasper-service/reports/`
- Check filename matches exactly (case-sensitive)
- Ensure `.jrxml` extension is correct
- Example: `applications.jrxml`

### Invalid Format Error
- Supported formats: html, csv, xml, pdf, xlsx, xls
- Check spelling and lowercase format name
- Verify format is supported

### No Data in Report
- Ensure `records` array is provided in data
- Check field names match template definitions
- Verify data types match (String, Integer, Double, Date)

### Service Not Responding
```bash
# Restart service
docker-compose up -d --no-deps --build jasper-service

# Check container is running
docker ps | grep pams-jasper

# Check port is accessible
curl -i http://localhost:9000/
```

### High Memory Usage
- Limit records per report (1000 max recommended)
- Use pagination or date filters
- Consider archiving old reports

## Creating New Report Templates

### Example: Assessment Report

1. Open Jasper Studio
2. Create new report
3. Define fields:
   - assessment_id
   - application_id
   - business_name
   - total_assessed_amount
   - status
   - assessment_date

4. Design layout with columns for each field
5. Add summary showing total assessed amount
6. Export as `assessments.jrxml`
7. Copy to `jasper-service/reports/`

### Call from Backend:
```javascript
POST /api/reports/generate
{
  "templateName": "assessments",
  "format": "html"
}
```

## Performance Optimization

1. **Limit Records**: 
   - Max 1000 records per report
   - Use date ranges in filters

2. **Table View Optimization**:
   - Only necessary columns in templates
   - Efficient styling in HTML

3. **Caching** (Future):
   - Store recently generated reports
   - Serve from cache for duplicate requests

4. **Monitor Resources**:
   - Keep `output/` directory cleaned
   - Monitor disk space
   - Check memory usage

## Security Considerations

- **Access Control**: PAMS authentication required before report access
- **SQL Injection**: Prevented by backend parameterized queries
- **Template Validation**: Filename sanitization prevents directory traversal
- **File Handling**: Temporary files cleaned up after generation
- **CORS**: Service accessible from backend container only
- **Sensitive Data**: Reports should respect role-based data filtering

## Docker Compose Configuration

```yaml
jasper-service:
  build:
    context: ./jasper-service
    dockerfile: Dockerfile
  container_name: pams-jasper
  ports:
    - "9000:80"              # Apache/PHP on port 9000
  volumes:
    - ./jasper-service/reports:/var/www/html/reports:ro
    - jasper_output:/var/www/html/output
  networks:
    - pams-network
```

## Enhancement Roadmap

- [ ] PDF generation using mPDF or TCPDF library
- [ ] Excel generation using PHPExcel
- [ ] Full JasperReports integration with Java CLI
- [ ] Chart generation in reports
- [ ] Scheduled report generation
- [ ] Email delivery of reports
- [ ] Report caching and versioning
- [ ] Advanced filtering and parameters

## Support & Documentation

- **Jasper Studio**: See official [Jasper documentation](https://community.jaspersoft.com/community/jasperreports-server-community-edition/)
- **Backend Integration**: See `backend/routes/reports.js`
- **API Testing**: Use Postman or Insomnia
- **Logs**: `docker logs pams-jasper`

## Next Steps

1. ✅ Service is running on `http://localhost:9000`
2. ✅ Sample templates included (applications.jrxml, permits.jrxml)
3. 🔄 Design custom report templates in Jasper Studio
4. 🔄 Test report generation through frontend
5. 🔄 Optimize template layouts and styling

