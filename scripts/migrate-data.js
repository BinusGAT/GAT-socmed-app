const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@libsql/client');

// 1. Load environment variables from .env.local manually
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log('✅ Loaded environment variables from .env.local');
  }
} catch (e) {
  console.warn('⚠️ Could not load .env.local file:', e.message);
}

const sheetsSource = process.env.SHEETS_SOURCE;
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const passcodeSalt = process.env.PASSCODE_SALT || '';

if (!sheetsSource) {
  console.error('❌ Error: SHEETS_SOURCE is not defined in .env.local');
  process.exit(1);
}

if (!url) {
  console.error('❌ Error: TURSO_DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const client = createClient({
  url: url,
  authToken: authToken || '',
});

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function getIsoDateString(dateVal) {
  if (!dateVal) return '';
  const dateStr = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

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

async function main() {
  const rawPasscode = process.argv[2];
  if (!rawPasscode) {
    console.error('❌ Error: Please provide your Admin passcode as an argument.');
    console.error('Usage: node scripts/migrate-data.js "YOUR_ADMIN_PASSCODE"');
    process.exit(1);
  }

  // 2. Compute token
  const token = sha256(rawPasscode + passcodeSalt);
  console.log('Connecting to Google Sheets database...');

  try {
    // 3. Fetch data from Google Apps Script Web App
    const res = await fetch(sheetsSource, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        action: 'read_all',
        token: token
      })
    });

    if (!res.ok) {
      console.error(`❌ HTTP Error fetching sheets data: ${res.status}`);
      process.exit(1);
    }

    const payload = await res.json();
    if (!payload.success) {
      console.error('❌ Google Apps Script failed to retrieve data:', payload.error || 'Invalid passcode or authorization');
      process.exit(1);
    }

    console.log('✅ Successfully fetched data from Google Sheets.');
    
    const sheetLaporan = payload.laporan?.data || [];
    const sheetSchedule = payload.schedule?.data || [];
    const sheetMemberList = payload.memberList?.data || [];
    const sheetScripts = payload.scripts?.data || [];
    const sheetMeetings = payload.meetings?.data || [];

    console.log(`Summary of data fetched:`);
    console.log(`- Laporan Rows: ${sheetLaporan.length}`);
    console.log(`- Schedule Tasks: ${sheetSchedule.length}`);
    console.log(`- Member Entries: ${sheetMemberList.length}`);
    console.log(`- Storyboard Drafts: ${sheetScripts.length}`);
    console.log(`- Meeting Memos: ${sheetMeetings.length}`);

    // 4. Clear Turso cloud database before migrating
    console.log('Wiping existing seeded data in Turso...');
    await client.execute("DELETE FROM member_list");
    await client.execute("DELETE FROM schedule");
    await client.execute("DELETE FROM scripts");
    await client.execute("DELETE FROM meetings");
    await client.execute("DELETE FROM laporan");
    console.log('✅ Turso database tables cleared.');

    // 5. Populate member_list
    if (sheetMemberList.length > 0) {
      console.log('Migrating member_list...');
      const queries = [];
      for (const m of sheetMemberList) {
        const name = m.NAMA || m.nama || '';
        const stream = m.STREAM || m.stream || 'Content Creator';
        if (name) {
          queries.push({
            sql: 'INSERT INTO member_list (NAMA, STREAM) VALUES (?, ?)',
            args: [name, stream]
          });
        }
      }
      if (queries.length > 0) {
        await client.batch(queries);
      }
      console.log('✅ Migrated member_list.');
    }

    // 6. Populate scripts
    if (sheetScripts.length > 0) {
      console.log('Migrating scripts...');
      const queries = [];
      for (const s of sheetScripts) {
        const title = s.Title || s.title || '';
        const status = s.Status || s.status || 'Idea';
        const category = s.Category || s.category || '';
        const hook = s.Hook || s.hook || '';
        const scriptVal = s.Script || s.script || '';
        const hashtags = s.Hastags || s.hastags || s.Hashtags || s.hashtags || '';
        const refs = s.References || s.references || '';
        const caption = s.Caption || s.caption || '';

        if (title) {
          queries.push({
            sql: 'INSERT INTO scripts (Title, Status, Category, Hook, Script, Hastags, "References", Caption) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [title, status, category, hook, scriptVal, hashtags, refs, caption]
          });
        }
      }
      if (queries.length > 0) {
        await client.batch(queries);
      }
      console.log('✅ Migrated scripts.');
    }

    // 7. Populate meetings
    if (sheetMeetings.length > 0) {
      console.log('Migrating meetings...');
      const queries = [];
      for (const m of sheetMeetings) {
        const id = m.ID || m.id || '';
        const date = m.Date || m.date || '';
        const attendees = m.Attendees || m.attendees || '';
        const absentees = m.Absentees || m.absentees || '';
        const recap = m.Recap || m.recap || '';
        const video = m.VideoRecap || m.videoRecap || m.Video_Recap || '';

        if (id) {
          queries.push({
            sql: 'INSERT INTO meetings (ID, Date, Attendees, Absentees, Recap, VideoRecap) VALUES (?, ?, ?, ?, ?, ?)',
            args: [id, date, attendees, absentees, recap, video]
          });
        }
      }
      if (queries.length > 0) {
        await client.batch(queries);
      }
      console.log('✅ Migrated meetings.');
    }

    // 8. Populate laporan
    if (sheetLaporan.length > 0) {
      console.log('Migrating laporan metrics (this might take a few moments)...');
      const queries = [];
      for (const r of sheetLaporan) {
        const date = r.Date || r.date || '';
        const id = r.ID || r.id || '';
        const title = r['Content Title'] || r.content_title || '';
        const pic = r.PIC || r.pic || '';
        const cat = r.Category || r.category || '';
        const plat = r.Platform || r.platform || '';
        
        const views = parseInt(r.Views) || 0;
        const reach = parseInt(r['Account Reach'] || r.account_reach) || 0;
        const likes = parseInt(r.Likes) || 0;
        const comments = parseInt(r.Comments) || 0;
        const follows = parseInt(r.Follows) || 0;
        const repost = parseInt(r.Repost) || 0;
        const shares = parseInt(r.Shares) || 0;
        const totalEng = parseInt(r['Total Engagement'] || r.total_engagement) || 0;
        const rate = parseFloat(r['Engagement Rate (%)'] || r.engagement_rate) || 0.0;
        const kpi = parseInt(r['KPI Score'] || r.kpi_score) || 3;
        const kpiSum = parseInt(r['KPI Summary'] || r.kpi_summary) || 3;
        const urlField = r.URL || r.url || '';
        const commentTxt = r['Comment Text'] || r.comment_text || '';

        if (id && plat) {
          queries.push({
            sql: `INSERT INTO laporan (
              Date, ID, "Content Title", PIC, Category, Platform, 
              Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, 
              "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              date, id, title, pic, cat, plat,
              views, reach, likes, comments, follows, repost, shares,
              totalEng, rate, kpi, kpiSum, urlField, commentTxt
            ]
          });
        }
      }
      if (queries.length > 0) {
        await client.batch(queries);
      }
      console.log('✅ Migrated laporan metrics.');
    }

    // 9. Re-sort, reassign ranks, and rebuild schedule dynamically
    console.log('Re-sorting and establishing database constraints...');
    
    // Sort logic
    const laporanRes = await client.execute("SELECT * FROM laporan");
    let rows = [...laporanRes.rows];

    if (rows.length > 0) {
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

      await client.batch(batchQueries);
    }

    console.log('🎉 Migration completed successfully! Your Turso database is fully synced with Google Sheets.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.close();
  }
}

main();
