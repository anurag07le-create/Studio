import React, { useState, useEffect } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, TextInput, Textarea, Badge,
  Image, Select, SimpleGrid, Loader, Collapse, Alert,
} from '@mantine/core';

const PRESET_DATA = [
  { value: 'cyberpunk-neon', label: 'Cyberpunk Neon', emoji: '🌆' },
  { value: 'studio-ghibli', label: 'Studio Ghibli', emoji: '🎨' },
  { value: 'noir-detective', label: 'Film Noir', emoji: '🕵️' },
  { value: 'watercolor-storybook', label: 'Watercolor Storybook', emoji: '📖' },
  { value: 'comic-book', label: 'Comic Book', emoji: '💥' },
  { value: 'photorealistic', label: 'Photorealistic Cinema', emoji: '📷' },
  { value: 'pixel-art', label: 'Pixel Art', emoji: '👾' },
  { value: 'oil-painting', label: 'Classical Oil', emoji: '🖼️' },
];

export default function StyleLockPanel({
  styleLock,
  onSetStyleLock,
  onRemoveStyleLock,
  loading,
}) {
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customForm, setCustomForm] = useState({ styleName: '', stylePrompt: '' });
  const [showForm, setShowForm] = useState(false);

  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    onSetStyleLock?.({ presetId });
  };

  const handleCustomSubmit = () => {
    if (!customForm.styleName.trim() || !customForm.stylePrompt.trim()) return;
    onSetStyleLock?.(customForm);
    setShowForm(false);
  };

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" mb="sm">
        <Title order={5}>Style Lock</Title>
        {styleLock && (
          <Button size="xs" variant="subtle" color="red" onClick={onRemoveStyleLock}>
            Remove
          </Button>
        )}
      </Group>

      {styleLock ? (
        <Stack gap="xs">
          <Group gap="xs">
            <Badge color="violet" variant="filled" size="lg">{styleLock.styleName}</Badge>
            {loading && <Loader size="xs" />}
          </Group>
          <Text size="xs" c="dimmed">{styleLock.stylePrompt}</Text>
          {styleLock.referenceImageUrl && (
            <Image src={styleLock.referenceImageUrl} h={100} radius="sm" fit="cover" />
          )}
          {styleLock.extractedTraits && (
            <Group gap={4}>
              {Object.entries(styleLock.extractedTraits).filter(([_, v]) => v).map(([k, v]) => (
                <Badge key={k} size="xs" variant="outline" color="violet">{k}: {v}</Badge>
              ))}
            </Group>
          )}
          <Button
            size="xs"
            variant="light"
            onClick={() => { setShowForm(true); setMode('preset'); }}
          >
            Change Style
          </Button>
        </Stack>
      ) : (
        <Stack gap="xs">
          <Text size="xs" c="dimmed">Lock a visual style for all generated images in this project.</Text>

          <Group gap="xs">
            <Button
              size="xs"
              variant={mode === 'preset' ? 'filled' : 'light'}
              color="violet"
              onClick={() => setMode('preset')}
            >
              Presets
            </Button>
            <Button
              size="xs"
              variant={mode === 'custom' ? 'filled' : 'light'}
              color="violet"
              onClick={() => setMode('custom')}
            >
              Custom
            </Button>
          </Group>

          {mode === 'preset' && (
            <SimpleGrid cols={2} spacing="xs">
              {PRESET_DATA.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  color="violet"
                  size="xs"
                  onClick={() => handlePresetSelect(preset.value)}
                  loading={loading && selectedPreset === preset.value}
                  styles={{ label: { justifyContent: 'flex-start' } }}
                >
                  {preset.emoji} {preset.label}
                </Button>
              ))}
            </SimpleGrid>
          )}

          {mode === 'custom' && (
            <Stack gap="xs">
              <TextInput
                size="xs"
                label="Style Name"
                placeholder="e.g., Dreamy Pastel"
                value={customForm.styleName}
                onChange={(e) => setCustomForm({ ...customForm, styleName: e.target.value })}
              />
              <Textarea
                size="xs"
                label="Style Prompt"
                placeholder="Describe the visual style in detail: colors, lighting, texture, mood..."
                value={customForm.stylePrompt}
                onChange={(e) => setCustomForm({ ...customForm, stylePrompt: e.target.value })}
                minRows={3}
                autosize
              />
              <Button
                size="xs"
                color="violet"
                onClick={handleCustomSubmit}
                loading={loading}
                disabled={!customForm.styleName.trim() || !customForm.stylePrompt.trim()}
              >
                Lock Style
              </Button>
            </Stack>
          )}
        </Stack>
      )}

      <Collapse in={showForm && !!styleLock}>
        <Stack gap="xs" mt="sm" p="xs" style={{ background: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
          <Text size="xs" fw={500}>Change Style</Text>
          <Group gap="xs">
            <Button size="xs" variant={mode === 'preset' ? 'filled' : 'light'} color="violet" onClick={() => setMode('preset')}>
              Presets
            </Button>
            <Button size="xs" variant={mode === 'custom' ? 'filled' : 'light'} color="violet" onClick={() => setMode('custom')}>
              Custom
            </Button>
          </Group>
          {mode === 'preset' && (
            <SimpleGrid cols={2} spacing="xs">
              {PRESET_DATA.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  color="violet"
                  size="xs"
                  onClick={() => { handlePresetSelect(preset.value); setShowForm(false); }}
                  loading={loading && selectedPreset === preset.value}
                  styles={{ label: { justifyContent: 'flex-start' } }}
                >
                  {preset.emoji} {preset.label}
                </Button>
              ))}
            </SimpleGrid>
          )}
          {mode === 'custom' && (
            <Stack gap="xs">
              <TextInput size="xs" label="Style Name" value={customForm.styleName}
                onChange={(e) => setCustomForm({ ...customForm, styleName: e.target.value })} />
              <Textarea size="xs" label="Style Prompt" value={customForm.stylePrompt}
                onChange={(e) => setCustomForm({ ...customForm, stylePrompt: e.target.value })} minRows={2} autosize />
              <Button size="xs" color="violet" onClick={() => { handleCustomSubmit(); setShowForm(false); }}
                disabled={!customForm.styleName.trim() || !customForm.stylePrompt.trim()}>
                Lock Style
              </Button>
            </Stack>
          )}
          <Button size="xs" variant="subtle" onClick={() => setShowForm(false)}>Cancel</Button>
        </Stack>
      </Collapse>
    </Card>
  );
}
