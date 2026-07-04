import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbExecute, dbBatch } from '../../../../utils/db';

const db = {
  execute: dbExecute,
  batch: dbBatch
};

const PASSCODE_SALT = process.env.PASSCODE_SALT || '';
const PASSCODE_HASH_ADMIN = process.env.PASSCODE_HASH_ADMIN || '';
const PASSCODE_HASH_CREATOR = process.env.PASSCODE_HASH_CREATOR || '';

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function safeCompare(a, b) {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function validateAuth(token, requiredLevel) {
  if (!token) return { valid: false, role: null };

  const doubleHash = sha256(String(token).trim() + PASSCODE_SALT);

  const isAdmin = safeCompare(doubleHash, PASSCODE_HASH_ADMIN);
  const isCreator = safeCompare(doubleHash, PASSCODE_HASH_CREATOR);

  if (isAdmin) {
    return { valid: true, role: 'Admin' };
  }
  if (requiredLevel === 'any' && isCreator) {
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
async function getNextId() {
  const res = await db.execute("SELECT MAX(CAST(SUBSTR(ID, 3) AS INTEGER)) AS maxNum FROM schedule WHERE ID LIKE 'CT%'");
  const maxVal = res.rows[0]?.maxNum;
  const maxNum = (maxVal !== null && maxVal !== undefined) ? parseInt(maxVal, 10) : 0;
  return 'CT' + (maxNum + 1);
}

async function syncGroupsByIds(ids) {
  if (!ids || ids.length === 0) return;

  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  const idsPlaceholder = uniqueIds.map(() => '?').join(', ');
  const rowsRes = await db.execute({
    sql: `SELECT * FROM laporan WHERE ID IN (${idsPlaceholder})`,
    args: uniqueIds
  });
  const allRows = rowsRes.rows;

  const rowsById = {};
  for (const id of uniqueIds) {
    rowsById[id] = [];
  }
  for (const r of allRows) {
    if (rowsById[r.ID]) {
      rowsById[r.ID].push(r);
    }
  }

  const batchQueries = [];

  for (const id of uniqueIds) {
    const groupRows = rowsById[id] || [];

    if (groupRows.length === 0) {
      batchQueries.push({
        sql: "DELETE FROM schedule WHERE ID = ?",
        args: [id]
      });
      continue;
    }

    let maxKpi = 3;
    let isCompleted = 0;
    for (const r of groupRows) {
      const kpiVal = parseInt(r["KPI Score"]) || 0;
      if (kpiVal > maxKpi) maxKpi = kpiVal;
      if (String(r.URL || '').trim() !== '') {
        isCompleted = 1;
      }
    }

    batchQueries.push({
      sql: 'UPDATE laporan SET "KPI Summary" = ? WHERE ID = ?',
      args: [maxKpi, id]
    });

    const firstRow = groupRows[0];
    const dateStr = firstRow.Date;
    const pic = firstRow.PIC;
    const title = firstRow["Content Title"];
    const category = firstRow.Category;
    const month = getIndonesianMonth(dateStr);

    batchQueries.push({
      sql: `INSERT OR REPLACE INTO schedule (ID, Date, PIC, "Content Title", Category, Status, Month)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, dateStr, pic, title, category, isCompleted, month]
    });
  }

  if (batchQueries.length > 0) {
    await db.batch(batchQueries);
  }
}

async function syncGroupById(id) {
  await syncGroupsByIds([id]);
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

        const newId = await getNextId();
        const insertQueries = [];

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

          insertQueries.push({
            sql: `INSERT INTO laporan (
              Date, ID, "Content Title", PIC, Category, Platform, 
              Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, 
              "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              params.Date, newId, params['Content Title'], params.PIC, params.Category, plat,
              viewsVal, reachVal, likesVal, commentsVal, followsVal, repostVal, sharesVal,
              totalEngVal, rateVal, kpiVal, 3, urlVal, commentVal
            ]
          });
        }
        await db.batch(insertQueries);
        await syncGroupById(newId);
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

        // Find the ID of the row being updated
        const idRes = await db.execute({
          sql: `SELECT ID FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ? LIMIT 1`,
          args: [matchDate, matchTitle, matchPic, matchCategory, matchPlatform]
        });
        const id = idRes.rows[0]?.ID;

        if (id) {
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

          // Update main details for all other rows sharing this ID
          await db.execute({
            sql: `UPDATE laporan SET Date = ?, "Content Title" = ?, PIC = ?, Category = ? WHERE ID = ?`,
            args: [params.Date, params['Content Title'], params.PIC, params.Category, id]
          });

          await syncGroupById(id);
        }
        result = { success: true, message: 'Data updated successfully' };
        break;
      }

      case 'delete': {
        // Find the ID first
        const idRes = await db.execute({
          sql: `SELECT ID FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ? LIMIT 1`,
          args: [params.Date, params['Content Title'], params.PIC, params.Category, params.Platform]
        });
        const id = idRes.rows[0]?.ID;

        await db.execute({
          sql: `DELETE FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ?`,
          args: [params.Date, params['Content Title'], params.PIC, params.Category, params.Platform]
        });

        if (id) {
          await syncGroupById(id);
        }
        result = { success: true, message: 'Data deleted successfully' };
        break;
      }

      case 'delete_batch': {
        const affectedIds = new Set();
        
        // Find all IDs affected in a single batch select request
        const selectQueries = params.rows.map(row => ({
          sql: `SELECT ID FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ? LIMIT 1`,
          args: [row.Date, row['Content Title'], row.PIC, row.Category, row.Platform]
        }));
        const selectResults = await db.batch(selectQueries);
        for (const res of selectResults) {
          if (res.rows[0]?.ID) {
            affectedIds.add(res.rows[0].ID);
          }
        }

        const deleteQueries = params.rows.map(row => ({
          sql: `DELETE FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ?`,
          args: [row.Date, row['Content Title'], row.PIC, row.Category, row.Platform]
        }));
        await db.batch(deleteQueries);

        // Sync all affected groups in a single batch database operation
        if (affectedIds.size > 0) {
          await syncGroupsByIds(Array.from(affectedIds));
        }
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
          await syncGroupById(id);
        } else {
          const newId = await getNextId();
          const platforms = ['Instagram', 'TikTok', 'Youtube'];
          for (const plat of platforms) {
            await db.execute({
              sql: `INSERT INTO laporan (
                Date, ID, "Content Title", PIC, Category, Platform, 
                Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, 
                "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text"
              ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0.0, 3, 3, '', 'Planned from WebApp')`,
              args: [dateStr, newId, title, pic, category, plat]
            });
          }
          await syncGroupById(newId);
        }
        result = { success: true, message: id ? 'Schedule updated successfully' : 'Schedule created successfully' };
        break;
      }

      case 'delete_schedule': {
        const id = params.ID || params.id || '';
        await db.execute({
          sql: "DELETE FROM laporan WHERE ID = ?",
          args: [id]
        });
        await db.execute({
          sql: "DELETE FROM schedule WHERE ID = ?",
          args: [id]
        });
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
