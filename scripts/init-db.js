const fs = require('fs');
const path = require('path');
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

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: url || 'file:local.db',
  authToken: authToken || '',
});

async function main() {
  console.log(`Connecting to database at: ${url || 'file:local.db'}`);

  try {
    // 2. Create tables with exact casing matching Sheets headers
    console.log('Creating tables...');
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS member_list (
        NAMA TEXT PRIMARY KEY,
        STREAM TEXT NOT NULL
      );
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS schedule (
        ID TEXT PRIMARY KEY,
        Date TEXT NOT NULL,
        PIC TEXT NOT NULL,
        "Content Title" TEXT NOT NULL,
        Category TEXT NOT NULL,
        Status INTEGER NOT NULL,
        Month TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS scripts (
        Title TEXT PRIMARY KEY,
        Status TEXT NOT NULL,
        Category TEXT NOT NULL,
        Hook TEXT,
        Script TEXT,
        Hastags TEXT,
        "References" TEXT,
        Caption TEXT
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS meetings (
        ID TEXT PRIMARY KEY,
        Date TEXT NOT NULL,
        Attendees TEXT,
        Absentees TEXT,
        Recap TEXT,
        VideoRecap TEXT
      );
    `);

    await client.execute(`
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
        "KPI Score" INTEGER DEFAULT 3,
        "KPI Summary" INTEGER DEFAULT 3,
        URL TEXT,
        "Comment Text" TEXT,
        PRIMARY KEY (ID, Platform)
      );
    `);

    console.log('✅ Tables created successfully.');

    // 3. Check and seed member_list
    const existingMembers = await client.execute('SELECT COUNT(*) as count FROM member_list');
    if (existingMembers.rows[0].count === 0) {
      console.log('Seeding member_list...');
      const members = [
        ['Kelvin', 'Product Manager'],
        ['Felix', 'Content Creator'],
        ['Eduard', 'Content Creator'],
        ['Anthoni', 'Content Creator'],
        ['Leonardi', 'Content Creator'],
        ['Ruliyanto', 'Content Creator'],
        ['Rafael', 'Content Creator']
      ];
      const queries = members.map(m => ({
        sql: 'INSERT INTO member_list (NAMA, STREAM) VALUES (?, ?)',
        args: m
      }));
      await client.batch(queries);
      console.log('✅ Seeded member_list.');
    }

    // 4. Check and seed schedule
    const existingSchedule = await client.execute('SELECT COUNT(*) as count FROM schedule');
    if (existingSchedule.rows[0].count === 0) {
      console.log('Seeding schedule...');
      const tasks = [
        ['CT1', '03/02/2026', 'Felix', 'Refind Self', 'Story Telling', 1, 'Maret'],
        ['CT2', '03/03/2026', 'Kelvin', 'Drakantos', 'Story Telling', 1, 'Maret'],
        ['CT3', '03/04/2026', 'Felix', 'Ubah Anime 2D jadi 3D Imersif', 'Article Reels', 1, 'Maret']
      ];
      const queries = tasks.map(t => ({
        sql: 'INSERT INTO schedule (ID, Date, PIC, "Content Title", Category, Status, Month) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: t
      }));
      await client.batch(queries);
      console.log('✅ Seeded schedule.');
    }

    // 5. Check and seed meetings
    const existingMeetings = await client.execute('SELECT COUNT(*) as count FROM meetings');
    if (existingMeetings.rows[0].count === 0) {
      console.log('Seeding meetings...');
      const memos = [
        ['MEET001', '2026-03-02', 'Kelvin, Felix', '', 'Discussed project scope, deliverables, and timelines.', ''],
        ['MEET002', '2026-03-03', 'Andre, Kelvin', '', 'Reviewed UI mockups, feedback collected, next steps defined.', '']
      ];
      const queries = memos.map(m => ({
        sql: 'INSERT INTO meetings (ID, Date, Attendees, Absentees, Recap, VideoRecap) VALUES (?, ?, ?, ?, ?, ?)',
        args: m
      }));
      await client.batch(queries);
      console.log('✅ Seeded meetings.');
    }

    // 6. Check and seed scripts
    const existingScripts = await client.execute('SELECT COUNT(*) as count FROM scripts');
    if (existingScripts.rows[0].count === 0) {
      console.log('Seeding scripts...');
      const drafts = [
        ['Refind Self Storyboard', 'Completed', 'Story Telling', 'Have you ever wondered who you really are?', "Let's find out by exploring this beautiful game.", '#gaming #selfdiscovery', 'https://example.com', 'Discover your true self.']
      ];
      const queries = drafts.map(d => ({
        sql: 'INSERT INTO scripts (Title, Status, Category, Hook, Script, Hastags, "References", Caption) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: d
      }));
      await client.batch(queries);
      console.log('✅ Seeded scripts.');
    }

    // 7. Check and seed laporan
    const existingLaporan = await client.execute('SELECT COUNT(*) as count FROM laporan');
    if (existingLaporan.rows[0].count === 0) {
      console.log('Seeding laporan metrics...');
      const rows = [
        // Refind Self (GAT001)
        ['03/02/2026', 'GAT001', 'Refind Self', 'Felix', 'Story Telling', 'Instagram', 1500, 1300, 120, 10, 2, 0, 5, 137, 10.54, 4, 4, '', ''],
        ['03/02/2026', 'GAT001', 'Refind Self', 'Felix', 'Story Telling', 'TikTok', 2500, 2200, 210, 18, 4, 0, 8, 240, 10.91, 4, 4, '', ''],
        ['03/02/2026', 'GAT001', 'Refind Self', 'Felix', 'Story Telling', 'Youtube', 1800, 1600, 150, 12, 3, 0, 6, 171, 10.69, 4, 4, '', ''],
        // Drakantos (GAT002)
        ['03/03/2026', 'GAT002', 'Drakantos', 'Kelvin', 'Story Telling', 'Instagram', 800, 700, 60, 4, 1, 0, 2, 67, 9.57, 3, 3, '', ''],
        ['03/03/2026', 'GAT002', 'Drakantos', 'Kelvin', 'Story Telling', 'TikTok', 950, 850, 75, 6, 2, 0, 3, 86, 10.12, 3, 3, '', ''],
        ['03/03/2026', 'GAT002', 'Drakantos', 'Kelvin', 'Story Telling', 'Youtube', 850, 750, 65, 5, 1, 0, 2, 73, 9.73, 3, 3, '', ''],
        // Ubah Anime 2D jadi 3D Imersif (GAT003)
        ['03/04/2026', 'GAT003', 'Ubah Anime 2D jadi 3D Imersif', 'Felix', 'Article Reels', 'Instagram', 12000, 10500, 980, 80, 15, 2, 45, 1122, 10.69, 5, 5, '', ''],
        ['03/04/2026', 'GAT003', 'Ubah Anime 2D jadi 3D Imersif', 'Felix', 'Article Reels', 'TikTok', 15000, 13200, 1250, 95, 22, 4, 58, 1429, 10.83, 5, 5, '', ''],
        ['03/04/2026', 'GAT003', 'Ubah Anime 2D jadi 3D Imersif', 'Felix', 'Article Reels', 'Youtube', 13500, 12000, 1100, 85, 18, 3, 52, 1258, 10.48, 5, 5, '', '']
      ];
      const queries = rows.map(r => ({
        sql: 'INSERT INTO laporan (Date, ID, "Content Title", PIC, Category, Platform, Views, "Account Reach", Likes, Comments, Follows, Repost, Shares, "Total Engagement", "Engagement Rate (%)", "KPI Score", "KPI Summary", URL, "Comment Text") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: r
      }));
      await client.batch(queries);
      console.log('✅ Seeded laporan metrics.');
    }

    console.log('🎉 Database initialization and seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error executing initialization commands:', error);
  } finally {
    client.close();
  }
}

main();
