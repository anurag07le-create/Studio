import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, Textarea, Badge, ScrollArea, Loader,
} from '@mantine/core';
import { getSocket, connectSocket } from '../../services/socket';

export default function WritingAssistant({ projectId, onInsertText }) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const socket = connectSocket();

    const handleChunk = (data) => {
      if (data.type === 'chunk') {
        setCurrentStream((prev) => prev + data.text);
      } else if (data.type === 'done') {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.fullText }]);
        setCurrentStream('');
        setStreaming(false);
      } else if (data.type === 'error') {
        setMessages((prev) => [...prev, { role: 'error', text: data.error }]);
        setCurrentStream('');
        setStreaming(false);
      }
    };

    socket.on('assistant:chunk', handleChunk);
    return () => {
      socket.off('assistant:chunk', handleChunk);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, currentStream]);

  const handleSend = async () => {
    if (!prompt.trim() || streaming) return;

    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setStreaming(true);
    setCurrentStream('');

    try {
      await fetch(`/api/v2/projects/${projectId}/assistant/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: '' }),
      });
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'error', text: err.message }]);
      setStreaming(false);
    }

    setPrompt('');
  };

  const handleInsert = (text) => {
    onInsertText?.(text);
  };

  return (
    <Card withBorder radius="md" padding="md" h="100%">
      <Stack gap="sm" h="100%">
        <Group justify="space-between">
          <Group gap="xs">
            <Title order={5}>AI Assistant</Title>
            <Badge size="xs" color="violet" variant="light">Gemini</Badge>
          </Group>
          {streaming && <Loader size="xs" />}
        </Group>

        <ScrollArea
          h={300}
          viewportRef={scrollRef}
          style={{ flex: 1 }}
          styles={{ viewport: { padding: '0 4px' } }}
        >
          <Stack gap="xs">
            {messages.length === 0 && !streaming && (
              <Text size="xs" c="dimmed" ta="center" py="xl">
                Ask the AI to help write scenes, improve dialogue, suggest camera movements, or brainstorm ideas.
              </Text>
            )}
            {messages.map((msg, i) => (
              <Card
                key={i}
                padding="xs"
                radius="sm"
                style={{
                  background: msg.role === 'user'
                    ? 'var(--mantine-color-violet-0)'
                    : msg.role === 'error'
                      ? 'var(--mantine-color-red-0)'
                      : 'var(--mantine-color-gray-0)',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                }}
              >
                <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Text>
                {msg.role === 'assistant' && onInsertText && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="violet"
                    mt={4}
                    onClick={() => handleInsert(msg.text)}
                  >
                    Insert into scene
                  </Button>
                )}
              </Card>
            ))}
            {streaming && currentStream && (
              <Card padding="xs" radius="sm" style={{ background: 'var(--mantine-color-gray-0)', maxWidth: '90%' }}>
                <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{currentStream}</Text>
                <Loader size="xs" mt={4} />
              </Card>
            )}
          </Stack>
        </ScrollArea>

        <Group gap="xs" align="flex-end">
          <Textarea
            size="xs"
            placeholder="Write a scene about..., improve this dialogue..., suggest a camera angle for..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex: 1 }}
            minRows={1}
            maxRows={3}
            autosize
          />
          <Button
            size="xs"
            color="violet"
            onClick={handleSend}
            loading={streaming}
            disabled={!prompt.trim()}
          >
            Send
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
