-- Add consistency reference columns to shots
ALTER TABLE shots ADD COLUMN characterRefs TEXT; -- JSON array of character ref IDs
ALTER TABLE shots ADD COLUMN locationRef TEXT; -- Single location ref ID
