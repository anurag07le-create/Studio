import React, { useState } from 'react';
import * as v2Api from '../api/v2';
import {
  Title, Text, Textarea, Button, Group, Stack, SimpleGrid, Card, Image, Badge,
  NumberInput, Alert, Modal, Select, TextInput, ActionIcon,
} from '@mantine/core';

const IMAGE_PROVIDERS = [
  { value: 'flux', label: 'Flux (Black Forest Labs)', description: 'High-quality diffusion models' },
  { value: 'zimage', label: 'Z-Image Turbo (Alibaba)', description: 'Ultra-fast ~1s generation' },
  { value: 'qwen', label: 'Qwen Image (Alibaba)', description: '26+ languages, text rendering' },
  { value: 'nano_banana', label: 'Nano Banana (Gemini Flash)', description: 'Google Gemini 2.5 Flash' },
  { value: 'faceswap', label: 'FaceSwap', description: 'AI face swapping' },
];

const FLUX_MODELS = [
  { value: 'Qubico/flux1-dev', label: 'Flux 1 Dev (Quality)' },
  { value: 'Qubico/flux1-schnell', label: 'Flux 1 Schnell (Fast)' },
  { value: 'Qubico/flux1-dev-advanced', label: 'Flux 1 Dev Advanced' },
];

const FLUX_TASK_TYPES = [
  { value: 'txt2img', label: 'Text to Image' },
  { value: 'img2img', label: 'Image to Image' },
  { value: 'fill-inpaint', label: 'Inpaint' },
  { value: 'fill-outpaint', label: 'Outpaint' },
  { value: 'redux-variation', label: 'Variation (Redux)' },
];

const QWEN_TASK_TYPES = [
  { value: 'txt2img', label: 'Text to Image' },
  { value: 'image-edit', label: 'Image Edit' },
];

export default function ImageGenerationPage() {
  // Standalone image generation state
  const [imgProvider, setImgProvider] = useState('flux');
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  const [imgResult, setImgResult] = useState(null);
  const [imgError, setImgError] = useState(null);
  const [imgHistory, setImgHistory] = useState([]);
  // Flux-specific
  const [fluxModel, setFluxModel] = useState('Qubico/flux1-dev');
  const [fluxTaskType, setFluxTaskType] = useState('txt2img');
  const [imgWidth, setImgWidth] = useState(1024);
  const [imgHeight, setImgHeight] = useState(1024);
  const [imgInputImage, setImgInputImage] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  // Qwen-specific
  const [qwenTaskType, setQwenTaskType] = useState('txt2img');
  // FaceSwap-specific
  const [swapImage, setSwapImage] = useState('');
  const [targetImage, setTargetImage] = useState('');
  // Preview modal
  const [previewImage, setPreviewImage] = useState(null);

  const handleDownloadImage = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || 'image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageGenerate = async () => {
    if (imgProvider !== 'faceswap' && !imgPrompt.trim()) return;
    if (imgProvider === 'faceswap' && (!swapImage || !targetImage)) return;
    setImgLoading(true);
    setImgError(null);
    setImgResult(null);
    try {
      const opts = {};

      if (imgProvider === 'flux') {
        opts.model = fluxModel;
        opts.task_type = fluxTaskType;
        opts.width = imgWidth;
        opts.height = imgHeight;
        if (negativePrompt) opts.negative_prompt = negativePrompt;
        if (imgInputImage && fluxTaskType !== 'txt2img') opts.image = imgInputImage;
      } else if (imgProvider === 'zimage') {
        opts.width = imgWidth;
        opts.height = imgHeight;
        if (negativePrompt) opts.negative_prompt = negativePrompt;
      } else if (imgProvider === 'qwen') {
        opts.task_type = qwenTaskType;
        if (qwenTaskType === 'image-edit' && imgInputImage) opts.image = imgInputImage;
      } else if (imgProvider === 'nano_banana') {
        // simple txt2img
      } else if (imgProvider === 'faceswap') {
        opts.target_image = targetImage;
        opts.swap_image = swapImage;
      }

      const res = await v2Api.generateStandaloneImage({
        prompt: imgPrompt,
        provider: imgProvider,
        options: opts,
      });
      setImgResult(res);
      setImgHistory((prev) => [{ imageUrl: res.imageUrl, provider: res.provider || imgProvider, prompt: imgPrompt, createdAt: new Date().toISOString() }, ...prev].slice(0, 12));
    } catch (err) {
      setImgError(err.message || 'Failed to generate image');
    } finally {
      setImgLoading(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <Group justify="space-between" align="center" mb="lg">
        <div>
          <Title order={2} className="section-title" mb={4}>Image Generation</Title>
          <Text size="sm" c="dimmed">Generate standalone AI images with Flux, Z-Image, Qwen, Nano Banana, and FaceSwap</Text>
        </div>
        <Badge size="lg" color="blue" variant="light">AI Image</Badge>
      </Group>

      {/* ─── AI Image Generator (Multi-Provider) ─────────────────────── */}
      <Card className="glass-panel" withBorder padding="lg" radius="xl" shadow="xl" mb="xl">
        <Group justify="space-between" align="center" mb="md">
          <Title order={3} className="section-title">AI Image Generator</Title>
          <Badge size="sm" variant="dot" color="blue">PiAPI</Badge>
        </Group>
        <Stack gap="md">
          {/* Provider selector */}
          <Select
            label="Provider"
            data={IMAGE_PROVIDERS}
            value={imgProvider}
            onChange={(val) => setImgProvider(val || 'flux')}
            description={IMAGE_PROVIDERS.find((p) => p.value === imgProvider)?.description}
          />

          {/* Prompt (hidden for faceswap) */}
          {imgProvider !== 'faceswap' && (
            <Textarea
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder={
                imgProvider === 'qwen'
                  ? 'Describe the image (supports 26+ languages)...'
                  : 'Describe the image you want to generate, e.g.: A futuristic cityscape at sunset with flying vehicles...'
              }
              minRows={2}
              maxRows={4}
              autosize
            />
          )}

          {/* ── Flux-specific options ── */}
          {imgProvider === 'flux' && (
            <Group align="flex-end" gap="md" wrap="wrap">
              <Select label="Model" data={FLUX_MODELS} value={fluxModel}
                onChange={(val) => setFluxModel(val || 'Qubico/flux1-dev')} maw={260} />
              <Select label="Task Type" data={FLUX_TASK_TYPES} value={fluxTaskType}
                onChange={(val) => setFluxTaskType(val || 'txt2img')} maw={200} />
              <NumberInput label="Width" value={imgWidth} onChange={(val) => setImgWidth(Number(val) || 1024)} min={256} max={2048} step={64} maw={120} />
              <NumberInput label="Height" value={imgHeight} onChange={(val) => setImgHeight(Number(val) || 1024)} min={256} max={2048} step={64} maw={120} />
            </Group>
          )}
          {imgProvider === 'flux' && (
            <Group align="flex-end" gap="md" wrap="wrap">
              <TextInput label="Negative Prompt" placeholder="What to exclude from the image..."
                value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                style={{ flex: 1, minWidth: 200 }} />
              {fluxTaskType !== 'txt2img' && (
                <TextInput label="Input Image URL"
                  placeholder="https://... (required for img2img, inpaint, outpaint, redux)"
                  value={imgInputImage} onChange={(e) => setImgInputImage(e.target.value)}
                  style={{ flex: 1, minWidth: 260 }} />
              )}
            </Group>
          )}

          {/* ── Z-Image Turbo options ── */}
          {imgProvider === 'zimage' && (
            <Group align="flex-end" gap="md" wrap="wrap">
              <NumberInput label="Width" value={imgWidth} onChange={(val) => setImgWidth(Number(val) || 1024)} min={256} max={2048} step={64} maw={120} />
              <NumberInput label="Height" value={imgHeight} onChange={(val) => setImgHeight(Number(val) || 1024)} min={256} max={2048} step={64} maw={120} />
              <TextInput label="Negative Prompt" placeholder="What to exclude..."
                value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                style={{ flex: 1, minWidth: 200 }} />
            </Group>
          )}

          {/* ── Qwen Image options ── */}
          {imgProvider === 'qwen' && (
            <Group align="flex-end" gap="md" wrap="wrap">
              <Select label="Task Type" data={QWEN_TASK_TYPES} value={qwenTaskType}
                onChange={(val) => setQwenTaskType(val || 'txt2img')} maw={200} />
              {qwenTaskType === 'image-edit' && (
                <TextInput label="Input Image URL" placeholder="https://... (image to edit)"
                  value={imgInputImage} onChange={(e) => setImgInputImage(e.target.value)}
                  style={{ flex: 1, minWidth: 260 }} />
              )}
            </Group>
          )}

          {/* ── Nano Banana — no extra options ── */}
          {imgProvider === 'nano_banana' && (
            <Text size="xs" c="dimmed">Powered by Google Gemini 2.5 Flash. Just enter a prompt above.</Text>
          )}

          {/* ── FaceSwap options ── */}
          {imgProvider === 'faceswap' && (
            <Stack gap="sm">
              <Text size="sm" c="dimmed">Provide two image URLs: the face to swap and the target image.</Text>
              <Group align="flex-end" gap="md" wrap="wrap" grow>
                <TextInput label="Swap Image URL (face source)"
                  placeholder="https://... URL of the face to use"
                  value={swapImage} onChange={(e) => setSwapImage(e.target.value)} required />
                <TextInput label="Target Image URL"
                  placeholder="https://... URL of the target image"
                  value={targetImage} onChange={(e) => setTargetImage(e.target.value)} required />
              </Group>
            </Stack>
          )}

          {/* Generate button */}
          <Group justify="flex-end">
            <Button variant="gradient" gradient={{ from: '#2563EB', to: '#7C3AED' }}
              onClick={handleImageGenerate} loading={imgLoading}
              disabled={imgProvider === 'faceswap' ? !swapImage || !targetImage : !imgPrompt.trim()}
            >
              {imgLoading ? 'Generating...' : 'Generate Image'}
            </Button>
          </Group>

          {imgError && <Alert color="red" variant="light">{imgError}</Alert>}
          {imgResult && (
            <Card withBorder radius="md" padding="sm" className="glass-panel" style={{ maxWidth: 520 }}>
              <div style={{ position: 'relative' }}>
                <Image src={imgResult.imageUrl} alt="Generated" radius="md" fit="contain" style={{ maxHeight: 480 }} />
                <ActionIcon variant="filled" color="dark" size="md" radius="md"
                  style={{ position: 'absolute', top: 8, right: 8, opacity: 0.8 }}
                  onClick={() => handleDownloadImage(imgResult.imageUrl, `${imgProvider}_${Date.now()}.png`)}
                  title="Download image"
                >
                  <span style={{ fontSize: 14 }}>&#11015;</span>
                </ActionIcon>
              </div>
              <Text size="xs" c="dimmed" mt="xs">Provider: {imgResult.provider || imgProvider}{imgResult.model ? ` / ${imgResult.model}` : ''}</Text>
            </Card>
          )}
        </Stack>
      </Card>

      {/* ─── Generation History ─────────────────────── */}
      {imgHistory.length > 0 && (
        <Card className="glass-panel" withBorder padding="lg" radius="xl" shadow="xl">
          <Title order={3} className="section-title" mb="md">Recent Generations</Title>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="sm">
            {imgHistory.map((item, idx) => (
              <Card key={idx} withBorder radius="md" padding="xs" style={{ cursor: 'pointer' }}
                onClick={() => setPreviewImage({ url: item.imageUrl, name: `${item.provider || 'img'}_${idx}.png` })}
              >
                <Image src={item.imageUrl} alt={`Generated ${idx}`} height={140} radius="sm" fit="cover" />
                <Group gap={4} mt={4}>
                  <Badge size="xs" variant="light" color="blue">{item.provider}</Badge>
                  <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{item.prompt || ''}</Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Card>
      )}

      {/* Image Preview Modal */}
      <Modal opened={!!previewImage} onClose={() => setPreviewImage(null)} size="xl" radius="lg" centered padding="md" withCloseButton classNames={{ body: 'preview-image-modal' }}>
        {previewImage && (
          <div style={{ position: 'relative' }}>
            <ActionIcon variant="transparent" color="gray" size="lg" radius="md"
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
              onClick={() => handleDownloadImage(previewImage.url, previewImage.name)}
              title="Download image"
            >
              <span style={{ fontSize: 16 }}>&#11015;</span>
            </ActionIcon>
            <Image src={previewImage.url} alt="Preview" radius="md" fit="cover" style={{ maxHeight: '80vh', width: '100%' }} />
          </div>
        )}
      </Modal>
    </>
  );
}
