const db = require('../db/connection');

// Add style column if it does not exist (idempotent)
const hasStyleColumn = db
  .prepare("PRAGMA table_info(stories)")
  .all()
  .some((row) => row.name === 'style');
if (!hasStyleColumn) {
  db.exec('ALTER TABLE stories ADD COLUMN style TEXT;');
}

// Add videos column if it does not exist (idempotent)
const hasVideosColumn = db
  .prepare("PRAGMA table_info(stories)")
  .all()
  .some((row) => row.name === 'videos');
if (!hasVideosColumn) {
  db.exec('ALTER TABLE stories ADD COLUMN videos TEXT;');
}

const toStory = (row) => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt,
  shotCount: row.shotCount,
  storyboard: JSON.parse(row.storyboard || '[]'),
  style: row.style || null,
  videos: JSON.parse(row.videos || '[]'),
});

const getStories = async () => {
  const rows = db.prepare('SELECT * FROM stories ORDER BY datetime(createdAt) DESC').all();
  return rows.map(toStory);
};
exports.getStories = getStories;

exports.saveStory = async (story) => {
  db.prepare(
    `INSERT INTO stories (id, title, createdAt, shotCount, storyboard, style, videos)
     VALUES (@id, @title, @createdAt, @shotCount, @storyboard, @style, @videos)
     ON CONFLICT(id) DO UPDATE SET
       title=excluded.title,
       createdAt=excluded.createdAt,
       shotCount=excluded.shotCount,
       storyboard=excluded.storyboard,
       style=excluded.style,
       videos=excluded.videos`
  ).run({
    id: story.id,
    title: story.title,
    createdAt: story.createdAt,
    shotCount: story.shotCount,
    storyboard: JSON.stringify(story.storyboard || []),
    style: story.style || null,
    videos: JSON.stringify(story.videos || []),
  });
  return story;
};

exports.deleteStory = async (id) => {
  db.prepare('DELETE FROM stories WHERE id = ?').run(id);
  return await getStories();
};
