import React, { useState, useEffect } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, Textarea, TextInput, NumberInput,
  Badge, Image, Select, Drawer,
} from '@mantine/core';
import CameraMovementPicker from './CameraMovementPicker';

export default function ShotEditorPanel({
  shot,
  opened,
  onClose,
  onSave,
  onSuggestCamera,
  suggesting,
}) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (shot) {
      setForm({
        prompt: shot.prompt || '',
        description: shot.description || '',
        shotStory: shot.shotStory || '',
        cameraAngle: shot.cameraAngle || '',
        cameraMovement: shot.cameraMovement || '',
        cameraPresetId: shot.cameraPresetId || '',
        duration: shot.duration || 6,
        mood: shot.mood || '',
      });
    }
  }, [shot]);

  const handleSave = () => {
    onSave?.(shot.id, form);
    onClose?.();
  };

  const handleSuggestCamera = async () => {
    const suggestion = await onSuggestCamera?.(form.prompt || form.description);
    if (suggestion) {
      setForm((prev) => ({
        ...prev,
        cameraAngle: suggestion.cameraAngle || prev.cameraAngle,
        cameraMovement: suggestion.cameraMovement || prev.cameraMovement,
        duration: suggestion.duration || prev.duration,
      }));
    }
  };

  if (!shot) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={<Group gap="xs"><Badge color="violet">Shot {shot.shotNumber}</Badge><Text fw={500}>Edit Shot</Text></Group>}
      position="right"
      size="lg"
    >
      <Stack gap="sm">
        {shot.imageUrl && (
          <Image src={shot.imageUrl} h={200} radius="md" fit="cover" />
        )}

        <Textarea
          label="Shot Prompt"
          description="The image generation prompt for this shot"
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          minRows={3}
          autosize
        />

        <Textarea
          label="Description"
          description="Visual description of what happens"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          minRows={2}
          autosize
        />

        <Textarea
          label="Shot Story"
          description="Narrative context for this shot"
          value={form.shotStory}
          onChange={(e) => setForm({ ...form, shotStory: e.target.value })}
          minRows={2}
          autosize
        />

        <Group grow>
          <TextInput
            label="Camera Angle"
            placeholder="e.g., Low Angle, Eye Level"
            value={form.cameraAngle}
            onChange={(e) => setForm({ ...form, cameraAngle: e.target.value })}
          />
          <TextInput
            label="Camera Movement"
            placeholder="e.g., Slow dolly in"
            value={form.cameraMovement}
            onChange={(e) => setForm({ ...form, cameraMovement: e.target.value })}
          />
        </Group>

        <Group grow>
          <NumberInput
            label="Duration (seconds)"
            min={2}
            max={16}
            value={form.duration}
            onChange={(val) => setForm({ ...form, duration: val })}
          />
          <TextInput
            label="Mood"
            placeholder="e.g., Tense, Serene, Mysterious"
            value={form.mood}
            onChange={(e) => setForm({ ...form, mood: e.target.value })}
          />
        </Group>

        <CameraMovementPicker
          value={form.cameraPresetId}
          onChange={(id) => setForm({ ...form, cameraPresetId: id })}
        />

        <Button
          variant="light"
          color="grape"
          size="xs"
          onClick={handleSuggestCamera}
          loading={suggesting}
        >
          AI Suggest Camera
        </Button>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button color="violet" onClick={handleSave}>Save Changes</Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
