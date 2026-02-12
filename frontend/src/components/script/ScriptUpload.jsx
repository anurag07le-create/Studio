import React, { useRef, useState } from 'react';
import { Card, Text, Group, Button, Stack, Badge, Alert, Loader } from '@mantine/core';

const ACCEPTED_FORMATS = '.pdf,.fdx,.fountain,.ftn,.txt,.text';
const FORMAT_LABELS = {
  pdf: 'PDF',
  fdx: 'Final Draft (FDX)',
  fountain: 'Fountain',
  ftn: 'Fountain',
  txt: 'Plain Text',
  text: 'Plain Text',
};

export default function ScriptUpload({ onUpload, loading, existingScript }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileSelect = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!FORMAT_LABELS[ext]) {
      alert(`Unsupported file format: .${ext}\nSupported: PDF, FDX, Fountain, TXT`);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <Stack gap="md">
      {existingScript && (
        <Alert color="blue" variant="light">
          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>Current Script: {existingScript.filename}</Text>
              <Text size="xs" c="dimmed">
                {FORMAT_LABELS[existingScript.format] || existingScript.format} · {existingScript.sceneCount || 0} scenes detected
              </Text>
            </div>
            <Badge color="green">Uploaded</Badge>
          </Group>
        </Alert>
      )}

      <Card
        withBorder
        padding="xl"
        radius="lg"
        style={{
          border: dragActive ? '2px dashed var(--mantine-color-violet-5)' : '2px dashed var(--mantine-color-gray-3)',
          background: dragActive ? 'var(--mantine-color-violet-0)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Stack align="center" gap="sm">
          <Text size="xl">📄</Text>
          <Text ta="center" fw={500}>
            {selectedFile ? selectedFile.name : 'Drop your screenplay here or click to browse'}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Supports: PDF, Final Draft (FDX), Fountain, Plain Text
          </Text>
          {selectedFile && (
            <Badge color="violet" size="lg">
              {(selectedFile.size / 1024).toFixed(1)} KB · {FORMAT_LABELS[selectedFile.name.split('.').pop().toLowerCase()] || 'Unknown'}
            </Badge>
          )}
        </Stack>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files[0]) handleFileSelect(e.target.files[0]);
          }}
        />
      </Card>

      {selectedFile && (
        <Group justify="center">
          <Button
            variant="gradient"
            gradient={{ from: '#5922C7', to: '#7C3AED' }}
            size="md"
            onClick={handleUpload}
            loading={loading}
          >
            {loading ? 'Uploading & Parsing...' : 'Upload & Parse Script'}
          </Button>
          <Button variant="subtle" color="gray" onClick={() => setSelectedFile(null)} disabled={loading}>
            Cancel
          </Button>
        </Group>
      )}

      {loading && (
        <Group justify="center" gap="sm">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">Parsing script and extracting scenes...</Text>
        </Group>
      )}
    </Stack>
  );
}
