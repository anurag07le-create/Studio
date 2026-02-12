import React, { useState, useRef } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, Textarea, Select, Slider, Switch,
  Badge, Image, Collapse, NumberInput, Grid, Tooltip, Modal, Loader, Alert,
  SegmentedControl, FileButton, Divider, ActionIcon,
} from '@mantine/core';

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 Square' },
  { value: '2:3', label: '2:3 Portrait' },
  { value: '3:2', label: '3:2 Landscape' },
  { value: '3:4', label: '3:4 Portrait' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '9:16', label: '9:16 Vertical' },
  { value: '16:9', label: '16:9 Cinematic' },
  { value: '21:9', label: '21:9 Ultra-wide' },
];

const IMAGE_SIZES = [
  { value: '1K', label: '1K (~1024px)' },
  { value: '2K', label: '2K (~2048px)' },
  { value: '4K', label: '4K (~4096px)' },
];

const MODELS = [
  { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (Best Quality, 1K-4K)' },
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Fast, 1K only)' },
];

const PERSON_GEN = [
  { value: 'allow_adult', label: 'Allow Adults' },
  { value: 'allow_all', label: 'Allow All' },
  { value: 'dont_allow', label: 'No People' },
];

const SAFETY_LEVELS = [
  { value: 'default', label: 'Default' },
  { value: 'strict', label: 'Strict' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'lenient', label: 'Lenient' },
];

const QUICK_PROMPTS = [
  { label: 'Character Turnaround', prompt: 'Create a professional character reference sheet with front view, left profile, right profile, and back view. Relaxed A-pose, clean neutral background, consistent lighting.' },
  { label: 'Portrait Close-up', prompt: 'Highly detailed character portrait, dramatic cinematic lighting, sharp focus, professional headshot quality.' },
  { label: 'Action Pose', prompt: 'Dynamic action pose, motion blur on background, dramatic angle, cinematic lighting.' },
  { label: 'Environment Concept', prompt: 'Detailed environment concept art, wide establishing shot, atmospheric lighting, rich color palette.' },
  { label: 'Storyboard Frame', prompt: 'Single storyboard frame, cinematic composition, 16:9 aspect ratio, high fidelity, no text.' },
];

export default function ImageGenPanel({
  characters = [],
  projectId,
  onGenerate,
  generating = false,
}) {
  // Prompt
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');

  // Basic settings
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [model, setModel] = useState('gemini-3-pro-image-preview');

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(null);
  const [topP, setTopP] = useState(null);
  const [topK, setTopK] = useState(null);
  const [seed, setSeed] = useState(null);
  const [personGeneration, setPersonGeneration] = useState('allow_adult');
  const [safetyLevel, setSafetyLevel] = useState('default');

  // Character binding
  const [selectedCharId, setSelectedCharId] = useState(null);

  // Reference image
  const [refImageBase64, setRefImageBase64] = useState(null);
  const [refImageMimeType, setRefImageMimeType] = useState('image/jpeg');
  const [refImagePreview, setRefImagePreview] = useState(null);

  // Result
  const [resultImages, setResultImages] = useState([]);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const handleRefImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(',')[1];
      const mime = dataUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      setRefImageBase64(base64);
      setRefImageMimeType(mime);
      setRefImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setResultImages([]);
    setResultText('');

    const payload = {
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      aspectRatio,
      imageSize,
      model,
      personGeneration,
      safetyLevel,
      temperature: temperature !== null ? temperature : undefined,
      topP: topP !== null ? topP : undefined,
      topK: topK !== null ? topK : undefined,
      seed: seed !== null ? seed : undefined,
      charId: selectedCharId || undefined,
      referenceImageBase64: refImageBase64 || undefined,
      referenceImageMimeType: refImageMimeType || undefined,
    };

    try {
      const result = await onGenerate(payload);
      if (result?.images) {
        setResultImages(result.images);
        setResultText(result.text || '');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const charOptions = [
    { value: '', label: 'None (no character context)' },
    ...characters.map(c => ({ value: c.id, label: c.name })),
  ];

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Title order={5}>Image Generator</Title>
          <Badge size="sm" color="grape" variant="light">Gemini AI</Badge>
        </Group>
      </Group>

      <Stack gap="sm">
        {/* Quick Prompt Templates */}
        <div>
          <Text size="xs" fw={500} mb={4} c="dimmed">Quick Templates</Text>
          <Group gap={6} wrap="wrap">
            {QUICK_PROMPTS.map((qp) => (
              <Badge
                key={qp.label}
                size="sm"
                variant={prompt === qp.prompt ? 'filled' : 'outline'}
                color="violet"
                style={{ cursor: 'pointer' }}
                onClick={() => setPrompt(qp.prompt)}
              >
                {qp.label}
              </Badge>
            ))}
          </Group>
        </div>

        {/* Main Prompt */}
        <Textarea
          label="Prompt"
          placeholder="Describe the image you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          minRows={3}
          autosize
          maxRows={8}
          size="sm"
        />

        {/* Negative Prompt */}
        <Textarea
          label="Negative Prompt"
          placeholder="What to avoid: blurry, low quality, text, watermark..."
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          minRows={1}
          autosize
          maxRows={3}
          size="xs"
        />

        {/* Basic Settings Row */}
        <Grid gutter="xs">
          <Grid.Col span={4}>
            <Select
              label="Aspect Ratio"
              size="xs"
              data={ASPECT_RATIOS}
              value={aspectRatio}
              onChange={setAspectRatio}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select
              label="Resolution"
              size="xs"
              data={IMAGE_SIZES}
              value={imageSize}
              onChange={setImageSize}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select
              label="Character"
              size="xs"
              data={charOptions}
              value={selectedCharId || ''}
              onChange={(v) => setSelectedCharId(v || null)}
              placeholder="Bind to character"
            />
          </Grid.Col>
        </Grid>

        {/* Reference Image Upload */}
        <Group gap="xs" align="flex-end">
          <FileButton accept="image/png,image/jpeg,image/webp" onChange={handleRefImageUpload}>
            {(props) => (
              <Button size="xs" variant="light" color="violet" {...props}>
                {refImagePreview ? 'Replace Ref Image' : 'Add Reference Image'}
              </Button>
            )}
          </FileButton>
          {refImagePreview && (
            <Group gap={6}>
              <Image
                src={refImagePreview}
                w={40}
                h={40}
                radius="sm"
                fit="cover"
                style={{ cursor: 'pointer' }}
                onClick={() => setLightboxUrl(refImagePreview)}
              />
              <Button size="xs" variant="subtle" color="red" onClick={() => {
                setRefImageBase64(null);
                setRefImagePreview(null);
              }}>
                Remove
              </Button>
            </Group>
          )}
        </Group>

        {/* Advanced Settings Toggle */}
        <Group justify="space-between">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </Button>
        </Group>

        <Collapse in={showAdvanced}>
          <Stack gap="xs" p="xs" style={{ background: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
            {/* Model Selection */}
            <Select
              label="Model"
              size="xs"
              data={MODELS}
              value={model}
              onChange={setModel}
              description="Pro = best quality, Flash = faster & cheaper"
            />

            <Grid gutter="xs">
              {/* Temperature */}
              <Grid.Col span={6}>
                <div>
                  <Group justify="space-between" mb={2}>
                    <Text size="xs" fw={500}>Temperature</Text>
                    <Text size="xs" c="dimmed">{temperature !== null ? temperature.toFixed(2) : 'Default'}</Text>
                  </Group>
                  <Group gap="xs" align="center">
                    <Slider
                      size="xs"
                      min={0}
                      max={2}
                      step={0.05}
                      value={temperature !== null ? temperature : 1.0}
                      onChange={(v) => setTemperature(v)}
                      style={{ flex: 1 }}
                      marks={[
                        { value: 0, label: '0' },
                        { value: 1, label: '1' },
                        { value: 2, label: '2' },
                      ]}
                      color="grape"
                    />
                    <ActionIcon size="xs" variant="subtle" onClick={() => setTemperature(null)}>
                      <Text size="xs">x</Text>
                    </ActionIcon>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>Lower = precise, Higher = creative</Text>
                </div>
              </Grid.Col>

              {/* Top P */}
              <Grid.Col span={6}>
                <div>
                  <Group justify="space-between" mb={2}>
                    <Text size="xs" fw={500}>Top P</Text>
                    <Text size="xs" c="dimmed">{topP !== null ? topP.toFixed(2) : 'Default'}</Text>
                  </Group>
                  <Group gap="xs" align="center">
                    <Slider
                      size="xs"
                      min={0}
                      max={1}
                      step={0.05}
                      value={topP !== null ? topP : 0.95}
                      onChange={(v) => setTopP(v)}
                      style={{ flex: 1 }}
                      marks={[
                        { value: 0, label: '0' },
                        { value: 0.5, label: '.5' },
                        { value: 1, label: '1' },
                      ]}
                      color="grape"
                    />
                    <ActionIcon size="xs" variant="subtle" onClick={() => setTopP(null)}>
                      <Text size="xs">x</Text>
                    </ActionIcon>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>Nucleus sampling threshold</Text>
                </div>
              </Grid.Col>
            </Grid>

            <Grid gutter="xs">
              {/* Top K */}
              <Grid.Col span={4}>
                <NumberInput
                  label="Top K"
                  size="xs"
                  placeholder="Default"
                  value={topK || ''}
                  onChange={(v) => setTopK(v || null)}
                  min={1}
                  max={100}
                  description="Token selection pool"
                />
              </Grid.Col>

              {/* Seed */}
              <Grid.Col span={4}>
                <NumberInput
                  label="Seed"
                  size="xs"
                  placeholder="Random"
                  value={seed || ''}
                  onChange={(v) => setSeed(v || null)}
                  min={0}
                  max={2147483647}
                  description="For reproducible results"
                />
              </Grid.Col>

              {/* Person Generation */}
              <Grid.Col span={4}>
                <Select
                  label="People"
                  size="xs"
                  data={PERSON_GEN}
                  value={personGeneration}
                  onChange={setPersonGeneration}
                  description="Person generation policy"
                />
              </Grid.Col>
            </Grid>

            {/* Safety Level */}
            <div>
              <Text size="xs" fw={500} mb={4}>Safety Filter</Text>
              <SegmentedControl
                size="xs"
                data={SAFETY_LEVELS}
                value={safetyLevel}
                onChange={setSafetyLevel}
                fullWidth
              />
            </div>
          </Stack>
        </Collapse>

        {/* Error display */}
        {error && (
          <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Generate Button */}
        <Button
          fullWidth
          size="md"
          variant="gradient"
          gradient={{ from: '#5922C7', to: '#7C3AED' }}
          onClick={handleGenerate}
          loading={generating}
          disabled={!prompt.trim()}
        >
          {generating ? 'Generating...' : 'Generate Image'}
        </Button>

        {/* Results */}
        {resultImages.length > 0 && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>Generated Images</Text>
              <Badge size="xs" color="green">{resultImages.length} image(s)</Badge>
            </Group>
            <Grid gutter="xs">
              {resultImages.map((img, i) => (
                <Grid.Col key={i} span={resultImages.length === 1 ? 12 : 6}>
                  <Card withBorder padding={0} radius="sm" style={{ overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => setLightboxUrl(img)}>
                    <Image src={img} fit="contain" h={280} style={{ background: 'var(--mantine-color-gray-1)' }} />
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
            {resultText && (
              <Text size="xs" c="dimmed">{resultText}</Text>
            )}
          </Stack>
        )}
      </Stack>

      {/* Lightbox */}
      <Modal
        opened={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        size="xl"
        centered
        padding="xs"
        withCloseButton
        title="Generated Image"
      >
        {lightboxUrl && (
          <Image src={lightboxUrl} fit="contain" style={{ maxHeight: '80vh' }} />
        )}
      </Modal>
    </Card>
  );
}
