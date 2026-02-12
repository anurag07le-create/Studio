import React, { useState } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, SegmentedControl, Badge,
  Checkbox, Alert, Loader,
} from '@mantine/core';
import { saveAs } from 'file-saver';
import * as api from '../../api/v2';

export default function ExportPanel({ projectId, shotCount = 0, sceneCount = 0 }) {
  const [format, setFormat] = useState('pdf');
  const [layout, setLayout] = useState('grid');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setResult(null);

    try {
      let res;
      if (format === 'pdf') {
        res = await api.exportPDF(projectId, { layout, includeNotes });
      } else if (format === 'png') {
        res = await api.exportPNG(projectId);
      } else if (format === 'json') {
        res = await api.exportJSON(projectId);
      }
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!result?.url) return;
    // Construct the download URL (proxied through Vite or direct)
    const downloadUrl = result.url;
    window.open(downloadUrl, '_blank');
  };

  const handleDownloadJSON = () => {
    if (!result?.data) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    saveAs(blob, result.filename || 'project.json');
  };

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={5}>Export Project</Title>
          <Badge size="sm" variant="light" color="blue">
            {sceneCount} scenes · {shotCount} shots
          </Badge>
        </Group>

        <Text size="xs" c="dimmed">
          Export your storyboard as PDF, image sequence, or project data.
        </Text>

        <SegmentedControl
          value={format}
          onChange={setFormat}
          data={[
            { label: 'PDF Storyboard', value: 'pdf' },
            { label: 'PNG Sequence', value: 'png' },
            { label: 'Project JSON', value: 'json' },
          ]}
          size="xs"
          fullWidth
        />

        {format === 'pdf' && (
          <Stack gap="xs">
            <Text size="xs" fw={500}>PDF Layout</Text>
            <SegmentedControl
              value={layout}
              onChange={setLayout}
              data={[
                { label: 'Grid (2-up)', value: 'grid' },
                { label: 'Full Page', value: 'single' },
              ]}
              size="xs"
            />
            <Checkbox
              size="xs"
              label="Include scene notes & descriptions"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
            />
          </Stack>
        )}

        {format === 'png' && (
          <Text size="xs" c="dimmed">
            Downloads all shot images as a numbered ZIP file. Only shots with generated images are included.
          </Text>
        )}

        {format === 'json' && (
          <Text size="xs" c="dimmed">
            Exports the full project structure (scenes, shots, characters, locations, style lock).
            Can be re-imported to create a copy.
          </Text>
        )}

        {error && (
          <Alert color="red" variant="light" size="xs" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {result && (
          <Alert color="green" variant="light" size="xs">
            <Group justify="space-between" align="center">
              <Text size="xs">Export ready: {result.filename}</Text>
              {format === 'json' ? (
                <Button size="xs" variant="light" onClick={handleDownloadJSON}>
                  Download JSON
                </Button>
              ) : (
                <Button size="xs" variant="light" onClick={handleDownload}>
                  Download
                </Button>
              )}
            </Group>
          </Alert>
        )}

        <Button
          color="violet"
          onClick={handleExport}
          loading={exporting}
          disabled={format === 'png' && shotCount === 0}
          fullWidth
        >
          {exporting ? 'Generating...' : `Export as ${format.toUpperCase()}`}
        </Button>
      </Stack>
    </Card>
  );
}
