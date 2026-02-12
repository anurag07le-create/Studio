import React, { useState } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, TextInput, Textarea, Badge,
  Image, Collapse,
} from '@mantine/core';

export default function LocationPanel({
  locations = [],
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', traits: {} });

  const resetForm = () => {
    setForm({ name: '', description: '', traits: {} });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      onUpdateLocation?.(editingId, form);
      setEditingId(null);
    } else {
      onCreateLocation?.(form);
    }
    resetForm();
  };

  const startEdit = (loc) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name || '',
      description: loc.description || '',
      traits: loc.traits || {},
    });
    setShowForm(true);
  };

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Title order={5}>Locations</Title>
          <Badge size="sm" variant="light">{locations.length}</Badge>
        </Group>
        <Button size="xs" variant="light" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Cancel' : '+ Add'}
        </Button>
      </Group>

      <Collapse in={showForm}>
        <Stack gap="xs" mb="sm" p="xs" style={{ background: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
          <TextInput
            size="xs"
            label="Location Name"
            placeholder="e.g., Neon City Alley"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            size="xs"
            label="Description"
            placeholder="Architecture, lighting, atmosphere, key details..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            minRows={2}
            autosize
          />
          <Group grow>
            <TextInput size="xs" label="Architecture" placeholder="Style"
              value={form.traits.architecture || ''}
              onChange={(e) => setForm({ ...form, traits: { ...form.traits, architecture: e.target.value } })}
            />
            <TextInput size="xs" label="Lighting" placeholder="Type"
              value={form.traits.lighting || ''}
              onChange={(e) => setForm({ ...form, traits: { ...form.traits, lighting: e.target.value } })}
            />
          </Group>
          <Group grow>
            <TextInput size="xs" label="Color Palette" placeholder="Dominant colors"
              value={form.traits.color_palette || ''}
              onChange={(e) => setForm({ ...form, traits: { ...form.traits, color_palette: e.target.value } })}
            />
            <TextInput size="xs" label="Atmosphere" placeholder="Mood/feel"
              value={form.traits.atmosphere || ''}
              onChange={(e) => setForm({ ...form, traits: { ...form.traits, atmosphere: e.target.value } })}
            />
          </Group>
          <Group justify="flex-end">
            <Button size="xs" variant="subtle" onClick={resetForm}>Cancel</Button>
            <Button size="xs" color="violet" onClick={handleSubmit}>
              {editingId ? 'Update' : 'Add Location'}
            </Button>
          </Group>
        </Stack>
      </Collapse>

      <Stack gap="xs">
        {locations.map((loc) => (
          <Card key={loc.id} withBorder padding="xs" radius="sm">
            <Group gap="xs" wrap="nowrap">
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: 'var(--mantine-color-gray-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Text size="lg">📍</Text>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text fw={500} size="sm" truncate>{loc.name}</Text>
                <Text size="xs" c="dimmed" lineClamp={1}>{loc.description || 'No description'}</Text>
                {loc.traits && (
                  <Group gap={4} mt={2}>
                    {Object.entries(loc.traits).filter(([_, v]) => v).slice(0, 3).map(([k, v]) => (
                      <Badge key={k} size="xs" variant="outline" color="gray">{v}</Badge>
                    ))}
                  </Group>
                )}
              </div>
            </Group>
            <Group gap="xs" mt="xs" justify="flex-end">
              <Button size="xs" variant="subtle" onClick={() => startEdit(loc)}>Edit</Button>
              <Button size="xs" variant="subtle" color="red" onClick={() => onDeleteLocation?.(loc.id)}>Delete</Button>
            </Group>
          </Card>
        ))}
        {locations.length === 0 && !showForm && (
          <Text size="xs" c="dimmed" ta="center" py="xs">No locations yet. Add one for consistent environments.</Text>
        )}
      </Stack>
    </Card>
  );
}
