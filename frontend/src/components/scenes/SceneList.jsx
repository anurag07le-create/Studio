import React, { useState } from 'react';
import {
  Accordion, Card, Text, Title, Group, Badge, Button, Stack, Textarea, TextInput, Alert, Loader,
} from '@mantine/core';

export default function SceneList({
  scenes = [],
  onUpdateScene,
  onDeleteScene,
  onGenerateShots,
  generatingSceneId,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const startEdit = (scene) => {
    setEditingId(scene.id);
    setEditData({
      heading: scene.heading || '',
      location: scene.location || '',
      timeOfDay: scene.timeOfDay || '',
      description: scene.description || '',
      dialogue: scene.dialogue || '',
      notes: scene.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = (sceneId) => {
    if (onUpdateScene) onUpdateScene(sceneId, editData);
    setEditingId(null);
    setEditData({});
  };

  if (scenes.length === 0) {
    return (
      <Card withBorder padding="xl" radius="md">
        <Text ta="center" c="dimmed">No scenes yet. Upload a script to extract scenes automatically.</Text>
      </Card>
    );
  }

  return (
    <Accordion variant="separated" radius="md">
      {scenes.map((scene) => (
        <Accordion.Item key={scene.id} value={scene.id}>
          <Accordion.Control>
            <Group justify="space-between" wrap="nowrap" pr="md">
              <Group gap="sm">
                <Badge color="violet" variant="light" size="lg">
                  {scene.sceneNumber || '?'}
                </Badge>
                <div>
                  <Group gap={6}>
                    <Text fw={500} size="sm">{scene.heading || 'Untitled Scene'}</Text>
                    {scene.characters?.map(char => (
                      <Badge key={char.id} size="xs" variant="dot" color="grape">
                        {char.name}
                      </Badge>
                    ))}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {[scene.location, scene.timeOfDay].filter(Boolean).join(' · ') || 'No location'}
                    {scene.shotCount !== undefined && ` · ${scene.shotCount} shots`}
                    {scene.characters?.length > 0 && ` · ${scene.characters.length} character${scene.characters.length !== 1 ? 's' : ''}`}
                  </Text>
                </div>
              </Group>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            {editingId === scene.id ? (
              <Stack gap="sm">
                <TextInput
                  label="Heading"
                  value={editData.heading}
                  onChange={(e) => setEditData({ ...editData, heading: e.target.value })}
                />
                <Group grow>
                  <TextInput
                    label="Location"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  />
                  <TextInput
                    label="Time of Day"
                    value={editData.timeOfDay}
                    onChange={(e) => setEditData({ ...editData, timeOfDay: e.target.value })}
                  />
                </Group>
                <Textarea
                  label="Description / Action"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  minRows={3}
                  autosize
                />
                <Textarea
                  label="Dialogue"
                  value={editData.dialogue}
                  onChange={(e) => setEditData({ ...editData, dialogue: e.target.value })}
                  minRows={2}
                  autosize
                />
                <Textarea
                  label="Notes"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  minRows={1}
                  autosize
                />
                <Group>
                  <Button size="xs" variant="filled" color="violet" onClick={() => saveEdit(scene.id)}>Save</Button>
                  <Button size="xs" variant="subtle" onClick={cancelEdit}>Cancel</Button>
                </Group>
              </Stack>
            ) : (
              <Stack gap="sm">
                {scene.description && (
                  <div>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">Action</Text>
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{scene.description}</Text>
                  </div>
                )}
                {scene.dialogue && (
                  <div>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">Dialogue</Text>
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{scene.dialogue}</Text>
                  </div>
                )}
                {scene.notes && (
                  <div>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">Notes</Text>
                    <Text size="sm" c="dimmed">{scene.notes}</Text>
                  </div>
                )}
                <Group>
                  <Button size="xs" variant="light" onClick={() => startEdit(scene)}>Edit</Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="grape"
                    onClick={() => onGenerateShots && onGenerateShots(scene.id)}
                    loading={generatingSceneId === scene.id}
                  >
                    {generatingSceneId === scene.id ? 'Generating...' : `Generate Shots${scene.shotCount ? ` (${scene.shotCount})` : ''}`}
                  </Button>
                  <Button size="xs" variant="subtle" color="red" onClick={() => onDeleteScene && onDeleteScene(scene.id)}>
                    Delete
                  </Button>
                </Group>
              </Stack>
            )}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
