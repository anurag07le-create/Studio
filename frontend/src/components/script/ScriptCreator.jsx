import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, Textarea, Badge, Select,
  Loader, Alert, Divider,
} from '@mantine/core';
import { onScriptGenerate } from '../../services/socket';
import * as api from '../../api/v2';

const GENRE_OPTIONS = [
  { value: 'thriller', label: 'Thriller' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'drama', label: 'Drama' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'horror', label: 'Horror' },
  { value: 'romance', label: 'Romance' },
  { value: 'action', label: 'Action' },
  { value: 'fantasy', label: 'Fantasy' },
];

const TONE_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'lighthearted', label: 'Lighthearted' },
  { value: 'intense', label: 'Intense' },
  { value: 'whimsical', label: 'Whimsical' },
  { value: 'gritty', label: 'Gritty' },
  { value: 'emotional', label: 'Emotional' },
];

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short Film (5-10 scenes)' },
  { value: 'medium', label: 'Medium (10-20 scenes)' },
  { value: 'feature', label: 'Feature (20-40 scenes)' },
];

export default function ScriptCreator({ projectId, existingScript, onScriptSaved, onGenerating }) {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('drama');
  const [tone, setTone] = useState('intense');
  const [length, setLength] = useState('medium');
  const [generating, setGenerating] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);

  // Listen for script generation stream events
  useEffect(() => {
    const cleanup = onScriptGenerate((data) => {
      if (data.type === 'chunk') {
        setScriptText((prev) => prev + data.text);
      } else if (data.type === 'done') {
        setScriptText(data.fullText);
        setGenerating(false);
        onGenerating?.(false);
      } else if (data.type === 'error') {
        setError(data.error || 'Script generation failed');
        setGenerating(false);
        onGenerating?.(false);
      }
    });
    return cleanup;
  }, [onGenerating]);

  // Auto-scroll editor to bottom during generation
  useEffect(() => {
    if (generating && editorRef.current) {
      const textarea = editorRef.current.querySelector('textarea');
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }
  }, [scriptText, generating]);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setError(null);
    setGenerating(true);
    setScriptText('');
    onGenerating?.(true);

    try {
      await api.generateScript(projectId, { prompt, genre, tone, length });
    } catch (err) {
      setError(err.message || 'Failed to start script generation');
      setGenerating(false);
      onGenerating?.(false);
    }
  };

  const handleSaveAndParse = async () => {
    if (!scriptText.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const result = await api.saveScriptText(projectId, {
        text: scriptText,
        title: '',
      });
      onScriptSaved?.(result);
    } catch (err) {
      setError(err.message || 'Failed to save script');
    } finally {
      setSaving(false);
    }
  };

  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const charCount = scriptText.length;

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {existingScript && (
        <Alert color="blue" variant="light">
          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>Current Script: {existingScript.filename}</Text>
              <Text size="xs" c="dimmed">
                {existingScript.sceneCount || 0} scenes detected — generating or saving a new script will replace it
              </Text>
            </div>
            <Badge color="green">Active</Badge>
          </Group>
        </Alert>
      )}

      {/* AI Script Generator */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Title order={4}>AI Script Generator</Title>
              <Badge size="xs" color="violet" variant="light">Gemini</Badge>
            </Group>
            {generating && <Loader size="xs" />}
          </Group>

          <Textarea
            placeholder="Describe your story idea... e.g., 'A lonely astronaut discovers a sentient plant on Mars that communicates through bioluminescent patterns. As Earth loses contact, they must decide between following orders to return or staying to protect this new life form.'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            minRows={3}
            maxRows={6}
            autosize
            disabled={generating}
          />

          <Group gap="sm" grow>
            <Select
              label="Genre"
              data={GENRE_OPTIONS}
              value={genre}
              onChange={setGenre}
              size="sm"
              disabled={generating}
            />
            <Select
              label="Tone"
              data={TONE_OPTIONS}
              value={tone}
              onChange={setTone}
              size="sm"
              disabled={generating}
            />
            <Select
              label="Length"
              data={LENGTH_OPTIONS}
              value={length}
              onChange={setLength}
              size="sm"
              disabled={generating}
            />
          </Group>

          <Group justify="flex-end">
            <Button
              variant="gradient"
              gradient={{ from: '#5922C7', to: '#7C3AED' }}
              onClick={handleGenerate}
              loading={generating}
              disabled={!prompt.trim()}
            >
              {generating ? 'Generating Screenplay...' : 'Generate Script'}
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Screenplay Editor */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Title order={4}>Screenplay Editor</Title>
              {scriptText && (
                <Badge size="xs" color="gray" variant="light">
                  {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
                </Badge>
              )}
            </Group>
            {generating && (
              <Badge color="violet" variant="light" size="sm">
                Writing...
              </Badge>
            )}
          </Group>

          <Text size="xs" c="dimmed">
            {generating
              ? 'AI is writing your screenplay — text will appear below in real-time...'
              : scriptText
                ? 'Review and edit your screenplay, then click "Save & Parse" to extract scenes.'
                : 'Generate a script with AI above, or write your own screenplay here. Use INT./EXT. scene headings for best results.'}
          </Text>

          <div ref={editorRef}>
            <Textarea
              placeholder={'Title: My Screenplay\nCredit: Written by\nAuthor: Your Name\n\nINT. COFFEE SHOP - MORNING\n\nA quiet coffee shop bathed in warm sunlight...\n\nJANE\nI\'ve been thinking about what you said.\n\nMARK\n(hesitant)\nAnd?\n\nCUT TO:\n\nEXT. CITY STREET - CONTINUOUS\n\nJane walks out into the busy street...'}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              minRows={20}
              maxRows={60}
              autosize
              disabled={generating}
              styles={{
                input: {
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                },
              }}
            />
          </div>

          <Divider />

          <Group justify="space-between">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setScriptText('')}
              disabled={!scriptText || generating || saving}
            >
              Clear
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: '#5922C7', to: '#7C3AED' }}
              onClick={handleSaveAndParse}
              loading={saving}
              disabled={!scriptText.trim() || generating}
            >
              {saving ? 'Saving & Parsing...' : 'Save & Parse Script'}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
