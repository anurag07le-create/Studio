import React, { useState, useRef } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, TextInput, Textarea, Badge,
  Image, Loader, Collapse, FileButton, Modal, Tooltip,
} from '@mantine/core';

export default function CharacterPanel({
  characters = [],
  onCreateCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onGenerateRefSheet,
  onUploadImage,
  generatingRefId,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', traits: {} });
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingCharId, setUploadingCharId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const resetForm = () => {
    setForm({ name: '', description: '', traits: {} });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      onUpdateCharacter?.(editingId, form);
      setEditingId(null);
    } else {
      onCreateCharacter?.(form);
    }
    resetForm();
  };

  const startEdit = (char) => {
    setEditingId(char.id);
    setForm({
      name: char.name || '',
      description: char.description || '',
      traits: char.traits || {},
    });
    setShowForm(true);
  };

  const handleImageUpload = async (charId, file) => {
    if (!file) return;
    setUploadingCharId(charId);
    try {
      await onUploadImage?.(charId, file);
    } finally {
      setUploadingCharId(null);
    }
  };

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Title order={5}>Characters</Title>
          <Badge size="sm" variant="light">{characters.length}</Badge>
        </Group>
        <Button size="xs" variant="light" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Cancel' : '+ Add'}
        </Button>
      </Group>

      <Collapse in={showForm}>
        <Stack gap="xs" mb="sm" p="xs" style={{ background: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
          <TextInput
            size="xs"
            label="Character Name"
            placeholder="e.g., Neon Cat"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            size="xs"
            label="Description"
            placeholder="Physical appearance, clothing, distinctive features..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            minRows={2}
            autosize
          />
          <Group grow>
            <TextInput size="xs" label="Hair" placeholder="Color/style"
              value={form.traits.hair || ''}
              onChange={(e) => setForm({ ...form, traits: { ...form.traits, hair: e.target.value } })}
            />
            <TextInput size="xs" label="Build" placeholder="Body type"
              value={form.traits.build || ''}
              onChange={(e) => setForm({ ...form, traits: { ...form.traits, build: e.target.value } })}
            />
          </Group>
          <Group grow>
            <TextInput size="xs" label="Clothing" placeholder="What they wear"
              value={form.traits.clothing || ''}
              onChange={(e) => setForm({ ...form, traits: { ...form.traits, clothing: e.target.value } })}
            />
            <TextInput size="xs" label="Features" placeholder="Unique details"
              value={form.traits.distinguishing_features || ''}
              onChange={(e) => setForm({ ...form, traits: { ...form.traits, distinguishing_features: e.target.value } })}
            />
          </Group>
          <Group justify="flex-end">
            <Button size="xs" variant="subtle" onClick={resetForm}>Cancel</Button>
            <Button size="xs" color="violet" onClick={handleSubmit}>
              {editingId ? 'Update' : 'Add Character'}
            </Button>
          </Group>
        </Stack>
      </Collapse>

      <Stack gap="xs">
        {characters.map((char) => (
          <Card key={char.id} withBorder padding="xs" radius="sm">
            <Group gap="xs" wrap="nowrap" align="flex-start">
              {/* Character image: shows uploaded image, generated ref sheet, or placeholder */}
              <div style={{ flexShrink: 0 }}>
                {char.uploadedImageUrl ? (
                  <Tooltip label="Click to view full size">
                    <Image
                      src={char.uploadedImageUrl}
                      w={72}
                      h={72}
                      radius="sm"
                      fit="cover"
                      style={{ cursor: 'pointer', border: '2px solid var(--mantine-color-violet-3)' }}
                      onClick={() => setLightboxUrl(char.uploadedImageUrl)}
                    />
                  </Tooltip>
                ) : char.referenceImageUrl ? (
                  <Tooltip label="Click to view full size">
                    <Image
                      src={char.referenceImageUrl}
                      w={72}
                      h={72}
                      radius="sm"
                      fit="cover"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setLightboxUrl(char.referenceImageUrl)}
                    />
                  </Tooltip>
                ) : (
                  <div style={{
                    width: 72, height: 72, borderRadius: 8,
                    background: 'var(--mantine-color-gray-1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Text size="xl">👤</Text>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Group gap={6} align="center">
                  <Text fw={600} size="sm" truncate>{char.name}</Text>
                  {char.uploadedImageUrl && (
                    <Badge size="xs" color="violet" variant="light">Image</Badge>
                  )}
                  {char.referenceImageUrl && (
                    <Badge size="xs" color="teal" variant="light">Ref Sheet</Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>{char.description || 'No description'}</Text>
                {char.traits && (
                  <Group gap={4} mt={2}>
                    {Object.entries(char.traits).filter(([_, v]) => v).slice(0, 3).map(([k, v]) => (
                      <Badge key={k} size="xs" variant="outline" color="gray">{v}</Badge>
                    ))}
                  </Group>
                )}
              </div>
            </Group>

            {/* Action buttons */}
            <Group gap="xs" mt="xs" justify="flex-end" wrap="wrap">
              <FileButton
                accept="image/png,image/jpeg,image/webp"
                onChange={(file) => handleImageUpload(char.id, file)}
              >
                {(props) => (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="violet"
                    loading={uploadingCharId === char.id}
                    {...props}
                  >
                    {char.uploadedImageUrl ? 'Replace Image' : 'Upload Image'}
                  </Button>
                )}
              </FileButton>
              <Button
                size="xs"
                variant="subtle"
                color="grape"
                onClick={() => onGenerateRefSheet?.(char.id)}
                loading={generatingRefId === char.id}
              >
                {char.referenceImageUrl ? 'Regen Ref Sheet' : 'Gen Ref Sheet'}
              </Button>
              <Button size="xs" variant="subtle" onClick={() => startEdit(char)}>Edit</Button>
              <Button size="xs" variant="subtle" color="red" onClick={() => onDeleteCharacter?.(char.id)}>Delete</Button>
            </Group>

            {/* Reference sheet preview (if generated) */}
            {char.referenceImageUrl && (
              <div
                style={{ marginTop: 8, cursor: 'pointer', borderRadius: 8, overflow: 'hidden' }}
                onClick={() => setLightboxUrl(char.referenceImageUrl)}
              >
                <Image
                  src={char.referenceImageUrl}
                  radius="sm"
                  fit="contain"
                  h={160}
                  style={{ background: 'var(--mantine-color-gray-0)' }}
                />
                <Text size="xs" c="dimmed" ta="center" mt={4}>Reference Sheet (click to enlarge)</Text>
              </div>
            )}
          </Card>
        ))}
        {characters.length === 0 && !showForm && (
          <Text size="xs" c="dimmed" ta="center" py="xs">No characters yet. Add one to ensure visual consistency.</Text>
        )}
      </Stack>

      {/* Lightbox modal for viewing full-size images */}
      <Modal
        opened={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        size="xl"
        centered
        padding="xs"
        withCloseButton
        title="Character Reference"
      >
        {lightboxUrl && (
          <Image
            src={lightboxUrl}
            fit="contain"
            style={{ maxHeight: '75vh' }}
          />
        )}
      </Modal>
    </Card>
  );
}
