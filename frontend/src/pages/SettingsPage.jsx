import React, { useState, useEffect } from 'react';
import {
  Title, Text, Stack, Card, Select, Slider, NumberInput, Group,
  Button, Alert, Switch, Divider, Badge, TextInput,
} from '@mantine/core';

const stylePresets = [
  { value: 'cyberpunk', label: 'Cyberpunk / Neon' },
  { value: 'filmic', label: 'Filmic Realism' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'anime', label: 'Anime' },
  { value: 'noir', label: 'B&W Film Noir' },
  { value: 'ghibli', label: 'Ghibli Style' },
  { value: 'oilpainting', label: 'Oil Painting' },
  { value: 'pixar', label: 'Pixar 3D' },
  { value: 'inkwash', label: 'Chinese Ink Wash' },
  { value: 'scifi', label: 'Sci-Fi Future' },
  { value: 'fantasy', label: 'Fantasy / Magic' },
  { value: 'retro', label: 'Retro / Vintage' },
  { value: 'comic', label: 'American Comic' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'steampunk', label: 'Steampunk' },
];

const STORAGE_KEY = 'pucho-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => ({
    defaultStyle: 'cyberpunk',
    defaultShotCount: 6,
    defaultLayout: 'grid',
    autoSaveToGallery: true,
    showShotNumbers: true,
    exportIncludeNotes: true,
    ...loadSettings(),
  }));
  const [saved, setSaved] = useState(false);

  const update = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults = {
      defaultStyle: 'cyberpunk',
      defaultShotCount: 6,
      defaultLayout: 'grid',
      autoSaveToGallery: true,
      showShotNumbers: true,
      exportIncludeNotes: true,
    };
    setSettings(defaults);
    saveSettings(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Stack gap="lg" maw={720} mx="auto">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} className="section-title">Settings</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Configure your default preferences for new projects and exports.
          </Text>
        </div>
        <Badge size="lg" variant="light" color="violet">Preferences</Badge>
      </Group>

      {/* Generation Defaults */}
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Title order={4}>Generation Defaults</Title>
          <Text size="xs" c="dimmed">
            These settings are used as defaults when creating new storyboards.
          </Text>

          <Divider />

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>Default Style</Text>
              <Text size="xs" c="dimmed">Applied to quick generate and new projects</Text>
            </div>
            <Select
              data={stylePresets}
              value={settings.defaultStyle}
              onChange={(val) => update('defaultStyle', val)}
              maw={220}
              size="sm"
            />
          </Group>

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>Default Shot Count</Text>
              <Text size="xs" c="dimmed">Number of shots per storyboard</Text>
            </div>
            <NumberInput
              value={settings.defaultShotCount}
              onChange={(val) => update('defaultShotCount', Number(val) || 6)}
              min={2}
              max={12}
              maw={100}
              size="sm"
            />
          </Group>

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>Auto-Save to Gallery</Text>
              <Text size="xs" c="dimmed">Automatically save when generating video</Text>
            </div>
            <Switch
              checked={settings.autoSaveToGallery}
              onChange={(e) => update('autoSaveToGallery', e.target.checked)}
              color="violet"
              size="md"
            />
          </Group>
        </Stack>
      </Card>

      {/* Display Preferences */}
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Title order={4}>Display Preferences</Title>

          <Divider />

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>Show Shot Numbers</Text>
              <Text size="xs" c="dimmed">Display shot numbers on cards</Text>
            </div>
            <Switch
              checked={settings.showShotNumbers}
              onChange={(e) => update('showShotNumbers', e.target.checked)}
              color="violet"
              size="md"
            />
          </Group>
        </Stack>
      </Card>

      {/* Export Defaults */}
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Title order={4}>Export Defaults</Title>

          <Divider />

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>PDF Layout</Text>
              <Text size="xs" c="dimmed">Default layout for PDF exports</Text>
            </div>
            <Select
              data={[
                { value: 'grid', label: 'Grid (2-up)' },
                { value: 'single', label: 'Full Page' },
              ]}
              value={settings.defaultLayout}
              onChange={(val) => update('defaultLayout', val)}
              maw={160}
              size="sm"
            />
          </Group>

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>Include Notes in PDF</Text>
              <Text size="xs" c="dimmed">Add scene descriptions to PDF export</Text>
            </div>
            <Switch
              checked={settings.exportIncludeNotes}
              onChange={(e) => update('exportIncludeNotes', e.target.checked)}
              color="violet"
              size="md"
            />
          </Group>
        </Stack>
      </Card>

      {/* Actions */}
      <Group justify="space-between">
        <Button variant="subtle" color="red" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Group gap="sm">
          {saved && (
            <Text size="sm" c="green" fw={500}>Saved!</Text>
          )}
          <Button
            variant="gradient"
            gradient={{ from: '#5922C7', to: '#7C3AED' }}
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
