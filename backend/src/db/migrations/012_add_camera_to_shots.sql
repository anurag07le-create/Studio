-- Add camera preset reference and custom camera prompt to shots
ALTER TABLE shots ADD COLUMN cameraPresetId TEXT;
ALTER TABLE shots ADD COLUMN customCameraPrompt TEXT;
