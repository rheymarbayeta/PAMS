<?php
/**
 * Generate Report API Endpoint - Simplified Version with Fallback
 * POST /api/generate-report
 * 
 * Request body:
 * {
 *   "template": "permit.jrxml",
 *   "format": "pdf",
 *   "data": { ... }
 * }
 */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['template']) || !isset($input['format'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: template, format']);
    exit;
}

try {
    $template = $input['template'];
    $format = strtolower($input['format']);
    $data = $input['data'] ?? [];
    
    // Validate template name (security check)
    if (strpos($template, '..') !== false || strpos($template, '/') !== false) {
        http_response_code(400);
        echo json_encode(['error' => "Invalid template name"]);
        exit;
    }
    
    // Validate template exists
    $templatePath = __DIR__ . '/../reports/' . $template;
    if (!file_exists($templatePath)) {
        http_response_code(404);
        echo json_encode(['error' => "Template not found: {$template}"]);
        exit;
    }
    
    // Validate format
    $allowedFormats = ['pdf', 'xlsx', 'xls', 'html', 'csv', 'xml', 'docx'];
    if (!in_array($format, $allowedFormats)) {
        http_response_code(400);
        echo json_encode(['error' => "Invalid format: {$format}. Allowed: " . implode(', ', $allowedFormats)]);
        exit;
    }
    
    // Create output directory
    $outputDir = __DIR__ . '/../output';
    if (!is_dir($outputDir)) {
        mkdir($outputDir, 0777, true);
    }
    
    // Generate report using JasperReports or fallback
    $reportContent = generateReport($templatePath, $data, $format);
    
    if (!$reportContent) {
        throw new Exception("Failed to generate report content");
    }
    
    // Encode as base64
    $base64Content = base64_encode($reportContent);
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Report generated successfully',
        'filename' => 'report_' . date('YmdHis') . '.' . $format,
        'format' => $format,
        'size' => strlen($reportContent),
        'data' => $base64Content,
        'contentType' => getMimeType($format)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Generate report in requested format
 */
function generateReport($templatePath, $data, $format) {
    switch ($format) {
        case 'pdf':
            return generatePDFReport($data);
        case 'html':
            return generateHTMLReport($data);
        case 'csv':
            return generateCSVReport($data);
        case 'xlsx':
        case 'xls':
            return generateExcelReport($data);
        case 'xml':
            return generateXMLReport($data);
        default:
            return generateHTMLReport($data);
    }
}

/**
 * Generate HTML Report
 */
function generateHTMLReport($data) {
    $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 5px; }
        h1 { color: #003366; text-align: center; padding-bottom: 10px; border-bottom: 2px solid #003366; }
        .header-info { margin: 15px 0; font-size: 12px; color: #666; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th { background-color: #003366; color: white; padding: 12px; text-align: left; font-weight: bold; }
        td { border: 1px solid #ddd; padding: 10px; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        tr:hover { background-color: #f0f0f0; }
        .summary { margin-top: 20px; padding: 15px; background-color: #e8e8e8; border-left: 4px solid #003366; }
        .summary p { margin: 5px 0; }
    </style>
</head>
<body>
<div class="container">';
    
    $html .= '<h1>Report</h1>';
    
    // Header info
    $html .= '<div class="header-info">';
    if (isset($data['generatedAt'])) {
        $html .= '<p>Generated: ' . htmlspecialchars($data['generatedAt']) . '</p>';
    }
    if (isset($data['generatedBy'])) {
        $html .= '<p>By: ' . htmlspecialchars($data['generatedBy']) . '</p>';
    }
    $html .= '</div>';
    
    // Data table
    if (isset($data['records']) && is_array($data['records']) && count($data['records']) > 0) {
        $html .= '<table>';
        $html .= '<thead><tr>';
        
        $firstRecord = $data['records'][0];
        foreach (array_keys((array)$firstRecord) as $key) {
            $displayKey = str_replace('_', ' ', ucwords($key, '_'));
            $html .= '<th>' . htmlspecialchars($displayKey) . '</th>';
        }
        $html .= '</tr></thead>';
        $html .= '<tbody>';
        
        foreach ($data['records'] as $record) {
            $html .= '<tr>';
            foreach ((array)$record as $value) {
                if (is_numeric($value) && !is_string($value)) {
                    $html .= '<td style="text-align: right;">' . htmlspecialchars(number_format($value, 2)) . '</td>';
                } else {
                    $html .= '<td>' . htmlspecialchars($value) . '</td>';
                }
            }
            $html .= '</tr>';
        }
        
        $html .= '</tbody></table>';
    }
    
    // Summary
    if (isset($data['totalRecords']) || isset($data['totalAmount'])) {
        $html .= '<div class="summary">';
        if (isset($data['totalRecords'])) {
            $html .= '<p><strong>Total Records:</strong> ' . htmlspecialchars($data['totalRecords']) . '</p>';
        }
        if (isset($data['totalAmount'])) {
            $html .= '<p><strong>Total Amount:</strong> ₱' . number_format($data['totalAmount'], 2) . '</p>';
        }
        $html .= '</div>';
    }
    
    $html .= '</div></body></html>';
    return $html;
}

/**
 * Generate CSV Report
 */
function generateCSVReport($data) {
    if (!isset($data['records']) || !is_array($data['records'])) {
        return '';
    }
    
    $output = fopen('php://memory', 'w');
    
    if (count($data['records']) > 0) {
        $firstRecord = $data['records'][0];
        $headers = array_keys((array)$firstRecord);
        fputcsv($output, $headers);
        
        foreach ($data['records'] as $record) {
            $row = [];
            foreach ($headers as $header) {
                $row[] = isset($record[$header]) ? $record[$header] : '';
            }
            fputcsv($output, $row);
        }
    }
    
    rewind($output);
    $csv = stream_get_contents($output);
    fclose($output);
    
    return $csv;
}

/**
 * Generate XML Report
 */
function generateXMLReport($data) {
    $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><report></report>');
    
    if (isset($data['generatedAt'])) {
        $xml->addChild('generatedAt', htmlspecialchars($data['generatedAt']));
    }
    if (isset($data['generatedBy'])) {
        $xml->addChild('generatedBy', htmlspecialchars($data['generatedBy']));
    }
    
    if (isset($data['records']) && is_array($data['records'])) {
        $recordsNode = $xml->addChild('records');
        foreach ($data['records'] as $record) {
            $recordNode = $recordsNode->addChild('record');
            foreach ((array)$record as $key => $value) {
                $recordNode->addChild($key, htmlspecialchars($value));
            }
        }
    }
    
    if (isset($data['totalRecords'])) {
        $xml->addChild('totalRecords', $data['totalRecords']);
    }
    if (isset($data['totalAmount'])) {
        $xml->addChild('totalAmount', $data['totalAmount']);
    }
    
    return $xml->asXML();
}

/**
 * Generate PDF Report (returns HTML - client handles PDF conversion)
 */
function generatePDFReport($data) {
    // Note: For actual PDF, you would use a library like mPDF or TCPDF
    // For now, return HTML that can be converted to PDF on client side or via headless browser
    return generateHTMLReport($data);
}

/**
 * Generate Excel Report (returns CSV - can be opened in Excel)
 */
function generateExcelReport($data) {
    // For now, return CSV format which Excel can open
    return generateCSVReport($data);
}

/**
 * Get MIME type for format
 */
function getMimeType($format) {
    $mimeTypes = [
        'pdf' => 'application/pdf',
        'xlsx' => 'text/csv',
        'xls' => 'text/csv',
        'html' => 'text/html; charset=utf-8',
        'csv' => 'text/csv',
        'xml' => 'application/xml',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return $mimeTypes[$format] ?? 'application/octet-stream';
}
?>

