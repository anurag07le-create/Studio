-- Camera movement presets
CREATE TABLE IF NOT EXISTS camera_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  movement TEXT NOT NULL,
  speed TEXT DEFAULT 'medium',
  easing TEXT DEFAULT 'ease-in-out',
  description TEXT
);

-- Seed default camera presets
INSERT OR IGNORE INTO camera_presets (id, name, movement, speed, easing, description) VALUES
  ('static', 'Static', 'No camera movement', 'none', 'none', 'Locked camera, no movement'),
  ('pan-left', 'Pan Left', 'Smooth horizontal pan from right to left', 'slow', 'ease-in-out', 'Camera pans smoothly to the left'),
  ('pan-right', 'Pan Right', 'Smooth horizontal pan from left to right', 'slow', 'ease-in-out', 'Camera pans smoothly to the right'),
  ('tilt-up', 'Tilt Up', 'Vertical tilt from bottom to top', 'slow', 'ease-in-out', 'Camera tilts upward'),
  ('tilt-down', 'Tilt Down', 'Vertical tilt from top to bottom', 'slow', 'ease-in-out', 'Camera tilts downward'),
  ('dolly-in', 'Dolly In', 'Camera moves forward toward subject', 'medium', 'ease-in', 'Dolly zoom toward subject'),
  ('dolly-out', 'Dolly Out', 'Camera pulls back from subject', 'medium', 'ease-out', 'Dolly zoom away from subject'),
  ('zoom-in', 'Zoom In', 'Lens zoom into subject', 'medium', 'ease-in', 'Optical zoom toward subject'),
  ('zoom-out', 'Zoom Out', 'Lens zoom out from subject', 'medium', 'ease-out', 'Optical zoom away from subject'),
  ('tracking', 'Tracking Shot', 'Camera follows subject movement laterally', 'medium', 'linear', 'Camera tracks alongside moving subject'),
  ('crane-up', 'Crane Up', 'Camera rises vertically on crane', 'slow', 'ease-in-out', 'Vertical crane movement upward'),
  ('crane-down', 'Crane Down', 'Camera lowers vertically on crane', 'slow', 'ease-in-out', 'Vertical crane movement downward'),
  ('orbit', 'Orbit', 'Camera orbits around subject in a circle', 'slow', 'linear', '360-degree orbit around subject'),
  ('handheld', 'Handheld', 'Slight handheld shake for documentary feel', 'medium', 'none', 'Realistic handheld camera shake'),
  ('rack-focus', 'Rack Focus', 'Focus shift between foreground and background', 'fast', 'ease-in-out', 'Depth-of-field focus transition');
