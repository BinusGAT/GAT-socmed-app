import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../../../../utils/db';

const PASSCODE_SALT = process.env.PASSCODE_SALT || '';
const PASSCODE_HASH_ADMIN = process.env.PASSCODE_HASH_ADMIN || '';
const PASSCODE_HASH_CREATOR = process.env.PASSCODE_HASH_CREATOR || '';

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function validateAuth(token, requiredLevel) {
  if (!token) return { valid: false, role: null };

  const doubleHash = sha256(String(token).trim() + PASSCODE_SALT);

  if (doubleHash === PASSCODE_HASH_ADMIN) {
    return { valid: true, role: 'Admin' };
  }
  if (requiredLevel === 'any' && doubleHash === PASSCODE_HASH_CREATOR) {
    return { valid: true, role: 'Creator' };
  }
  return { valid: false, role: null };
}

function getIsoDateString(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = ("0" + (dateVal.getMonth() + 1)).slice(-2);
    const d = ("0" + dateVal.getDate()).slice(-2);
    return `${y}-${m}-${d}`;
  }
  const dateStr = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Handle mm/dd/yyyy or mm-dd-yyyy
  const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) {
    const month = ("0" + match[1]).slice(-2);
    const day = ("0" + match[2]).slice(-2);
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const dy = ("0" + d.getDate()).slice(-2);
  return `${y}-${m}-${dy}`;
}

function getIndonesianMonth(dateStr) {
  const iso = getIsoDateString(dateStr);
  if (!iso) return '';
  const monthNum = parseInt(iso.substring(5, 7));
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthNum - 1] || '';
}

// Re-sorts, reassigns IDs, and aggregates KPI Score inside Turso
async function sortAndReassignDb() {
  const laporanRes = await db.execute("SELECT * FROM laporan");
  let rows = [...laporanRes.rows];

  if (rows.length === 0) {
    await db.execute("DELETE FROM schedule");
    return;
  }

  // Sort rows chronologically by Date, PIC, Category, Platform, Title
  rows.sort((a, b) => {
    const dateA = getIsoDateString(a.Date);
    const dateB = getIsoDateString(b.Date);
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const picA = String(a.PIC || '').trim().toLowerCase();
    const picB = String(b.PIC || '').trim().toLowerCase();
    if (picA !== picB) return picA.localeCompare(picB);

    const catA = String(a.Category || '').trim().toLowerCase();
    const catB = String(b.Category || '').trim().toLowerCase();
    if (catA !== catB) return catA.localeCompare(catB);

    const platA = String(a.Platform || '').trim().toLowerCase();
    const platB = String(b.Platform || '').trim().toLowerCase();
    if (platA !== platB) return platA.localeCompare(platB);

    const titleA = String(a["Content Title"] || '').trim().toLowerCase();
    const titleB = String(b["Content Title"] || '').trim().toLowerCase();
    return titleA.localeCompare(titleB);
  });

  let idCounter = 0;
  let lastKey = null;
  const idGroups = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = getIsoDateString(row.Date);
    const pic = String(row.PIC || '').trim().toLowerCase();
    const cat = String(row.Category || '').trim().toLowerCase();
    const key = `${dateStr}|${pic}|${cat}`;

    if (key !== lastKey) {
      idCounter++;
      lastKey = key;
    }

    const newId = "CT" + idCounter;
    row.ID = newId;

    if (!idGroups[newId]) {
      idGroups[newId] = [];
    }
    idGroups[newId].push(row);
  }

  const batchQueries = [];
  batchQueries.push({ sql: "DELETE FROM laporan", args: [] });
  batchQueries.push({ sql: "DELETE FROM schedule", args: [] });

  const scheduleItems = [];

  for (const newId in idGroups) {
    const groupRows = idGroups[newId];
    
    let maxKpi = 3;
    let isCompleted = 0;
    for (const r of groupRows) {
      const kpiVal = parseInt(r["KPI Score"]) || 0;
      if (kpiVal > maxKpi) maxKpi = kpiVal;
      if (String(r.URL || '').trim() !== '') {
        isCompleted = 1;
      }
    }

    const firstRow = groupRows[0];
    const dateStr = firstRow.Date;
    const pic = firstRow.PIC;
    const title = firstRow["Content Title"];
    const category = firstRow.Category;
    const month = getIndonesianMonth(dateStr);

    scheduleItems.push({
      ID: newId,
      Date: dateStr,
      PIC: pic,
      "Content Title": title,
      Category: category,
      Status: isCompleted,
      Month: month
    });

    for (const r of groupRows) {
      r["KPI Summary"] = maxKpi;
      
      // Format Date to mm/dd/yyyy if it's in yyyy-mm-dd
      let dateOutput = r.Date;
      const iso = getIsoDateString(r.Date);
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        dateOutput = iso.substring(5, 7) + "/" + iso.substring(8, 10) + "/" + iso.substring(0, 4);
      }

      batchQueries.push({
        sql: `INSERT INTO laporan (
          Date, ID, "Content Title", PIC, Category, Platform, 
          Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, 
          "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          dateOutput, r.ID, r["Content Title"], r.PIC, r.Category, r.Platform,
          parseInt(r.Views) || 0, parseInt(r["Account Reach"]) || 0, parseInt(r.Likes) || 0,
          parseInt(r.Comments) || 0, parseInt(r.Follows) || 0, parseInt(r.Repost) || 0,
          parseInt(r.Shares) || 0, parseInt(r["Total Engagement"]) || 0,
          parseFloat(r["Engagement Rate (%)"]) || 0.0, parseInt(r["KPI Score"]) || 3,
          parseInt(r["KPI Summary"]) || 3, r.URL || '', r["Comment Text"] || ''
        ]
      });
    }
  }

  for (const s of scheduleItems) {
    batchQueries.push({
      sql: `INSERT INTO schedule (ID, Date, PIC, "Content Title", Category, Status, Month) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [s.ID, s.Date, s.PIC, s["Content Title"], s.Category, s.Status, s.Month]
    });
  }

  await db.batch(batchQueries);
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const action = payload.action;
    const token = payload.token;
    const params = payload.params || {};

    // 1. Handle Validate Mode separately
    if (action === 'validate_mode') {
      const verifyRole = params.role || 'Admin';
      const passcode = params.passcode || '';
      
      let passHash = '';
      if (passcode) {
        passHash = sha256(passcode + PASSCODE_SALT);
      }
      
      const verifyAuth = validateAuth(passHash, verifyRole === 'Admin' ? 'admin' : 'any');
      const roleMatches = verifyAuth.valid && (verifyAuth.role === verifyRole);
      
      return NextResponse.json({ 
        success: true, 
        valid: roleMatches, 
        role: verifyAuth.role,
        token: roleMatches ? passHash : null
      });
    }

    // 2. Validate token for all other actions
    const requiredLevel = ['read_all'].includes(action) ? 'any' : 'admin';
    const auth = validateAuth(token, requiredLevel);
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access token required or invalid' },
        { status: 401 }
      );
    }

    // 3. Dispatch operations
    let result = { success: false };

    switch (action) {
      case 'read_all': {
        const laporanRes = await db.execute("SELECT * FROM laporan");
        const scheduleRes = await db.execute("SELECT * FROM schedule");
        const memberListRes = await db.execute("SELECT * FROM member_list");
        const scriptsRes = await db.execute("SELECT * FROM scripts");
        const meetingsRes = await db.execute("SELECT * FROM meetings");

        result = {
          success: true,
          laporan: { success: true, data: laporanRes.rows },
          schedule: { success: true, data: scheduleRes.rows },
          memberList: { success: true, data: memberListRes.rows },
          scripts: { success: true, data: scriptsRes.rows },
          meetings: { success: true, data: meetingsRes.rows }
        };
        break;
      }

      case 'create': {
        const platforms = ['Instagram', 'TikTok', 'Youtube'];
        const selectedPlatform = String(params.Platform || '').trim().toLowerCase();
        
        const views = parseInt(params.Views) || 0;
        const likes = parseInt(params.Likes) || 0;
        const comments = parseInt(params.Comments) || 0;
        const shares = parseInt(params.Shares) || 0;
        const reposts = parseInt(params.Repost) || 0;
        const follows = parseInt(params.Follows) || 0;
        const totalEngagement = likes + comments + shares + reposts + follows;
        const engagementRate = views > 0 ? (totalEngagement / views) * 100 : 0.0;

        for (const plat of platforms) {
          const isSelected = plat.toLowerCase() === selectedPlatform;
          
          const viewsVal = isSelected ? views : 0;
          const reachVal = isSelected ? (parseInt(params['Account Reach']) || 0) : 0;
          const likesVal = isSelected ? likes : 0;
          const commentsVal = isSelected ? comments : 0;
          const followsVal = isSelected ? follows : 0;
          const repostVal = isSelected ? reposts : 0;
          const sharesVal = isSelected ? shares : 0;
          const totalEngVal = isSelected ? totalEngagement : 0;
          const rateVal = isSelected ? engagementRate : 0.0;
          const kpiVal = isSelected ? (parseInt(params['KPI Score']) || 3) : 3;
          const urlVal = isSelected ? (params.URL || '') : '';
          const commentVal = isSelected ? (params['Comment Text'] || '') : 'Planned from WebApp';

          await db.execute({
            sql: `INSERT INTO laporan (
              Date, ID, "Content Title", PIC, Category, Platform, 
              Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, 
              "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              params.Date, 'TEMP', params['Content Title'], params.PIC, params.Category, plat,
              viewsVal, reachVal, likesVal, commentsVal, followsVal, repostVal, sharesVal,
              totalEngVal, rateVal, kpiVal, 3, urlVal, commentVal
            ]
          });
        }
        await sortAndReassignDb();
        result = { success: true, message: 'All 3 platform rows created successfully' };
        break;
      }

      case 'update': {
        const matchDate = params.original_Date || params.Date;
        const matchTitle = params['original_Content Title'] || params['Content Title'];
        const matchPic = params.original_PIC || params.PIC;
        const matchCategory = params.original_Category || params.Category;
        const matchPlatform = params.original_Platform || params.Platform;

        const views = parseInt(params.Views) || 0;
        const likes = parseInt(params.Likes) || 0;
        const comments = parseInt(params.Comments) || 0;
        const shares = parseInt(params.Shares) || 0;
        const reposts = parseInt(params.Repost) || 0;
        const follows = parseInt(params.Follows) || 0;
        const totalEngagement = likes + comments + shares + reposts + follows;
        const engagementRate = views > 0 ? (totalEngagement / views) * 100 : 0.0;

        await db.execute({
          sql: `UPDATE laporan SET 
            Date = ?,
            "Content Title" = ?,
            PIC = ?,
            Category = ?,
            Platform = ?,
            Views = ?,
            "Account Reach" = ?,
            Likes = ?,
            Comments = ?,
            Follows = ?,
            Repost = ?,
            Shares = ?,
            "Total Engagement" = ?,
            "Engagement Rate (%)" = ?,
            "KPI Score" = ?,
            URL = ?,
            "Comment Text" = ?
          WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ?`,
          args: [
            params.Date, params['Content Title'], params.PIC, params.Category, params.Platform,
            views, parseInt(params['Account Reach']) || 0, likes, comments, follows, reposts, shares,
            totalEngagement, engagementRate, parseInt(params['KPI Score']) || 3, params.URL || '', params['Comment Text'] || '',
            matchDate, matchTitle, matchPic, matchCategory, matchPlatform
          ]
        });

        await sortAndReassignDb();
        result = { success: true, message: 'Data updated successfully' };
        break;
      }

      case 'delete': {
        await db.execute({
          sql: `DELETE FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ?`,
          args: [params.Date, params['Content Title'], params.PIC, params.Category, params.Platform]
        });
        await sortAndReassignDb();
        result = { success: true, message: 'Data deleted successfully' };
        break;
      }

      case 'delete_batch': {
        const deleteQueries = params.rows.map(row => ({
          sql: `DELETE FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ?`,
          args: [row.Date, row['Content Title'], row.PIC, row.Category, row.Platform]
        }));
        await db.batch(deleteQueries);
        await sortAndReassignDb();
        result = { success: true, message: `Successfully deleted ${params.rows.length} rows` };
        break;
      }

      case 'save_schedule': {
        const id = params.ID || params.id || '';
        const dateStr = params.Date || '';
        const pic = params.PIC || '';
        const title = params.Content_Title || params['Content Title'] || '';
        const category = params.Category || '';

        if (id) {
          await db.execute({
            sql: `UPDATE laporan SET Date = ?, "Content Title" = ?, PIC = ?, Category = ? WHERE ID = ?`,
            args: [dateStr, title, pic, category, id]
          });
        } else {
          const platforms = ['Instagram', 'TikTok', 'Youtube'];
          for (const plat of platforms) {
            await db.execute({
              sql: `INSERT INTO laporan (
                Date, ID, "Content Title", PIC, Category, Platform, 
                Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, 
                "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text"
              ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0.0, 3, 3, '', 'Planned from WebApp')`,
              args: [dateStr, 'TEMP', title, pic, category, plat]
            });
          }
        }
        await sortAndReassignDb();
        result = { success: true, message: id ? 'Schedule updated successfully' : 'Schedule created successfully' };
        break;
      }

      case 'delete_schedule': {
        const id = params.ID || params.id || '';
        await db.execute({
          sql: "DELETE FROM laporan WHERE ID = ?",
          args: [id]
        });
        await sortAndReassignDb();
        result = { success: true, message: 'Schedule deleted successfully' };
        break;
      }

      case 'save_script': {
        const title = params.Title || params.title || '';
        const status = params.Status || params.status || 'Idea';
        const category = params.Category || params.category || 'Story Telling';
        const hook = params.Hook || params.hook || '';
        const scriptText = params.Script || params.script || '';
        const hashtags = params.Hashtags || params.hashtags || params.Hastags || params.hastags || '';
        const references = params.References || params.references || '';
        const caption = params.Caption || params.caption || '';

        await db.execute({
          sql: `INSERT OR REPLACE INTO scripts (Title, Status, Category, Hook, Script, Hastags, "References", Caption)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [title, status, category, hook, scriptText, hashtags, references, caption]
        });
        result = { success: true, message: 'Script saved successfully' };
        break;
      }

      case 'delete_script': {
        const title = params.title || params.Title || '';
        await db.execute({
          sql: "DELETE FROM scripts WHERE LOWER(Title) = LOWER(?)",
          args: [title]
        });
        result = { success: true, message: 'Script deleted successfully' };
        break;
      }

      case 'save_meeting': {
        const id = params.ID || params.id || ('M' + Date.now());
        const date = params.Date || params.date || '';
        const attendees = params.Attendees || params.attendees || '';
        const absentees = params.Absentees || params.absentees || '';
        const recap = params.Recap || params.recap || '';
        const videoRecap = params.VideoRecap || params.videoRecap || '';

        await db.execute({
          sql: `INSERT OR REPLACE INTO meetings (ID, Date, Attendees, Absentees, Recap, VideoRecap)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [id, date, attendees, absentees, recap, videoRecap]
        });
        result = { success: true, message: 'Meeting saved successfully', id: id };
        break;
      }

      case 'delete_meeting': {
        const id = params.id || params.ID || '';
        await db.execute({
          sql: "DELETE FROM meetings WHERE ID = ?",
          args: [id]
        });
        result = { success: true, message: 'Meeting deleted successfully' };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in API sheets proxy route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
