const XLSX = require('xlsx');

/**
 * Export job applications to Excel (.xlsx)
 */
const exportToExcel = (jobs) => {
  const data = jobs.map((j) => ({
    'Company Name': j.companyName,
    'Job Role': j.jobRole,
    'Job URL': j.jobUrl || '',
    'HR Name': j.hrName || '',
    'HR Email': j.hrEmail || '',
    'Phone': j.phone || '',
    'Location': j.location || '',
    'Job Type': j.jobType || '',
    'Status': j.status,
    'Priority': j.priority,
    'Salary': j.salary || '',
    'Applied Date': j.appliedDate ? new Date(j.appliedDate).toLocaleDateString() : '',
    'Follow-up Date': j.followUpDate ? new Date(j.followUpDate).toLocaleDateString() : '',
    'Source': j.source || '',
    'Notes': j.notes || '',
    'Created At': new Date(j.createdAt).toLocaleDateString(),
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((row) => String(row[key] || '').length), 12),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Job Applications');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Export job applications to CSV
 */
const exportToCSV = (jobs) => {
  const data = jobs.map((j) => ({
    companyName: j.companyName,
    jobRole: j.jobRole,
    jobUrl: j.jobUrl || '',
    hrName: j.hrName || '',
    hrEmail: j.hrEmail || '',
    phone: j.phone || '',
    location: j.location || '',
    jobType: j.jobType || '',
    status: j.status,
    priority: j.priority,
    salary: j.salary || '',
    appliedDate: j.appliedDate ? new Date(j.appliedDate).toLocaleDateString() : '',
    followUpDate: j.followUpDate ? new Date(j.followUpDate).toLocaleDateString() : '',
    source: j.source || '',
    notes: j.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  return XLSX.utils.sheet_to_csv(ws);
};

/**
 * Parse imported CSV/Excel and return normalised job objects
 */
const parseImportFile = (buffer, mimetype) => {
  let wb;
  if (mimetype === 'text/csv') {
    wb = XLSX.read(buffer, { type: 'buffer', raw: false });
  } else {
    wb = XLSX.read(buffer, { type: 'buffer' });
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  return rows.map((row) => ({
    companyName: row['Company Name'] || row['companyName'] || '',
    jobRole: row['Job Role'] || row['jobRole'] || '',
    jobUrl: row['Job URL'] || row['jobUrl'] || '',
    hrName: row['HR Name'] || row['hrName'] || '',
    hrEmail: row['HR Email'] || row['hrEmail'] || '',
    phone: row['Phone'] || row['phone'] || '',
    location: row['Location'] || row['location'] || '',
    jobType: row['Job Type'] || row['jobType'] || '',
    status: row['Status'] || row['status'] || 'Not Applied',
    priority: row['Priority'] || row['priority'] || 'Medium',
    salary: row['Salary'] || row['salary'] || '',
    appliedDate: row['Applied Date'] || row['appliedDate'] || null,
    followUpDate: row['Follow-up Date'] || row['followUpDate'] || null,
    source: row['Source'] || row['source'] || '',
    notes: row['Notes'] || row['notes'] || '',
  })).filter((r) => r.companyName);
};

module.exports = { exportToExcel, exportToCSV, parseImportFile };
