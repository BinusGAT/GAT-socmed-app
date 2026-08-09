import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionDurationMs } from '../../../../utils/sessionPolicy';
import { dbExecute, dbBatch, gatAppExecute } from '../../../../utils/db';
import { getAllowedRoles, getExpectedRequestOrigin, getVisibleAuditRows, isTrustedRequestOrigin } from './authorization';
import { getIndonesianMonth, getIsoDateString, parseMetricToNumber } from './domain';
import { validateAuth, writeAudit } from './sessions';
import {
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from './session-cookie';
import {
  clearAccountLoginFailures,
  getClientIp,
  getLoginRateLimit,
  getLoginRateLimitKeys,
  hashSessionToken,
  publicErrorResponse,
  recordLoginFailure,
} from './security';

const db = {
  execute: dbExecute,
  batch: dbBatch
};

const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
let isDbInitialized = false;



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
  for (const r of allRows) {
    if (r.ID) {
      if (!rowsById[r.ID]) {
        rowsById[r.ID] = [];
      }
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
    const assignedUserId = firstRow.AssignedUserId || '';
    const month = getIndonesianMonth(dateStr);

    batchQueries.push({
      sql: `INSERT OR REPLACE INTO schedule (ID, Date, PIC, "Content Title", Category, Status, Month, AssignedUserId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, dateStr, pic, title, category, isCompleted, month, assignedUserId]
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
  const startTime = Date.now();
  console.log(`\n--- [API request start] ---`);
  try {
    const expectedOrigin = getExpectedRequestOrigin(request.nextUrl.origin);
    if (!isTrustedRequestOrigin(request.headers.get('origin'), expectedOrigin)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: cross-origin request rejected' },
        { status: 403 },
      );
    }

    // Ensure all required tables exist in the database dynamically (only once per server lifecycle)
    if (!isDbInitialized) {
      console.log(`[API] Initializing tables for first request...`);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          expiresAt INTEGER NOT NULL,
          sessionId TEXT,
          userId TEXT,
          userName TEXT,
          userEmail TEXT,
          createdAt INTEGER,
          lastSeenAt INTEGER,
          userAgent TEXT
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          key TEXT PRIMARY KEY,
          attempts INTEGER NOT NULL,
          windowStartedAt INTEGER NOT NULL,
          lockUntil INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);

      for (const column of [
        'sessionId TEXT', 'userId TEXT', 'userName TEXT', 'userEmail TEXT',
        'createdAt INTEGER', 'lastSeenAt INTEGER', 'userAgent TEXT'
      ]) {
        try { await db.execute(`ALTER TABLE sessions ADD COLUMN ${column}`); } catch (e) {}
      }

      await db.execute(`
        CREATE TABLE IF NOT EXISTS member_list (
          NAMA TEXT PRIMARY KEY,
          STREAM TEXT NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS schedule (
          ID TEXT PRIMARY KEY,
          Date TEXT NOT NULL,
          PIC TEXT NOT NULL,
          "Content Title" TEXT NOT NULL,
          Category TEXT NOT NULL,
          Status INTEGER NOT NULL,
          Month TEXT NOT NULL,
          AssignedUserId TEXT
        )
      `);
      try { await db.execute('ALTER TABLE schedule ADD COLUMN AssignedUserId TEXT'); } catch (e) {}

      await db.execute(`
        CREATE TABLE IF NOT EXISTS scripts (
          Title TEXT PRIMARY KEY,
          Status TEXT NOT NULL,
          Category TEXT NOT NULL,
          Hook TEXT,
          Script TEXT,
          Hastags TEXT,
          "References" TEXT,
          Caption TEXT,
          Origin TEXT DEFAULT 'legacy'
        )
      `);
      try { await db.execute("ALTER TABLE scripts ADD COLUMN Origin TEXT DEFAULT 'legacy'"); } catch (e) {}
      await db.execute(`
        UPDATE scripts
        SET Status = 'Scripting', Origin = 'auto'
        WHERE Status = 'Idea'
          AND (Origin IS NULL OR Origin = 'legacy')
          AND EXISTS (
            SELECT 1 FROM schedule
            WHERE LOWER(schedule."Content Title") = LOWER(scripts.Title)
          )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS meetings (
          ID TEXT PRIMARY KEY,
          Date TEXT NOT NULL,
          Attendees TEXT,
          Absentees TEXT,
          Recap TEXT,
          VideoRecap TEXT
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS laporan (
          Date TEXT NOT NULL,
          ID TEXT NOT NULL,
          "Content Title" TEXT NOT NULL,
          PIC TEXT NOT NULL,
          Category TEXT NOT NULL,
          Platform TEXT NOT NULL,
          Views INTEGER DEFAULT 0,
          "Account Reach" INTEGER DEFAULT 0,
          Likes INTEGER DEFAULT 0,
          Comments INTEGER DEFAULT 0,
          Follows INTEGER DEFAULT 0,
          Repost INTEGER DEFAULT 0,
          Shares INTEGER DEFAULT 0,
          "Total Engagement" INTEGER DEFAULT 0,
          "Engagement Rate (%)" REAL DEFAULT 0.0,
          "KPI Score" INTEGER DEFAULT 0,
          "KPI Summary" INTEGER DEFAULT 0,
          URL TEXT,
          "Comment Text" TEXT
        )
      `);
      try { await db.execute('ALTER TABLE laporan ADD COLUMN AssignedUserId TEXT'); } catch (e) {}

      await db.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          message TEXT NOT NULL,
          targetRole TEXT NOT NULL,
          isUrgent INTEGER DEFAULT 0,
          createdAt INTEGER NOT NULL,
          createdBy TEXT NOT NULL,
          targetUserId TEXT,
          type TEXT,
          taskId TEXT
        )
      `);

      try {
        await db.execute("ALTER TABLE notifications ADD COLUMN isUrgent INTEGER DEFAULT 0");
      } catch (e) {}
      for (const column of ['targetUserId TEXT', 'type TEXT', 'taskId TEXT']) {
        try { await db.execute(`ALTER TABLE notifications ADD COLUMN ${column}`); } catch (e) {}
      }

      await db.execute(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id TEXT PRIMARY KEY,
          userId TEXT,
          userName TEXT NOT NULL,
          role TEXT,
          action TEXT NOT NULL,
          entityType TEXT NOT NULL,
          entityId TEXT,
          details TEXT,
          createdAt INTEGER NOT NULL
        )
      `);
      await db.execute({
        sql: 'DELETE FROM audit_log WHERE createdAt < ?',
        args: [Date.now() - AUDIT_RETENTION_MS]
      });

      await db.execute(`
        CREATE TABLE IF NOT EXISTS lecturer_attendee_visibility (
          userId TEXT PRIMARY KEY,
          visible INTEGER NOT NULL DEFAULT 1,
          updatedAt INTEGER NOT NULL
        )
      `);

      // Google Analytics Summary Table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS google_analytics_summary (
          id TEXT PRIMARY KEY,
          visitors TEXT,
          pageviews TEXT,
          new_visits TEXT,
          avg_time_on_site TEXT,
          engagement_rate TEXT
        )
      `);

      // Google Analytics Items Table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS google_analytics_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          label TEXT NOT NULL,
          metric TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0
        )
      `);

      // App settings table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Platforms table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS platforms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          logo_url TEXT,
          color_class TEXT
        )
      `);

      // Categories table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS categories (
          name TEXT PRIMARY KEY,
          color_class TEXT
        )
      `);

      // Seed Google Analytics data matching user's screenshots
      try {
        const summaryCount = await db.execute("SELECT COUNT(*) as count FROM google_analytics_summary");
        const itemsCount = await db.execute("SELECT COUNT(*) as count FROM google_analytics_items");
        
        let shouldSeedSummary = false;
        if (summaryCount.rows[0].count === 0) {
          shouldSeedSummary = true;
        } else {
          const currentSummary = await db.execute("SELECT visitors FROM google_analytics_summary WHERE id = 'current'");
          if (currentSummary.rows[0]?.visitors === '0' || currentSummary.rows[0]?.visitors === '') {
            shouldSeedSummary = true;
          }
        }

        // Seed summary if empty or zeroed
        if (shouldSeedSummary) {
          await db.execute(`
            INSERT OR REPLACE INTO google_analytics_summary (id, visitors, pageviews, new_visits, avg_time_on_site, engagement_rate)
            VALUES ('current', '± 6K', '201', '± 6K', '00:01:24', '48%')
          `);
        }

        // Seed items if empty
        if (itemsCount.rows[0].count <= 1) {
          // Clear any current single item to avoid duplicates
          await db.execute("DELETE FROM google_analytics_items");

          const defaultItems = [
            // Pages
            { category: 'pages', label: '/game/2026/05/18/meccha-chameleon', metric: '± 2K views' },
            { category: 'pages', label: '/game/event/8682/gacci-2026', metric: '± 1K views' },
            { category: 'pages', label: '/game', metric: '546 views' },
            { category: 'pages', label: '/game/2026/03/30/gini-cara-ai-game-assistant-bantu-lo-jago-main-tanpa-harus-nonton-guide', metric: '132 views' },
            { category: 'pages', label: '/game/2026/04/06/game-horror-underwater-theres-nothing-down-there-bawa-teror-dari-kedalaman-laut', metric: '79 views' },
            { category: 'pages', label: '/game/category/article', metric: '79 views' },
            { category: 'pages', label: '/game/2026/02/26/refind-self-the-personality-test-game', metric: '71 views' },
            { category: 'pages', label: '/game/not-found', metric: '63 views' },
            { category: 'pages', label: '/game/2026/03/14/sword-art-online-echoes-of-aincrad', metric: '53 views' },
            
            // Referrers
            { category: 'referrers', label: 'google / organic', metric: '± 3K' },
            { category: 'referrers', label: '(direct) / (none)', metric: '± 1K' },
            { category: 'referrers', label: 'bit.ly / referral', metric: '± 1K' },
            { category: 'referrers', label: 'ig / social', metric: '417' },
            { category: 'referrers', label: 'l.instagram.com / referral', metric: '262' },
            { category: 'referrers', label: 'tiktok.com / referral', metric: '125' },
            { category: 'referrers', label: 'bing / organic', metric: '45' },
            { category: 'referrers', label: 'id.search.yahoo.com / referral', metric: '15' },
            { category: 'referrers', label: 'chatgpt.com / ai-assistant', metric: '14' },

            // Keywords
            { category: 'keywords', label: 'meccha chameleon game review', metric: '1.2K clicks' },
            { category: 'keywords', label: 'gacci 2026 event', metric: '850 clicks' },
            { category: 'keywords', label: 'indie games 2026', metric: '520 clicks' },
            { category: 'keywords', label: 'best horror games underwater', metric: '310 clicks' },
            { category: 'keywords', label: 'sword art online echoes of aincrad', metric: '150 clicks' },

            // Trending
            { category: 'trending', label: 'AI Game Assistant Guides', metric: '+140% spike' },
            { category: 'trending', label: 'Underwater Horror Games', metric: '+85% spike' },
            { category: 'trending', label: 'Refind Self Personality Test', metric: '+60% spike' },
            { category: 'trending', label: 'Mecha Chameleon release date', metric: '+40% spike' }
          ];

          const batchQueries = defaultItems.map(item => {
            const calculatedOrder = parseMetricToNumber(item.metric);
            return {
              sql: `INSERT INTO google_analytics_items (category, label, metric, sort_order) VALUES (?, ?, ?, ?)`,
              args: [item.category, item.label, item.metric, calculatedOrder]
            };
          });
          await db.batch(batchQueries);
        }
      } catch (e) {
        console.error("Failed to seed Google Analytics data:", e);
      }

      // Seed App Settings if empty
      try {
        const settingsCount = await db.execute("SELECT COUNT(*) as count FROM app_settings");
        if (settingsCount.rows[0].count === 0) {
          await db.batch([
            { sql: "INSERT INTO app_settings (key, value) VALUES (?, ?)", args: ["app_name", "contentmanager"] },
            { sql: "INSERT INTO app_settings (key, value) VALUES (?, ?)", args: ["app_subtitle", "Socmed Apps"] },
            { sql: "INSERT INTO app_settings (key, value) VALUES (?, ?)", args: ["app_full_name", "Socmed Apps"] },
            { sql: "INSERT INTO app_settings (key, value) VALUES (?, ?)", args: ["company_name", "Internal Content Team"] },
            { sql: "INSERT INTO app_settings (key, value) VALUES (?, ?)", args: ["app_version", "v0.2.0-alpha"] }
          ]);
        }
      } catch (e) {
        console.error("Failed to seed App Settings:", e);
      }

      // Seed Platforms if empty
      try {
        const platformsCount = await db.execute("SELECT COUNT(*) as count FROM platforms");
        if (platformsCount.rows[0].count === 0) {
          await db.batch([
            {
              sql: "INSERT INTO platforms (id, name, logo_url, color_class) VALUES (?, ?, ?, ?)",
              args: ["instagram", "Instagram", "/img/icons/instagram-logo.png", "badge-platform-instagram"]
            },
            {
              sql: "INSERT INTO platforms (id, name, logo_url, color_class) VALUES (?, ?, ?, ?)",
              args: ["tiktok", "TikTok", "/img/icons/tiktok-logo.png", "badge-platform-tiktok"]
            },
            {
              sql: "INSERT INTO platforms (id, name, logo_url, color_class) VALUES (?, ?, ?, ?)",
              args: ["youtube", "YouTube", "/img/icons/youtube-logo.webp", "badge-platform-youtube"]
            }
          ]);
        }
      } catch (e) {
        console.error("Failed to seed Platforms:", e);
      }

      // Seed Categories if empty
      try {
        const categoriesCount = await db.execute("SELECT COUNT(*) as count FROM categories");
        if (categoriesCount.rows[0].count === 0) {
          await db.batch([
            {
              sql: "INSERT INTO categories (name, color_class) VALUES (?, ?)",
              args: ["Article Reels", "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"]
            },
            {
              sql: "INSERT INTO categories (name, color_class) VALUES (?, ?)",
              args: ["Story Telling", "bg-sky-500/10 text-sky-400 border border-sky-500/20"]
            },
            {
              sql: "INSERT INTO categories (name, color_class) VALUES (?, ?)",
              args: ["News", "bg-purple-500/10 text-purple-400 border border-purple-500/20"]
            },
            {
              sql: "INSERT INTO categories (name, color_class) VALUES (?, ?)",
              args: ["Talking Head", "bg-pink-500/10 text-pink-400 border border-pink-500/20"]
            },
            {
              sql: "INSERT INTO categories (name, color_class) VALUES (?, ?)",
              args: ["Clipper", "bg-amber-500/10 text-amber-400 border border-amber-500/20"]
            },
            {
              sql: "INSERT INTO categories (name, color_class) VALUES (?, ?)",
              args: ["Motion", "bg-rose-500/10 text-rose-400 border border-rose-500/20"]
            }
          ]);
        }
      } catch (e) {
        console.error("Failed to seed Categories:", e);
      }
      
      isDbInitialized = true;
      console.log(`[API] DB initialization completed in ${Date.now() - startTime}ms`);
    } else {
      console.log(`[API] DB already initialized, skipped in ${Date.now() - startTime}ms`);
    }

    const payload = await request.json();
    const action = payload.action;
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value || '';
    const params = payload.params || {};

    console.log(`[API] Action payload parsed. Action = "${action}" in ${Date.now() - startTime}ms`);

    // 1. Handle Validate Mode separately
    if (action === 'validate_mode') {
      const now = Date.now();
      const email = (params.email || '').trim().toLowerCase();
      const nim = (params.nim || '').trim();
      if (!email || !nim || email.length > 254 || nim.length > 128) {
        return NextResponse.json({ success: false, error: 'Invalid credentials.' }, { status: 401 });
      }

      const rateLimitKeys = getLoginRateLimitKeys(email, getClientIp(request.headers));
      const currentLimit = await getLoginRateLimit(db, rateLimitKeys, now);
      if (currentLimit.locked) {
        return NextResponse.json(
          { success: false, error: 'Too many login attempts. Try again later.' },
          { status: 429, headers: { 'Retry-After': String(currentLimit.retryAfterSeconds) } },
        );
      }

      // If email and nim are provided, authenticate against GAT App DB
      if (email && nim) {
        let userRes;
        try {
          userRes = await gatAppExecute({
            sql: `
              SELECT 
                u.id, 
                u.email, 
                u.nim, 
                u.name, 
                GROUP_CONCAT(r.name) AS role_names
              FROM users u
              LEFT JOIN user_roles ur ON ur.user_id = u.id
              LEFT JOIN roles r ON r.id = ur.role_id
              WHERE LOWER(u.email) = ? AND u.nim = ?
              GROUP BY u.id, u.email, u.nim, u.name
            `,
            args: [email, nim]
          });
        } catch (err) {
          console.error("GAT App DB Query Error:", err);
          return NextResponse.json(
            { success: false, error: 'Failed to verify credentials with GAT App DB.' },
            { status: 500 }
          );
        }

        if (!userRes || userRes.rows.length === 0) {
          const limit = await recordLoginFailure(db, rateLimitKeys, now);
          return NextResponse.json(
            { success: false, error: 'Invalid credentials.' },
            { status: limit.locked ? 429 : 401 },
          );
        }

        const userRow = userRes.rows[0];
        const rolePriority = { admin: 0, intern: 1 };
        const roleNames = [...new Set(
          String(userRow.role_names || '')
            .split(',')
            .map((role) => role.trim().toLowerCase())
            .filter(Boolean)
        )].sort((a, b) => (rolePriority[a] ?? 2) - (rolePriority[b] ?? 2));
        const hasAdminRole = roleNames.includes('admin');
        const hasInternRole = roleNames.includes('intern');

        if (!hasAdminRole && !hasInternRole) {
          await recordLoginFailure(db, rateLimitKeys, now);
          return NextResponse.json({ success: false, error: 'Invalid credentials.' }, { status: 401 });
        }

        // Admin has precedence when a user has both admin and intern roles.
        const primaryRoleName = hasAdminRole ? 'admin' : 'intern';
        const matchedRole = hasAdminRole ? 'Admin' : 'Creator';
        const sessionDurationMs = getSessionDurationMs(primaryRoleName);
        const expiresAt = Date.now() + sessionDurationMs;
        await clearAccountLoginFailures(db, rateLimitKeys[0].key);

        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionId = crypto.randomUUID();
        const userAgent = request.headers.get('user-agent') || 'Unknown device';
        await db.execute({
          sql: "DELETE FROM sessions WHERE expiresAt < ?",
          args: [Date.now()]
        });
        await db.execute({
          sql: `INSERT OR REPLACE INTO sessions
                (token, role, expiresAt, sessionId, userId, userName, userEmail, createdAt, lastSeenAt, userAgent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [hashSessionToken(sessionToken), matchedRole, expiresAt, sessionId, String(userRow.id), String(userRow.name), String(userRow.email), now, now, userAgent]
        });

        const response = NextResponse.json({
          success: true, 
          valid: true, 
          role: matchedRole,
          user: {
            id: String(userRow.id),
            name: String(userRow.name),
            email: String(userRow.email),
            role_name: primaryRoleName,
            roles: roleNames
          },
          expiresAt,
          sessionDurationMs
        });
        response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions(expiresAt));
        return response;
      }

    }

    // 2. Validate token for all other actions
    const allowedRoles = getAllowedRoles(action);

    const auth = await validateAuth(db, token, allowedRoles);
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
        await db.execute({
          sql: 'DELETE FROM audit_log WHERE createdAt < ?',
          args: [Date.now() - AUDIT_RETENTION_MS]
        });
        const [laporanRes, scheduleRes, scriptsRes, meetingsRes, notificationsRes, gaSummaryRes, gaItemsRes, appSettingsRes, platformsRes, categoriesRes, internUsersRes, lecturerUsersRes, lecturerVisibilityRes, auditRes] = await Promise.all([
          db.execute("SELECT * FROM laporan"),
          db.execute("SELECT * FROM schedule"),
          db.execute("SELECT * FROM scripts"),
          db.execute("SELECT * FROM meetings"),
          db.execute("SELECT * FROM notifications ORDER BY createdAt DESC"),
          db.execute("SELECT * FROM google_analytics_summary"),
          db.execute("SELECT * FROM google_analytics_items ORDER BY sort_order DESC, id ASC"),
          db.execute("SELECT * FROM app_settings"),
          db.execute("SELECT * FROM platforms"),
          db.execute("SELECT * FROM categories"),
          gatAppExecute({
            sql: `
              SELECT DISTINCT u.id, u.name, r.name AS role
              FROM users u
              JOIN user_roles ur ON ur.user_id = u.id
              JOIN roles r ON r.id = ur.role_id
              WHERE LOWER(TRIM(r.name)) = 'intern'
              ORDER BY LOWER(u.name), u.id
            `,
            args: []
          }),
          gatAppExecute({
            sql: `
              SELECT DISTINCT u.id, u.name, r.name AS role
              FROM users u
              JOIN user_roles ur ON ur.user_id = u.id
              JOIN roles r ON r.id = ur.role_id
              WHERE LOWER(TRIM(r.name)) = 'lecturer'
              ORDER BY LOWER(u.name), u.id
            `,
            args: []
          }),
          db.execute('SELECT userId, visible FROM lecturer_attendee_visibility'),
          db.execute("SELECT * FROM audit_log WHERE entityType <> 'session' ORDER BY createdAt DESC LIMIT 200")
        ]);

        const lecturerVisibility = new Map(
          lecturerVisibilityRes.rows.map((setting) => [String(setting.userId), Number(setting.visible) === 1])
        );

        const internUsers = internUsersRes.rows.map((intern) => ({
          id: String(intern.id),
          name: String(intern.name),
          role: String(intern.role || 'intern')
        }));
        const assignmentBackfill = [];
        for (const task of scheduleRes.rows) {
          if (task.AssignedUserId || !task.PIC) continue;
          const pic = String(task.PIC).trim().toLowerCase();
          const picFirstName = pic.split(/\s+/)[0];
          const matches = internUsers.filter((intern) => {
            const fullName = intern.name.trim().toLowerCase();
            return fullName === pic || fullName.split(/\s+/)[0] === picFirstName;
          });
          if (matches.length !== 1) continue;
          const matchedUserId = matches[0].id;
          task.AssignedUserId = matchedUserId;
          for (const row of laporanRes.rows) {
            if (row.ID === task.ID) row.AssignedUserId = matchedUserId;
          }
          assignmentBackfill.push(
            { sql: 'UPDATE schedule SET AssignedUserId = ? WHERE ID = ?', args: [matchedUserId, task.ID] },
            { sql: 'UPDATE laporan SET AssignedUserId = ? WHERE ID = ?', args: [matchedUserId, task.ID] }
          );
        }
        if (assignmentBackfill.length > 0) await db.batch(assignmentBackfill);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineNotifications = scheduleRes.rows
          .filter((task) => String(task.AssignedUserId || '') === String(auth.userId || '') && Number(task.Status) !== 1)
          .map((task) => {
            const due = new Date(`${task.Date}T00:00:00`);
            const days = Math.round((due.getTime() - today.getTime()) / 86400000);
            if (!Number.isFinite(days) || days > 3) return null;
            const overdue = days < 0;
            return {
              id: `deadline-${task.ID}-${task.Date}`,
              message: overdue
                ? `Overdue: ${task['Content Title']} was due ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`
                : `${task['Content Title']} is due ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}.`,
              targetRole: auth.role,
              targetUserId: String(auth.userId || ''),
              isUrgent: overdue || days === 0 ? 1 : 0,
              createdAt: Date.now(),
              createdBy: 'System',
              type: overdue ? 'overdue' : 'deadline',
              taskId: task.ID
            };
          })
          .filter(Boolean);

        result = {
          success: true,
          laporan: { success: true, data: laporanRes.rows },
          schedule: { success: true, data: scheduleRes.rows },
          memberList: {
            success: true,
            data: internUsers.map((intern) => ({ NAMA: intern.name, STREAM: intern.role, USER_ID: intern.id }))
          },
          internList: { success: true, data: internUsers },
          lecturerList: {
            success: true,
            data: lecturerUsersRes.rows.map((lecturer) => ({
              id: String(lecturer.id),
              name: String(lecturer.name),
              role: String(lecturer.role || 'lecturer'),
              showInAttendees: lecturerVisibility.get(String(lecturer.id)) ?? true
            }))
          },
          scripts: { success: true, data: scriptsRes.rows },
          meetings: { success: true, data: meetingsRes.rows },
          notifications: {
            success: true,
            data: [
              ...deadlineNotifications,
              ...notificationsRes.rows.filter((notification) => !notification.targetUserId || String(notification.targetUserId) === String(auth.userId || ''))
            ]
          },
          auditLog: { success: true, data: getVisibleAuditRows(auth.role, auditRes.rows) },
          gaSummary: { success: true, data: gaSummaryRes.rows },
          gaItems: { success: true, data: gaItemsRes.rows },
          appSettings: { success: true, data: appSettingsRes.rows },
          platforms: { success: true, data: platformsRes.rows },
          categories: { success: true, data: categoriesRes.rows }
        };
        break;
      }

      case 'list_sessions': {
        const sessionsRes = await db.execute({
          sql: `SELECT sessionId, createdAt, lastSeenAt, expiresAt, userAgent
                FROM sessions WHERE userId = ? AND expiresAt >= ? ORDER BY lastSeenAt DESC`,
          args: [String(auth.userId || ''), Date.now()]
        });
        result = {
          success: true,
          sessions: sessionsRes.rows.map((session) => ({
            ...session,
            current: session.sessionId === auth.sessionId
          }))
        };
        break;
      }

      case 'revoke_session': {
        const sessionId = String(params.sessionId || '');
        if (!sessionId || sessionId === auth.sessionId) {
          result = { success: false, error: 'The current session cannot be revoked from this screen.' };
          break;
        }
        await db.execute({
          sql: 'DELETE FROM sessions WHERE sessionId = ? AND userId = ?',
          args: [sessionId, String(auth.userId || '')]
        });
        result = { success: true, message: 'Session revoked.' };
        break;
      }

      case 'logout': {
        await db.execute({
          sql: 'DELETE FROM sessions WHERE token = ?',
          args: [hashSessionToken(token)]
        });
        result = { success: true, message: 'Logged out successfully.' };
        break;
      }

      case 'set_lecturer_attendee_visibility': {
        const userId = String(params.userId || '');
        const visible = params.visible ? 1 : 0;
        if (!userId) {
          result = { success: false, error: 'Lecturer user ID is required.' };
          break;
        }
        await db.execute({
          sql: `INSERT INTO lecturer_attendee_visibility (userId, visible, updatedAt)
                VALUES (?, ?, ?)
                ON CONFLICT(userId) DO UPDATE SET visible = excluded.visible, updatedAt = excluded.updatedAt`,
          args: [userId, visible, Date.now()]
        });
        await writeAudit(db, auth, 'updated', 'lecturer attendee visibility', userId, { visible: Boolean(visible) });
        result = { success: true, message: 'Lecturer attendee visibility updated.' };
        break;
      }

      case 'create': {
        const platforms = ['Instagram', 'TikTok', 'Youtube'];
        const selectedPlatform = String(params.Platform || '').trim().toLowerCase();
        const contentTitle = String(params['Content Title'] || '').trim() || 'Untitled';
        
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
          const commentVal = isSelected ? (params['Comment Text'] || '') : '';

          insertQueries.push({
            sql: `INSERT INTO laporan (
              Date, ID, "Content Title", PIC, Category, Platform, 
              Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, 
              "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text"
              , AssignedUserId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              params.Date, newId, contentTitle, params.PIC, params.Category, plat,
              viewsVal, reachVal, likesVal, commentsVal, followsVal, repostVal, sharesVal,
              totalEngVal, rateVal, kpiVal, 3, urlVal, commentVal, String(params.AssignedUserId || '')
            ]
          });
        }
        await db.batch(insertQueries);
        await syncGroupById(newId);
        if (contentTitle) {
          const existingScript = await db.execute({
            sql: 'SELECT Title FROM scripts WHERE LOWER(Title) = LOWER(?)',
            args: [contentTitle]
          });
          if (existingScript.rows.length === 0) {
            await db.execute({
              sql: `INSERT INTO scripts (Title, Status, Category, Hook, Script, Hastags, "References", Caption, Origin)
                    VALUES (?, 'Scripting', ?, '', '', ?, '', '', 'auto')`,
              args: [
                contentTitle,
                params.Category || 'Story Telling',
                params.Category === 'Motion' ? '#motion #content' : (params.Category === 'Story Telling' ? '#storytelling #content' : '#content')
              ]
            });
          }
        }
        await writeAudit(db, auth, 'created', 'content', newId, { title: contentTitle });
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
              "Comment Text" = ?,
              AssignedUserId = ?
            WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ?`,
            args: [
              params.Date, params['Content Title'], params.PIC, params.Category, params.Platform,
              views, parseInt(params['Account Reach']) || 0, likes, comments, follows, reposts, shares,
              totalEngagement, engagementRate, parseInt(params['KPI Score']) || 3, params.URL || '', params['Comment Text'] || '', String(params.AssignedUserId || ''),
              matchDate, matchTitle, matchPic, matchCategory, matchPlatform
            ]
          });

          // Update main details for all other rows sharing this ID
          await db.execute({
            sql: `UPDATE laporan SET Date = ?, "Content Title" = ?, PIC = ?, Category = ?, AssignedUserId = ? WHERE ID = ?`,
            args: [params.Date, params['Content Title'], params.PIC, params.Category, String(params.AssignedUserId || ''), id]
          });

          await syncGroupById(id);
          await writeAudit(db, auth, 'updated', 'content', id, { title: params['Content Title'] || '' });
        }
        result = { success: true, message: 'Data updated successfully' };
        break;
      }

      case 'delete': {
        const id = params.ID || params.id;
        let fetchedId = id;

        if (fetchedId) {
          // If ID is provided, delete all platform rows for this ID
          await db.execute({
            sql: `DELETE FROM laporan WHERE ID = ?`,
            args: [fetchedId]
          });
          await syncGroupsByIds([fetchedId]);
        } else {
          // Find the ID first using other columns
          const idRes = await db.execute({
            sql: `SELECT ID FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ? LIMIT 1`,
            args: [params.Date, params['Content Title'], params.PIC, params.Category, params.Platform]
          });
          fetchedId = idRes.rows[0]?.ID;

          await db.execute({
            sql: `DELETE FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ?`,
            args: [params.Date, params['Content Title'], params.PIC, params.Category, params.Platform]
          });

          if (fetchedId) {
            await syncGroupsByIds([fetchedId]);
          }
        }
        await writeAudit(db, auth, 'deleted', 'content', fetchedId || '', { title: params['Content Title'] || '' });
        result = { success: true, message: 'Data deleted successfully' };
        break;
      }

      case 'delete_batch': {
        const affectedIds = new Set();
        const deleteQueries = [];
        const selectQueries = [];
        const fallbackRows = [];

        for (const row of params.rows) {
          const id = row.ID || row.id;
          if (id) {
            affectedIds.add(id);
            deleteQueries.push({
              sql: `DELETE FROM laporan WHERE ID = ?`,
              args: [id]
            });
          } else {
            fallbackRows.push(row);
            selectQueries.push({
              sql: `SELECT ID FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ? LIMIT 1`,
              args: [row.Date, row['Content Title'], row.PIC, row.Category, row.Platform]
            });
          }
        }

        if (selectQueries.length > 0) {
          const selectResults = await db.batch(selectQueries);
          for (let i = 0; i < selectResults.length; i++) {
            const res = selectResults[i];
            const row = fallbackRows[i];
            const id = res.rows[0]?.ID;
            if (id) {
              affectedIds.add(id);
              deleteQueries.push({
                sql: `DELETE FROM laporan WHERE Date = ? AND "Content Title" = ? AND PIC = ? AND Category = ? AND Platform = ?`,
                args: [row.Date, row['Content Title'], row.PIC, row.Category, row.Platform]
              });
            }
          }
        }

        if (deleteQueries.length > 0) {
          await db.batch(deleteQueries);
        }

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
        const title = String(params.Content_Title || params['Content Title'] || '').trim() || 'Untitled';
        const category = params.Category || '';
        const assignedUserId = String(params.AssignedUserId || params.assignedUserId || '');
        let taskId = id;
        let previousAssignedUserId = '';

        if (id) {
          // Get the old title to update the corresponding script title if needed
          const oldRow = await db.execute({
            sql: `SELECT "Content Title", AssignedUserId FROM laporan WHERE ID = ? LIMIT 1`,
            args: [id]
          });
          const oldTitle = oldRow.rows[0]?.["Content Title"] || '';
          previousAssignedUserId = String(oldRow.rows[0]?.AssignedUserId || '');

          await db.execute({
            sql: `UPDATE laporan SET Date = ?, "Content Title" = ?, PIC = ?, Category = ?, AssignedUserId = ? WHERE ID = ?`,
            args: [dateStr, title, pic, category, assignedUserId, id]
          });
          await syncGroupById(id);

          if (title) {
            // 1. If title changed, update title in scripts table
            if (oldTitle && oldTitle.trim().toLowerCase() !== title.trim().toLowerCase()) {
              await db.execute({
                sql: "UPDATE scripts SET Title = ? WHERE LOWER(Title) = LOWER(?)",
                args: [title, oldTitle]
              });
            }

            // 2. Check if a script exists now (under the new title)
            const existingScript = await db.execute({
              sql: "SELECT Title FROM scripts WHERE LOWER(Title) = LOWER(?)",
              args: [title]
            });

            if (existingScript.rows.length > 0) {
              // 3. Update category of the existing script to stay in sync
              await db.execute({
                sql: "UPDATE scripts SET Category = ? WHERE LOWER(Title) = LOWER(?)",
                args: [category, title]
              });
            } else {
              // 4. Create a new script draft if it doesn't exist yet
              await db.execute({
                sql: `INSERT INTO scripts (Title, Status, Category, Hook, Script, Hastags, "References", Caption, Origin)
                      VALUES (?, 'Scripting', ?, '', '', ?, '', '', 'auto')`,
                args: [
                  title, 
                  category, 
                  category === 'Motion' ? '#motion #content' : (category === 'Story Telling' ? '#storytelling #content' : '#content')
                ]
              });
            }
          }
        } else {
          const newId = await getNextId();
          taskId = newId;
          const platforms = ['Instagram', 'TikTok', 'Youtube'];
          const insertQueries = platforms.map(plat => ({
            sql: `INSERT INTO laporan (
              Date, ID, "Content Title", PIC, Category, Platform, 
              Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, 
              "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text", AssignedUserId
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0.0, 3, 3, '', '', ?)`,
            args: [dateStr, newId, title, pic, category, plat, assignedUserId]
          }));
          await db.batch(insertQueries);
          await syncGroupById(newId);

          // Automatically create a new script draft in Content Hub if it doesn't exist
          if (title) {
            const existingScript = await db.execute({
              sql: "SELECT Title FROM scripts WHERE LOWER(Title) = LOWER(?)",
              args: [title]
            });
            if (existingScript.rows.length === 0) {
              await db.execute({
                sql: `INSERT INTO scripts (Title, Status, Category, Hook, Script, Hastags, "References", Caption, Origin)
                      VALUES (?, 'Scripting', ?, '', '', ?, '', '', 'auto')`,
                args: [
                  title, 
                  category, 
                  category === 'Motion' ? '#motion #content' : (category === 'Story Telling' ? '#storytelling #content' : '#content')
                ]
              });
            }
          }
        }
        if (assignedUserId && assignedUserId !== previousAssignedUserId) {
          await db.execute({
            sql: `INSERT OR REPLACE INTO notifications
                  (id, message, targetRole, isUrgent, createdAt, createdBy, targetUserId, type, taskId)
                  VALUES (?, ?, 'Creator', 0, ?, ?, ?, 'assignment', ?)`,
            args: [`assignment-${taskId}-${assignedUserId}`, `New assignment: ${title}`, Date.now(), auth.userName || auth.role, assignedUserId, taskId]
          });
        }
        await writeAudit(db, auth, id ? 'updated' : 'created', 'task', taskId, {
          title, date: dateStr, assignedUserId, assigneeName: pic
        });
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
        await writeAudit(db, auth, 'deleted', 'task', id, {});
        result = { success: true, message: 'Schedule deleted successfully' };
        break;
      }

      case 'save_script': {
        const title = String(params.Title || params.title || '').trim() || 'Untitled';
        const status = params.Status || params.status || 'Idea';
        const category = params.Category || params.category || 'Story Telling';
        const hook = params.Hook || params.hook || '';
        const scriptText = params.Script || params.script || '';
        const hashtags = params.Hashtags || params.hashtags || params.Hastags || params.hastags || '';
        const references = params.References || params.references || '';
        const caption = params.Caption || params.caption || '';
        const origin = params.Origin || params.origin || 'manual';

        await db.execute({
          sql: `INSERT OR REPLACE INTO scripts (Title, Status, Category, Hook, Script, Hastags, "References", Caption, Origin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [title, status, category, hook, scriptText, hashtags, references, caption, origin]
        });
        await writeAudit(db, auth, 'saved', 'script', title, { status, category });
        result = { success: true, message: 'Script saved successfully' };
        break;
      }

      case 'delete_script': {
        const title = params.title || params.Title || '';
        await db.execute({
          sql: "DELETE FROM scripts WHERE LOWER(Title) = LOWER(?)",
          args: [title]
        });
        await writeAudit(db, auth, 'deleted', 'script', title, {});
        result = { success: true, message: 'Script deleted successfully' };
        break;
      }

      case 'save_meeting': {
        const id = params.ID || params.id || ('M' + Date.now());
        const date = params.Date || params.date || '';
        const rawAttendees = params.Attendees || params.attendees || '';
        const attendees = Array.isArray(rawAttendees) ? rawAttendees.join(', ') : rawAttendees;
        const rawAbsentees = params.Absentees || params.absentees || '';
        const absentees = Array.isArray(rawAbsentees) ? rawAbsentees.join(', ') : rawAbsentees;
        const recap = params.Recap || params.recap || '';
        const videoRecap = params.VideoRecap || params.videoRecap || '';

        await db.execute({
          sql: `INSERT OR REPLACE INTO meetings (ID, Date, Attendees, Absentees, Recap, VideoRecap)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [id, date, attendees, absentees, recap, videoRecap]
        });
        await writeAudit(db, auth, 'saved', 'meeting', id, { date });
        result = { success: true, message: 'Meeting saved successfully', id: id };
        break;
      }

      case 'delete_meeting': {
        const id = params.id || params.ID || '';
        await db.execute({
          sql: "DELETE FROM meetings WHERE ID = ?",
          args: [id]
        });
        await writeAudit(db, auth, 'deleted', 'meeting', id, {});
        result = { success: true, message: 'Meeting deleted successfully' };
        break;
      }

      case 'save_notification': {
        const id = params.id || ('N' + Date.now());
        const message = params.message || '';
        const targetRole = params.targetRole || 'All';
        const isUrgent = params.isUrgent ? 1 : 0;
        const createdAt = params.createdAt || Date.now();
        const createdBy = auth.role || 'Admin';

        await db.execute({
          sql: "INSERT OR REPLACE INTO notifications (id, message, targetRole, isUrgent, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)",
          args: [id, message, targetRole, isUrgent, createdAt, createdBy]
        });
        await writeAudit(db, auth, 'broadcast', 'notification', id, { targetRole });
        result = { success: true, message: 'Notification broadcasted successfully', id };
        break;
      }

      case 'delete_notification': {
        const id = params.id || '';
        await db.execute({
          sql: "DELETE FROM notifications WHERE id = ?",
          args: [id]
        });
        result = { success: true, message: 'Notification deleted successfully' };
        break;
      }

      case 'save_ga_summary': {
        const visitors = params.visitors || '';
        const pageviews = params.pageviews || '';
        const new_visits = params.new_visits || '';
        const avg_time_on_site = params.avg_time_on_site || '';
        const engagement_rate = params.engagement_rate || '';

        await db.execute({
          sql: `INSERT OR REPLACE INTO google_analytics_summary (id, visitors, pageviews, new_visits, avg_time_on_site, engagement_rate)
                VALUES ('current', ?, ?, ?, ?, ?)`,
          args: [visitors, pageviews, new_visits, avg_time_on_site, engagement_rate]
        });
        result = { success: true, message: 'Google Analytics summary saved successfully' };
        break;
      }

      case 'save_ga_item': {
        const id = params.id;
        const category = params.category || '';
        const label = params.label || '';
        const metric = params.metric || '';
        
        // Auto-calculate sort_order from metric string
        const sort_order = parseMetricToNumber(metric);

        if (id) {
          await db.execute({
            sql: `UPDATE google_analytics_items SET category = ?, label = ?, metric = ?, sort_order = ? WHERE id = ?`,
            args: [category, label, metric, sort_order, id]
          });
          result = { success: true, message: 'Google Analytics item updated successfully' };
        } else {
          await db.execute({
            sql: `INSERT INTO google_analytics_items (category, label, metric, sort_order) VALUES (?, ?, ?, ?)`,
            args: [category, label, metric, sort_order]
          });
          result = { success: true, message: 'Google Analytics item created successfully' };
        }
        break;
      }

      case 'delete_ga_item': {
        const id = params.id;
        await db.execute({
          sql: `DELETE FROM google_analytics_items WHERE id = ?`,
          args: [id]
        });
        result = { success: true, message: 'Google Analytics item deleted successfully' };
        break;
      }

      case 'save_app_setting': {
        const key = params.key || '';
        const value = params.value || '';
        await db.execute({
          sql: "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
          args: [key, value]
        });
        result = { success: true, message: 'Setting saved successfully' };
        break;
      }

      case 'save_app_settings': {
        const settingsObj = params.settings || {};
        const entries = Object.entries(settingsObj);
        if (entries.length > 0) {
          const statements = entries.map(([k, v]) => ({
            sql: "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
            args: [k, String(v || '')]
          }));
          await db.batch(statements);
        }
        result = { success: true, message: 'Batch settings saved successfully' };
        break;
      }

      case 'save_platform': {
        const id = (params.id || params.name || '').trim().toLowerCase();
        const name = (params.name || '').trim();
        const logo_url = (params.logo_url || '').trim();
        const color_class = (params.color_class || '').trim();
        await db.execute({
          sql: "INSERT OR REPLACE INTO platforms (id, name, logo_url, color_class) VALUES (?, ?, ?, ?)",
          args: [id, name, logo_url, color_class]
        });
        result = { success: true, message: 'Platform saved successfully' };
        break;
      }

      case 'delete_platform': {
        const id = (params.id || '').trim().toLowerCase();
        await db.execute({
          sql: "DELETE FROM platforms WHERE id = ?",
          args: [id]
        });
        result = { success: true, message: 'Platform deleted successfully' };
        break;
      }

      case 'save_category': {
        const name = (params.name || '').trim();
        const color_class = (params.color_class || '').trim();
        await db.execute({
          sql: "INSERT OR REPLACE INTO categories (name, color_class) VALUES (?, ?)",
          args: [name, color_class]
        });
        result = { success: true, message: 'Category saved successfully' };
        break;
      }

      case 'delete_category': {
        const name = (params.name || '').trim();
        await db.execute({
          sql: "DELETE FROM categories WHERE name = ?",
          args: [name]
        });
        result = { success: true, message: 'Category deleted successfully' };
        break;
      }

      case 'save_member': {
        const oldNama = (params.oldNama || '').trim();
        const nama = (params.NAMA || params.nama || '').trim();
        const stream = (params.STREAM || params.stream || '').trim();

        if (oldNama) {
          await db.execute({
            sql: "UPDATE member_list SET NAMA = ?, STREAM = ? WHERE NAMA = ?",
            args: [nama, stream, oldNama]
          });
          if (oldNama !== nama) {
            await db.execute({
              sql: "UPDATE laporan SET PIC = ? WHERE PIC = ?",
              args: [nama, oldNama]
            });
            await db.execute({
              sql: "UPDATE schedule SET PIC = ? WHERE PIC = ?",
              args: [nama, oldNama]
            });
          }
        } else {
          await db.execute({
            sql: "INSERT INTO member_list (NAMA, STREAM) VALUES (?, ?)",
            args: [nama, stream]
          });
        }
        result = { success: true, message: 'Member saved successfully' };
        break;
      }

      case 'delete_member': {
        const nama = (params.NAMA || params.nama || '').trim();
        await db.execute({
          sql: "DELETE FROM member_list WHERE NAMA = ?",
          args: [nama]
        });
        await db.execute({
          sql: "UPDATE laporan SET PIC = '' WHERE PIC = ?",
          args: [nama]
        });
        await db.execute({
          sql: "UPDATE schedule SET PIC = '' WHERE PIC = ?",
          args: [nama]
        });
        result = { success: true, message: 'Member deleted successfully' };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    console.log(`[API SUCCESS] Completed request for action "${action}" in ${Date.now() - startTime}ms`);
    const response = NextResponse.json(result);
    if (action === 'logout') {
      response.cookies.set(SESSION_COOKIE_NAME, '', getExpiredSessionCookieOptions());
    }
    return response;
  } catch (error) {
    console.error('Error in API sheets proxy route:', error);
    return NextResponse.json(
      publicErrorResponse(),
      { status: 500 }
    );
  }
}
