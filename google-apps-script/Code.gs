/**
 * Google Apps Script for Xpotential Real Estate CRM
 * --------------------------------------------------
 * 1. Provides 100% FREE CRUD API for Google Sheets (Project Leads & Secondary Leads)
 * 2. Automatically creates Google Calendar reminders/events when followUpDate is set
 * 
 * Setup Instructions:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename 'Sheet1' to 'ProjectLeads' and create another sheet named 'SecondaryLeads'
 * 3. In the top menu, go to: Extensions -> Apps Script
 * 4. Replace all code in the editor with this script
 * 5. Click "Deploy" -> "New deployment"
 * 6. Select type: "Web app"
 * 7. Set:
 *    - Description: "Real Estate CRM API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 8. Click "Deploy", authorize permissions, and copy the Web App URL!
 */

const SHEET_PROJECTS = 'ProjectLeads';
const SHEET_SECONDARY = 'SecondaryLeads';

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const projects = getSheetData(ss.getSheetByName(SHEET_PROJECTS));
  const secondary = getSheetData(ss.getSheetByName(SHEET_SECONDARY));

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    projectLeads: projects,
    secondaryLeads: secondary
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = data.action; // 'upsert', 'delete', or 'bulkSync'
    const type = data.type;     // 'project' or 'secondary'
    const sheet = ss.getSheetByName(type === 'project' ? SHEET_PROJECTS : SHEET_SECONDARY);

    // 1. Direct Background Calendar Event Creation (Zero UI redirection)
    if (action === 'createCalendarEvent') {
      const eventDetails = data.event || data.lead || data;
      const res = syncToGoogleCalendar(eventDetails, data.type);
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: 'Saved directly to Google Calendar',
        event: res 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'upsert') {
      const lead = data.lead;
      upsertRow(sheet, lead);
      
      // Auto-create Google Calendar event if followUpDate is provided
      if (lead.followUpDate) {
        syncToGoogleCalendar(lead, type);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', lead }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      deleteRowById(sheet, data.id);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', id: data.id }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Creates an event in Google Calendar with a 15-minute popup reminder
 */
function syncToGoogleCalendar(lead, type) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const name = lead.ownerName || lead.name || 'Client';
    const prop = lead.projectName || lead.property || 'Property';
    const contact = lead.contactNo || lead.mobile || 'N/A';
    const title = '📞 CRM Follow-up: ' + name + ' (' + prop + ')';

    // Parse YYYY-MM-DD
    const parts = lead.followUpDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    // Schedule for 10:00 AM - 10:30 AM on that day
    const startTime = new Date(year, month, day, 10, 0, 0);
    const endTime = new Date(year, month, day, 10, 30, 0);

    const description = [
      'Client: ' + name,
      'Contact: ' + contact,
      'Project/Property: ' + prop,
      lead.notes ? '\nNotes: ' + lead.notes : '',
      '\nAdded automatically by Xpotential CRM'
    ].join('\n');

    const event = calendar.createEvent(title, startTime, endTime, {
      description: description,
      location: lead.community || lead.projectName || lead.property || 'Dubai'
    });

    // Add reminder popup 15 minutes before
    event.addPopupReminder(15);
  } catch (e) {
    Logger.log('Calendar sync error: ' + e);
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const headers = rows[0];
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    items.push(item);
  }
  return items;
}

function upsertRow(sheet, lead) {
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  let headers = rows.length > 0 ? rows[0] : [];

  if (headers.length === 0) {
    headers = Object.keys(lead);
    sheet.appendRow(headers);
  }

  // Find if row with ID already exists
  const idIndex = headers.indexOf('id');
  let foundRowIndex = -1;

  if (idIndex !== -1 && rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][idIndex]) === String(lead.id)) {
        foundRowIndex = i + 1; // 1-indexed sheet row
        break;
      }
    }
  }

  const rowValues = headers.map(header => lead[header] !== undefined ? lead[header] : '');

  if (foundRowIndex !== -1) {
    sheet.getRange(foundRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function deleteRowById(sheet, id) {
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return;
  const idIndex = rows[0].indexOf('id');
  if (idIndex === -1) return;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}
