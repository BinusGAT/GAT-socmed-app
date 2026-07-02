// Google Apps Script for Dashboard CRUD Operations
// Deploy as Web App and get the URL

const SHEET_NAME = "Laporan";
const HEADERS = ['Date', 'ID', 'Content Title', 'PIC', 'Category', 'Platform', 'Views', 'Account Reach', 'Likes', 'Comments', 'Follows', 'Repost', 'Shares', 'Total Engagement', 'Engagement Rate (%)', 'KPI Score', 'KPI Summary', 'URL', 'Comment Text'];

const SCRIPTS_SHEET_NAME = "Scripts";
const SCRIPTS_HEADERS = ['Title', 'Status', 'Category', 'Hook', 'Script', 'Hastags', 'References', 'Caption'];

const MEETINGS_SHEET_NAME = "Meetings";
const MEETINGS_HEADERS = ['ID', 'Date', 'Attendees', 'Absentees', 'Recap', 'VideoRecap'];

// Load security configurations from Google Apps Script Property Store (Project settings > Script properties)
const scriptProperties = PropertiesService.getScriptProperties();
const ENV_ROUTE_PREFIX = scriptProperties.getProperty('ENV_ROUTE_PREFIX');
const CONFIG_SYS_A = scriptProperties.getProperty('CONFIG_SYS_A');
const CONFIG_SYS_C = scriptProperties.getProperty('CONFIG_SYS_C');

let globalCallback = null;

function validateAuth(token, requiredLevel) {
  if (!token) return { valid: false, role: null };

  if (!ENV_ROUTE_PREFIX || !CONFIG_SYS_A || !CONFIG_SYS_C) {
    return { valid: false, role: null, error: "Missing required script properties: ENV_ROUTE_PREFIX, CONFIG_SYS_A, or CONFIG_SYS_C in Apps Script Project Settings." };
  }

  // Always re-hash the incoming session token with the server salt.
  // This prevents pass-the-hash attacks: even if an attacker intercepts
  // the session token (single hash), they cannot use it directly because
  // the server will hash it again before comparing against stored values.
  const rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token).trim() + ENV_ROUTE_PREFIX
  );
  const hash = rawBytes
    .map(function (b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); })
    .join('');

  if (hash === CONFIG_SYS_A) {
    return { valid: true, role: 'Admin' };
  }
  if (requiredLevel === 'any' && hash === CONFIG_SYS_C) {
    return { valid: true, role: 'Creator' };
  }
  return { valid: false, role: null };
}

// Clean up user inputs before writing
function sanitizeInput(value, maxLength) {
  if (value === null || value === undefined) return '';
  maxLength = maxLength || 5000;
  return String(value).substring(0, maxLength);
}

function doGet(e) {
  const rawCallback = e.parameter.callback || null;
  globalCallback = rawCallback && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawCallback) ? rawCallback : null;
  return handleRequest(e);
}

function doPost(e) {
  const rawCallback = e.parameter.callback || null;
  globalCallback = rawCallback && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawCallback) ? rawCallback : null;
  return handleRequest(e);
}

function handleRequest(e) {
  let params = {};

  // 1. Read query parameters
  if (e && e.parameter) {
    for (let key in e.parameter) {
      params[key] = e.parameter[key];
    }
  }

  // 2. Read POST request body if present
  if (e && e.postData && e.postData.contents) {
    try {
      const parsedBody = JSON.parse(e.postData.contents);
      for (let key in parsedBody) {
        params[key] = parsedBody[key];
      }
    } catch (err) {
      // Not JSON or empty body
    }
  }

  const action = String(params.action || params.Action || (e && e.parameter && (e.parameter.action || e.parameter.Action)) || '').trim();
  const token = String(params.token || params.Token || params.passHash || (e && e.parameter && (e.parameter.token || e.parameter.passHash)) || '').trim();

  if (!action) {
    return createResponse({ success: false, error: 'No action specified in request parameters.' });
  }

  try {
    // Check authorization levels for request actions
    if (['create', 'update', 'delete', 'delete_batch', 'save_schedule', 'delete_schedule', 'save_meeting', 'delete_meeting'].indexOf(action) !== -1) {
      const auth = validateAuth(token, 'admin');
      if (!auth.valid) {
        return createResponse({ success: false, error: auth.error || 'Unauthorized: Admin access required' });
      }
    } else if (['read', 'read_all', 'read_scripts', 'save_script', 'delete_script', 'read_meetings'].indexOf(action) !== -1) {
      const auth = validateAuth(token, 'any');
      if (!auth.valid) {
        return createResponse({ success: false, error: auth.error || 'Unauthorized: Login required' });
      }
    }

    let result;
    switch (action) {
      // Internal Workspace Mode Validation
      case 'validate_mode':
        const verifyRole = params.role || 'Admin';
        const passcode = params.passcode || '';
        
        let passHash = '';
        if (passcode) {
          const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, passcode + ENV_ROUTE_PREFIX);
          passHash = rawHash.map(function (b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('');
        }
        
        const verifyAuth = validateAuth(passHash, verifyRole === 'Admin' ? 'admin' : 'any');
        const roleMatches = verifyAuth.valid && (verifyAuth.role === verifyRole);
        result = { 
          success: true, 
          valid: roleMatches, 
          role: verifyAuth.role,
          token: roleMatches ? passHash : null
        };
        break;

      // Main Content Metrics Actions
      case 'read':
        result = readData();
        break;
      case 'create':
        result = createDataFromJson(params);
        break;
      case 'update':
        result = updateDataFromJson(params);
        break;
      case 'delete':
        result = deleteData(params);
        break;
      case 'delete_batch':
        result = deleteBatchData(params);
        break;

      // Story Telling Content Hub Script Actions
      case 'read_scripts':
        result = readScripts();
        break;
      case 'save_script':
        result = saveScriptFromJson(params);
        break;
      case 'delete_script':
        result = deleteScript(params.Title || params.title);
        break;

      // Master Schedule Task Actions
      case 'read_all':
        result = readAllData(token);
        break;
      case 'save_schedule':
        result = saveScheduleFromJson(params);
        break;
      case 'delete_schedule':
        result = deleteScheduleFromJson(params);
        break;

      // Meeting Memo Actions
      case 'read_meetings':
        result = readMeetings();
        break;
      case 'save_meeting':
        result = saveMeetingFromJson(params);
        break;
      case 'delete_meeting':
        result = deleteMeeting(params.ID || params.id);
        break;

      default:
        result = { success: false, error: 'Invalid action: ' + action };
    }

    return createResponse(result);
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

// Helper to get or automatically create a sheet tab if missing
function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function readData() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < HEADERS.length; j++) {
        let cellValue = data[i][j] || '';
        // Normalize dates to mm/dd/yyyy string format
        if (j === 0 && cellValue) {
          var iso = getIsoDateString(cellValue);
          if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            cellValue = iso.substring(5, 7) + "/" + iso.substring(8, 10) + "/" + iso.substring(0, 4);
          }
        }
        row[HEADERS[j]] = cellValue;
      }
      rows.push(row);
    }

    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createDataFromJson(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const platforms = ['Instagram', 'TikTok', 'Youtube'];
    const rowsToAdd = [];

    // The selected platform is the one input by the user in the form.
    // If no platform is selected, default to 'Instagram'
    const selectedPlatform = String(data.Platform || '').trim();

    // Field-specific max lengths for sanitization
    const fieldMaxLengths = {
      'Content Title': 500,
      'PIC': 200,
      'Category': 200,
      'Platform': 200,
      'URL': 2000,
      'Comment Text': 10000
    };

    for (var i = 0; i < platforms.length; i++) {
      const plat = platforms[i];
      const rowData = {};

      // Copy all incoming data properties
      for (let key in data) {
        rowData[key] = data[key];
      }

      // Override the Platform column
      rowData['Platform'] = plat;

      // If it's NOT the user's selected platform, clear out the metric and metadata fields
      if (plat.toLowerCase() !== selectedPlatform.toLowerCase()) {
        rowData['Views'] = 0;
        rowData['Account Reach'] = 0;
        rowData['Likes'] = 0;
        rowData['Comments'] = 0;
        rowData['Follows'] = 0;
        rowData['Repost'] = 0;
        rowData['Shares'] = 0;
        rowData['Total Engagement'] = 0;
        rowData['Engagement Rate (%)'] = 0;
        rowData['KPI Score'] = 3;
        rowData['KPI Summary'] = 3;
        rowData['URL'] = '';
        rowData['Comment Text'] = 'Planned from WebApp';
      }

      const newRow = [];
      for (let header of HEADERS) {
        const maxLen = fieldMaxLengths[header] || 500;
        newRow.push(sanitizeInput(rowData[header], maxLen));
      }
      rowsToAdd.push(newRow);
    }

    if (rowsToAdd.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rowsToAdd.length, HEADERS.length).setValues(rowsToAdd);
    }

    if (data.skipSort !== 'true') {
      sortAndReassignIds(sheet);
    }
    return { success: true, message: 'All 3 platform rows created successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateDataFromJson(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const hintIndex = parseInt(data.rowIndex);

    // Build match data from original_* fields (the old values before the edit)
    // so we can find the correct row even if the user changed Date/PIC/Category
    var matchData = {};
    if (data['original_Date']) {
      matchData['Date'] = data['original_Date'];
      matchData['Content Title'] = data['original_Content Title'] || '';
      matchData['PIC'] = data['original_PIC'] || '';
      matchData['Category'] = data['original_Category'] || '';
      matchData['Platform'] = data['original_Platform'] || '';
    } else {
      // Fallback: match against new values (works when nothing changed)
      matchData = data;
    }

    // Find the correct row by matching content rather than trusting the index
    const targetRow = findRowByContent(sheet, matchData, hintIndex);

    if (targetRow < 2) {
      return { success: false, error: 'Could not find matching row to update' };
    }

    const rowValues = HEADERS.map(h => data[h] || '');
    sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([rowValues]);

    if (data.skipSort !== 'true') {
      sortAndReassignIds(sheet);
    }

    // Sync back to Master Schedule if ID exists
    const id = data.ID || '';
    if (id) {
      const scheduleSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEDULE_SHEET_NAME);
      if (scheduleSheet) {
        const scheduleRow = findScheduleRowById(scheduleSheet, id);
        if (scheduleRow > 1) {
          const dateStr = data.Date || '';
          const formattedDate = dateStr ? getIsoDateString(dateStr) : '';
          let mmDdYyyyDate = '';
          if (formattedDate) {
            mmDdYyyyDate = formattedDate.substring(5, 7) + "/" + formattedDate.substring(8, 10) + "/" + formattedDate.substring(0, 4);
          }
          const pic = data.PIC || '';
          const title = data['Content Title'] || '';
          const category = data.Category || '';
          const month = getIndonesianMonth(mmDdYyyyDate);

          scheduleSheet.getRange(scheduleRow, 2, 1, 6).setValues([[mmDdYyyyDate, pic, title, category, '', month]]);

          sortScheduleSheet(scheduleSheet);
        }
      }
    }

    return { success: true, message: 'Data updated successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteData(params) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var rowIndex, skipSort;

    // Support both old signature (rowIndex, skipSort) and new object signature
    if (typeof params === 'object' && params !== null && !Array.isArray(params)) {
      skipSort = params.skipSort;
      var hintIndex = parseInt(params.rowIndex);

      // Try content-based matching first
      var targetRow = findRowByContent(sheet, params, hintIndex);

      if (targetRow >= 2) {
        sheet.deleteRow(targetRow);
        if (skipSort !== 'true') {
          sortAndReassignIds(sheet);
        }
        return { success: true, message: 'Data deleted successfully' };
      }

      // Fallback to index-based
      rowIndex = params.rowIndex;
    } else {
      rowIndex = params;
      skipSort = arguments[1];
    }

    var actualRow = parseInt(rowIndex) + 2;

    if (actualRow > 1) {
      sheet.deleteRow(actualRow);
      if (skipSort !== 'true') {
        sortAndReassignIds(sheet);
      }
      return { success: true, message: 'Data deleted successfully' };
    }

    return { success: false, error: 'Invalid row index' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteBatchData(params) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return { success: false, error: 'Sheet not found' };

    let rowsToDelete = [];
    if (params && Array.isArray(params.rows)) {
      rowsToDelete = params.rows;
    } else {
      return { success: false, error: 'Invalid or missing "rows" parameter' };
    }

    if (rowsToDelete.length === 0) {
      return { success: true, message: 'No rows to delete' };
    }

    // Get all spreadsheet data values to match rows
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, message: 'Sheet is empty' };
    }
    const allData = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

    // Collect all sheet row indices that match any of the deleted rows
    const rowIndicesToDelete = [];

    // Pre-process all delete payloads for faster matching
    const matchTargets = rowsToDelete.map(function(data) {
      return {
        date: getIsoDateString(data['Date'] || ''),
        title: String(data['Content Title'] || '').trim().toLowerCase(),
        pic: String(data['PIC'] || '').trim().toLowerCase(),
        cat: String(data['Category'] || '').trim().toLowerCase(),
        plat: String(data['Platform'] || '').trim().toLowerCase()
      };
    });

    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      const rowDate = getIsoDateString(row[0]);
      const rowTitle = String(row[2] || '').trim().toLowerCase();
      const rowPic = String(row[3] || '').trim().toLowerCase();
      const rowCat = String(row[4] || '').trim().toLowerCase();
      const rowPlat = String(row[5] || '').trim().toLowerCase();

      // Check if this sheet row matches any target in matchTargets
      const matchesAny = matchTargets.some(function(target) {
        return rowDate === target.date &&
               rowTitle === target.title &&
               rowPic === target.pic &&
               rowCat === target.cat &&
               rowPlat === target.plat;
      });

      if (matchesAny) {
        rowIndicesToDelete.push(i + 2);
      }
    }

    // Delete matching rows in reverse order to keep indices correct
    rowIndicesToDelete.sort(function(a, b) { return b - a; });
    for (let j = 0; j < rowIndicesToDelete.length; j++) {
      sheet.deleteRow(rowIndicesToDelete[j]);
    }

    // Re-sort and re-assign IDs once at the end
    sortAndReassignIds(sheet);

    return { success: true, message: 'Successfully deleted ' + rowIndicesToDelete.length + ' rows' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Find the actual sheet row (1-indexed) by matching content fields.
// hintIndex is the client's 0-based index guess; we check it first for speed.
function findRowByContent(sheet, data, hintIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var allData = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  // Build match key from the incoming data
  var matchDate = getIsoDateString(data['Date'] || '');
  var matchTitle = String(data['Content Title'] || '').trim().toLowerCase();
  var matchPic = String(data['PIC'] || '').trim().toLowerCase();
  var matchCat = String(data['Category'] || '').trim().toLowerCase();
  var matchPlat = String(data['Platform'] || '').trim().toLowerCase();

  // Helper to check if a sheet row matches
  function rowMatches(row) {
    var rowDate = getIsoDateString(row[0]);
    var rowTitle = String(row[2] || '').trim().toLowerCase();
    var rowPic = String(row[3] || '').trim().toLowerCase();
    var rowCat = String(row[4] || '').trim().toLowerCase();
    var rowPlat = String(row[5] || '').trim().toLowerCase();

    return rowDate === matchDate &&
      rowTitle === matchTitle &&
      rowPic === matchPic &&
      rowCat === matchCat &&
      rowPlat === matchPlat;
  }

  // Fast path: check the hint index first
  if (!isNaN(hintIndex) && hintIndex >= 0 && hintIndex < allData.length) {
    if (rowMatches(allData[hintIndex])) {
      return hintIndex + 2; // convert 0-based to 1-based sheet row
    }
  }

  // Slow path fallback: build a lookup Map for O(1) matching of remaining rows
  const rowMap = new Map();
  for (var i = 0; i < allData.length; i++) {
    var row = allData[i];
    var rowDate = getIsoDateString(row[0]);
    var rowTitle = String(row[2] || '').trim().toLowerCase();
    var rowPic = String(row[3] || '').trim().toLowerCase();
    var rowCat = String(row[4] || '').trim().toLowerCase();
    var rowPlat = String(row[5] || '').trim().toLowerCase();
    var key = rowDate + '|' + rowTitle + '|' + rowPic + '|' + rowCat + '|' + rowPlat;
    if (!rowMap.has(key)) {
      rowMap.set(key, i + 2);
    }
  }

  var targetKey = matchDate + '|' + matchTitle + '|' + matchPic + '|' + matchCat + '|' + matchPlat;
  return rowMap.get(targetKey) || -1;
}

function sortAndReassignIds(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return; // header only or empty

  const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
  const values = range.getValues();

  // Sort the values: Date (0), PIC (3), Category (4), Platform (5)
  values.sort(function (a, b) {
    const dateStrA = getIsoDateString(a[0]);
    const dateStrB = getIsoDateString(b[0]);
    if (dateStrA !== dateStrB) {
      return dateStrA.localeCompare(dateStrB);
    }

    const picA = String(a[3] || '').trim().toLowerCase();
    const picB = String(b[3] || '').trim().toLowerCase();
    if (picA !== picB) {
      return picA.localeCompare(picB);
    }

    const catA = String(a[4] || '').trim().toLowerCase();
    const catB = String(b[4] || '').trim().toLowerCase();
    if (catA !== catB) {
      return catA.localeCompare(catB);
    }

    const platA = String(a[5] || '').trim().toLowerCase();
    const platB = String(b[5] || '').trim().toLowerCase();
    if (platA !== platB) {
      return platA.localeCompare(platB);
    }

    const titleA = String(a[2] || '').trim().toLowerCase();
    const titleB = String(b[2] || '').trim().toLowerCase();
    if (titleA !== titleB) {
      return titleA.localeCompare(titleB);
    }

    const urlA = String(a[17] || '').trim().toLowerCase();
    const urlB = String(b[17] || '').trim().toLowerCase();
    return urlA.localeCompare(urlB);
  });

  // Reassign the IDs sequentially (HEADERS[1] is ID), same Date, PIC, Category share the same ID
  let idCounter = 0;
  let lastKey = null;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const dateStr = getIsoDateString(row[0]);
    const pic = String(row[3] || '').trim().toLowerCase();
    const cat = String(row[4] || '').trim().toLowerCase();
    const key = dateStr + "|" + pic + "|" + cat;

    if (key !== lastKey) {
      idCounter++;
      lastKey = key;
    }

    row[1] = "CT" + idCounter;
  }

  // Normalize all dates to mm/dd/yyyy string format before writing back
  for (var j = 0; j < values.length; j++) {
    var dateVal = values[j][0];
    if (dateVal) {
      var iso = getIsoDateString(dateVal);
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        values[j][0] = iso.substring(5, 7) + "/" + iso.substring(8, 10) + "/" + iso.substring(0, 4);
      }
    }
  }

  // Write the sorted values back to the sheet
  range.setValues(values);
}

function getIsoDateString(dateVal) {
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = ("0" + (dateVal.getMonth() + 1)).slice(-2);
    const d = ("0" + dateVal.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }
  const dateStr = String(dateVal || '').trim();
  if (!dateStr) return '';

  // Handle yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Handle mm/dd/yyyy or mm-dd-yyyy
  const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) {
    const month = ("0" + match[1]).slice(-2);
    const day = ("0" + match[2]).slice(-2);
    const year = match[3];
    return year + "-" + month + "-" + day;
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const dy = ("0" + d.getDate()).slice(-2);
  return y + "-" + m + "-" + dy;
}

// --- STORY TELLING SCRIPTS ENDPOINTS ---

function readScripts() {
  try {
    const sheet = getOrCreateSheet(SCRIPTS_SHEET_NAME, SCRIPTS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < SCRIPTS_HEADERS.length; j++) {
        row[SCRIPTS_HEADERS[j]] = data[i][j] || '';
      }
      rows.push(row);
    }

    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveScriptFromJson(data) {
  try {
    const sheet = getOrCreateSheet(SCRIPTS_SHEET_NAME, SCRIPTS_HEADERS);
    // Ensure spreadsheet headers are in the correct order
    const existingHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), SCRIPTS_HEADERS.length)).getValues()[0] : [];
    let headersMatch = existingHeaders.length === SCRIPTS_HEADERS.length;
    if (headersMatch) {
      for (let i = 0; i < SCRIPTS_HEADERS.length; i++) {
        if (existingHeaders[i] !== SCRIPTS_HEADERS[i]) {
          headersMatch = false;
          break;
        }
      }
    }
    if (!headersMatch) {
      sheet.getRange(1, 1, 1, SCRIPTS_HEADERS.length).setValues([SCRIPTS_HEADERS]);
    }

    const title = sanitizeInput(data.Title, 500);
    const status = sanitizeInput(data.Status, 200) || 'Idea';
    const category = sanitizeInput(data.Category, 200) || 'Story Telling';
    const hook = sanitizeInput(data.Hook, 10000);
    const script = sanitizeInput(data.Script, 10000);
    const hashtags = sanitizeInput(data.Hashtags || data.Hastags, 2000);
    const references = sanitizeInput(data.References, 5000);
    const caption = sanitizeInput(data.Caption, 10000);

    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;

    // Search for existing script with the same title (case-insensitive)
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim().toLowerCase() === String(title).trim().toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    const rowValues = [title, status, category, hook, script, hashtags, references, caption];

    if (rowIndex > 0) {
      // Update script
      sheet.getRange(rowIndex, 1, 1, SCRIPTS_HEADERS.length).setValues([rowValues]);
    } else {
      // Append new script
      sheet.appendRow(rowValues);
    }

    return { success: true, message: 'Script saved successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteScript(title) {
  try {
    const sheet = getOrCreateSheet(SCRIPTS_SHEET_NAME, SCRIPTS_HEADERS);
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim().toLowerCase() === String(title).trim().toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > 0) {
      sheet.deleteRow(rowIndex);
      return { success: true, message: 'Script deleted successfully' };
    }

    return { success: false, error: 'Script not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createResponse(data) {
  let output = JSON.stringify(data);

  if (globalCallback) {
    output = globalCallback + '(' + output + ')';
    return ContentService
      .createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// INTEGRATED AUTOMATIC SHEET CALCULATIONS & SYNC
// ============================================

const SCHEDULE_SHEET_NAME = "Schedule";
const SCHEDULE_HEADERS = ['ID', 'Date', 'PIC', 'Content Title', 'Category', 'Status', 'Month'];

const MEMBER_LIST_SHEET_NAME = "MemberList";
const MEMBER_LIST_HEADERS = ['NO', 'NAMA', 'NIM', 'JURUSAN', 'UNIVERSITAS', 'STREAM'];


function readScheduleFromLaporan() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    const values = range.getValues();

    // Group rows by ID
    const grouped = {};
    for (let i = 0; i < values.length; i++) {
      const id = String(values[i][1]).trim();
      if (!id) continue;
      if (!grouped[id]) {
        grouped[id] = [];
      }
      grouped[id].push(values[i]);
    }

    const scheduleData = [];
    const ids = Object.keys(grouped);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const rows = grouped[id];

      // Find the first row that has Date, PIC, Category populated
      let firstPopulated = null;
      for (let j = 0; j < rows.length; j++) {
        if (rows[j][0] && rows[j][3] && rows[j][4]) {
          firstPopulated = rows[j];
          break;
        }
      }
      if (!firstPopulated) {
        firstPopulated = rows[0];
      }

      const dateVal = firstPopulated[0];
      let dateStr = '';
      if (dateVal) {
        const iso = getIsoDateString(dateVal);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
          dateStr = iso.substring(5, 7) + "/" + iso.substring(8, 10) + "/" + iso.substring(0, 4); // mm/dd/yyyy
        } else {
          dateStr = String(dateVal);
        }
      }

      const pic = String(firstPopulated[3]).trim();
      const title = String(firstPopulated[2]).trim();
      const category = String(firstPopulated[4]).trim();

      // Check if task is completed (if any of the rows has a URL filled)
      let isCompleted = false;
      for (let j = 0; j < rows.length; j++) {
        const urlVal = String(rows[j][17]).trim(); // URL is column index 17
        if (urlVal) {
          isCompleted = true;
          break;
        }
      }

      const month = getIndonesianMonth(dateStr);

      scheduleData.push({
        ID: id,
        Date: dateStr,
        PIC: pic,
        'Content Title': title,
        Category: category,
        Status: isCompleted,
        Month: month
      });
    }

    // Sort scheduleData by date chronologically
    scheduleData.sort(function (a, b) {
      const dateStrA = getIsoDateString(a.Date);
      const dateStrB = getIsoDateString(b.Date);
      return dateStrA.localeCompare(dateStrB);
    });

    return scheduleData;
  } catch (error) {
    Logger.log("Error in readScheduleFromLaporan: " + error.toString());
    return [];
  }
}

function readAllData(token) {
  const auth = validateAuth(token, 'any');
  if (!auth.valid) {
    return { success: false, error: auth.error || 'Unauthorized: Access token required' };
  }
  return {
    success: true,
    laporan: readData(),
    schedule: { success: true, data: readScheduleFromLaporan() },
    memberList: readMemberList(),
    scripts: readScripts(),
    meetings: readMeetings()
  };
}


function readMemberList() {
  try {
    const sheet = getOrCreateSheet(MEMBER_LIST_SHEET_NAME, MEMBER_LIST_HEADERS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, data: [] };
    }
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < MEMBER_LIST_HEADERS.length; j++) {
        row[MEMBER_LIST_HEADERS[j]] = data[i][j];
      }
      rows.push(row);
    }
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveScheduleFromJson(data) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for lock to become available
    lock.waitLock(10000);

    const id = data.ID || '';
    const dateStr = data.Date || '';
    const pic = data.PIC || '';
    const title = data.Content_Title || data['Content Title'] || '';
    const category = data.Category || '';

    const formattedDate = dateStr ? getIsoDateString(dateStr) : '';
    let mmDdYyyyDate = '';
    if (formattedDate) {
      mmDdYyyyDate = formattedDate.substring(5, 7) + "/" + formattedDate.substring(8, 10) + "/" + formattedDate.substring(0, 4);
    }

    if (id) {
      // Update: sync the details directly to Laporan sheet
      syncScheduleToLaporan(id, mmDdYyyyDate, title, pic, category);
    } else {
      // Create: append new platform rows to Laporan sheet
      createLaporanRowsForSchedule('', mmDdYyyyDate, title, pic, category);
    }

    // Sort and reassign IDs on Laporan sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sortAndReassignIds(sheet);

    return {
      success: true,
      message: id ? 'Schedule updated successfully' : 'Schedule created successfully',
      ID: id,
      schedule: { success: true, data: readScheduleFromLaporan() },
      laporan: readData()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deleteScheduleFromJson(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const id = data.ID || '';
    if (!id) return { success: false, error: 'ID is required for deletion' };

    deleteLaporanRowsById(id);

    return {
      success: true,
      message: 'Schedule deleted successfully',
      schedule: { success: true, data: readScheduleFromLaporan() },
      laporan: readData()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function findScheduleRowById(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(id).trim()) {
      return i + 2;
    }
  }
  return -1;
}

function sortScheduleSheet(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const range = sheet.getRange(2, 1, lastRow - 1, SCHEDULE_HEADERS.length);
  const values = range.getValues();

  values.sort(function (a, b) {
    const dateStrA = getIsoDateString(a[1]);
    const dateStrB = getIsoDateString(b[1]);
    if (dateStrA !== dateStrB) {
      return dateStrA.localeCompare(dateStrB);
    }
    const picA = String(a[2] || '').trim().toLowerCase();
    const picB = String(b[2] || '').trim().toLowerCase();
    if (picA !== picB) {
      return picA.localeCompare(picB);
    }
    const catA = String(a[4] || '').trim().toLowerCase();
    const catB = String(b[4] || '').trim().toLowerCase();
    return catA.localeCompare(catB);
  });

  for (let i = 0; i < values.length; i++) {
    values[i][0] = '="CT"&(ROW()-1)';
    values[i][6] = getIndonesianMonth(values[i][1]);
    const iso = getIsoDateString(values[i][1]);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      values[i][1] = iso.substring(5, 7) + "/" + iso.substring(8, 10) + "/" + iso.substring(0, 4);
    }
  }

  range.setValues(values);
}

function syncScheduleToLaporan(id, date, title, pic, category) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    const values = range.getValues();
    let madeChanges = false;

    for (var i = 0; i < values.length; i++) {
      var rowId = String(values[i][1]).trim();
      if (rowId === id) {
        values[i][0] = date;
        values[i][2] = title;
        values[i][3] = pic;
        values[i][4] = category;
        madeChanges = true;
      }
    }

    if (madeChanges) {
      range.setValues(values);
      sortAndReassignIds(sheet);
    }
  } catch (err) {
    Logger.log("Error syncing schedule to Laporan: " + err.toString());
  }
}

function deleteLaporanRowsById(id) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    // Read the entire data block (excluding the headers)
    const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    const values = range.getValues();

    // Filter rows in memory (column 1 index is 'ID')
    const filteredValues = values.filter(function(row) {
      return String(row[1]).trim() !== String(id).trim();
    });

    // Only update sheet if changes were made
    if (filteredValues.length < values.length) {
      // Clear all existing content
      range.clearContent();

      // Write the filtered rows back if there are any remaining
      if (filteredValues.length > 0) {
        sheet.getRange(2, 1, filteredValues.length, HEADERS.length).setValues(filteredValues);
      }

      sortAndReassignIds(sheet);
    }
  } catch (err) {
    Logger.log("Error deleting Laporan rows: " + err.toString());
  }
}

function createLaporanRowsForSchedule(id, date, title, pic, category) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return;
    const platforms = ['Instagram', 'TikTok', 'Youtube'];
    const rowsToAdd = [];

    for (var i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const newRowData = {};

      newRowData['Date'] = date;
      newRowData['ID'] = id;
      newRowData['Content Title'] = title;
      newRowData['PIC'] = pic;
      newRowData['Category'] = category;
      newRowData['Platform'] = platform;
      newRowData['Views'] = 0;
      newRowData['Account Reach'] = 0;
      newRowData['Likes'] = 0;
      newRowData['Comments'] = 0;
      newRowData['Follows'] = 0;
      newRowData['Repost'] = 0;
      newRowData['Shares'] = 0;
      newRowData['Total Engagement'] = 0;
      newRowData['Engagement Rate (%)'] = 0;
      newRowData['KPI Score'] = 0;
      newRowData['KPI Summary'] = '0';
      newRowData['URL'] = '';
      newRowData['Comment Text'] = 'Planned from WebApp';

      const newRow = [];
      for (let header of HEADERS) {
        newRow.push(newRowData[header] || '');
      }
      rowsToAdd.push(newRow);
    }

    if (rowsToAdd.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rowsToAdd.length, HEADERS.length).setValues(rowsToAdd);
    }

    sortAndReassignIds(sheet);
  } catch (err) {
    Logger.log("Error creating Laporan rows: " + err.toString());
  }
}

function getIndonesianMonth(dateStr) {
  var iso = getIsoDateString(dateStr);
  if (!iso) return '';
  var monthNum = parseInt(iso.substring(5, 7));
  var months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthNum - 1] || '';
}

function readMeetings() {
  try {
    const sheet = getOrCreateSheet(MEETINGS_SHEET_NAME, MEETINGS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < MEETINGS_HEADERS.length; j++) {
        row[MEETINGS_HEADERS[j]] = data[i][j] || '';
      }
      rows.push(row);
    }

    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveMeetingFromJson(data) {
  try {
    const sheet = getOrCreateSheet(MEETINGS_SHEET_NAME, MEETINGS_HEADERS);
    
    // Safety check: ensure sheet headers are correct and in the right order
    const existingHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), MEETINGS_HEADERS.length)).getValues()[0] : [];
    let headersMatch = existingHeaders.length === MEETINGS_HEADERS.length;
    if (headersMatch) {
      for (let i = 0; i < MEETINGS_HEADERS.length; i++) {
        if (existingHeaders[i] !== MEETINGS_HEADERS[i]) {
          headersMatch = false;
          break;
        }
      }
    }
    if (!headersMatch) {
      sheet.getRange(1, 1, 1, MEETINGS_HEADERS.length).setValues([MEETINGS_HEADERS]);
    }

    const id = sanitizeInput(data.ID || data.id, 100) || ('M' + Date.now());
    const date = sanitizeInput(data.Date || data.date, 50);
    const attendees = sanitizeInput(data.Attendees || data.attendees, 1000);
    const absentees = sanitizeInput(data.Absentees || data.absentees, 1000);
    const recap = sanitizeInput(data.Recap || data.recap, 20000);
    const videoRecap = sanitizeInput(data.VideoRecap || data.videoRecap || data.Video_Recap, 2000);

    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;

    // Search for existing meeting with the same ID
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === String(id).trim()) {
        rowIndex = i + 1;
        break;
      }
    }

    const rowValues = [id, date, attendees, absentees, recap, videoRecap];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, MEETINGS_HEADERS.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    return { success: true, message: 'Meeting saved successfully', id: id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteMeeting(id) {
  try {
    const sheet = getOrCreateSheet(MEETINGS_SHEET_NAME, MEETINGS_HEADERS);
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === String(id).trim()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > 0) {
      sheet.deleteRow(rowIndex);
      return { success: true, message: 'Meeting deleted successfully' };
    } else {
      return { success: false, error: 'Meeting not found' };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}