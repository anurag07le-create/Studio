-- Add uploadedImageUrl column for user-uploaded character reference images
ALTER TABLE character_refs ADD COLUMN uploadedImageUrl TEXT;
