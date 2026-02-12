import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  listVideoLogsApi,
  deleteVideoLogApi,
  clearVideoLogsApi,
  listStoryboardLogsApi,
  deleteStoryboardLogApi,
  clearStoryboardLogsApi,
} from './api';
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  Modal,
  ScrollArea,
  Table,
  Image,
  Code,
  Accordion,
  Alert,
  Loader,
  Tabs,
} from '@mantine/core';

const statusColors = {
  started: 'blue',
  generating: 'yellow',
  stitching: 'orange',
  completed: 'green',
  error: 'red',
};

function VideoLogs({ onBack }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate('/'));
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('video'); // video | storyboard

  const fetchLogs = async () => {
    setLoading(true);
    setSelectedLog(null);
    setError(null);
    try {
      const data = activeTab === 'video' ? await listVideoLogsApi() : await listStoryboardLogsApi();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleDelete = async (id) => {
    try {
      if (activeTab === 'video') {
        await deleteVideoLogApi(id);
      } else {
        await deleteStoryboardLogApi(id);
      }
      setLogs(logs.filter((l) => l.id !== id));
      if (selectedLog?.id === id) setSelectedLog(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all logs?')) return;
    try {
      if (activeTab === 'video') {
        await clearVideoLogsApi();
      } else {
        await clearStoryboardLogsApi();
      }
      setLogs([]);
      setSelectedLog(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const isVideo = activeTab === 'video';

  const exportLog = (log) => {
    const exportData =
      activeTab === 'video'
        ? {
            id: log.id,
            createdAt: log.createdAt,
            status: log.status,
            duration: log.duration,
            durationFormatted: formatDuration(log.duration),
            errorMessage: log.errorMessage || null,
            finalVideoUrl: log.finalVideoUrl || null,
            storyboard: log.storyboard?.map((shot) => ({
              shot: shot.shot,
              description: shot.description,
              prompt: shot.prompt,
              shotStory: shot.shotStory || null,
              duration: shot.duration,
              heroSubject: shot.heroSubject || null,
            })) || [],
            transitionPlans: log.transitionPlans?.map((plan) => ({
              index: plan.index,
              fromShot: plan.shotA?.shot,
              toShot: plan.shotB?.shot || 'END',
              prompt: plan.prompt,
              duration: plan.duration,
              isClosing: plan.isClosing || false,
            })) || [],
            clipResults: log.clipResults?.map((clip) => ({
              index: clip.index,
              duration: clip.duration,
              prompt: clip.prompt,
              videoPath: clip.videoPath,
            })) || [],
          }
        : {
            id: log.id,
            createdAt: log.createdAt,
            status: log.status,
            duration: log.duration,
            durationFormatted: formatDuration(log.duration),
            errorMessage: log.errorMessage || null,
            sentence: log.sentence,
            style: log.style,
            requestedShots: log.requestedShots,
            generatedShots: log.generatedShots,
            model: log.model,
            storyboard: log.storyboard?.map((shot) => ({
              shot: shot.shot,
              description: shot.description,
              prompt: shot.prompt,
              shotStory: shot.shotStory || null,
              duration: shot.duration,
              heroSubject: shot.heroSubject || null,
              imageUrl: shot.imageUrl || null,
            })) || [],
          };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_log_${log.id}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllLogs = () => {
    const exportData =
      activeTab === 'video'
        ? logs.map((log) => ({
            id: log.id,
            createdAt: log.createdAt,
            status: log.status,
            duration: log.duration,
            durationFormatted: formatDuration(log.duration),
            errorMessage: log.errorMessage || null,
            finalVideoUrl: log.finalVideoUrl || null,
            storyboard: log.storyboard?.map((shot) => ({
              shot: shot.shot,
              description: shot.description,
              prompt: shot.prompt,
              shotStory: shot.shotStory || null,
              duration: shot.duration,
              heroSubject: shot.heroSubject || null,
            })) || [],
            transitionPlans: log.transitionPlans?.map((plan) => ({
              index: plan.index,
              fromShot: plan.shotA?.shot,
              toShot: plan.shotB?.shot || 'END',
              prompt: plan.prompt,
              duration: plan.duration,
              isClosing: plan.isClosing || false,
            })) || [],
            clipResults: log.clipResults?.map((clip) => ({
              index: clip.index,
              duration: clip.duration,
              prompt: clip.prompt,
              videoPath: clip.videoPath,
            })) || [],
          }))
        : logs.map((log) => ({
            id: log.id,
            createdAt: log.createdAt,
            status: log.status,
            duration: log.duration,
            durationFormatted: formatDuration(log.duration),
            errorMessage: log.errorMessage || null,
            sentence: log.sentence,
            style: log.style,
            requestedShots: log.requestedShots,
            generatedShots: log.generatedShots,
            model: log.model,
            storyboard: log.storyboard?.map((shot) => ({
              shot: shot.shot,
              description: shot.description,
              prompt: shot.prompt,
              shotStory: shot.shotStory || null,
              duration: shot.duration,
              heroSubject: shot.heroSubject || null,
              imageUrl: shot.imageUrl || null,
            })) || [],
          }));

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_logs_all_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg" align="flex-start">
        <Stack gap={4}>
          <Title order={2} className="logs-title">{activeTab === 'video' ? 'Video Generation Logs' : 'Storyboard Generation Logs'}</Title>
          <Tabs value={activeTab} onChange={setActiveTab} className="logs-tabs">
            <Tabs.List>
              <Tabs.Tab value="video">Video Logs</Tabs.Tab>
              <Tabs.Tab value="storyboard">Storyboard Logs</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Stack>
        <Group>
          <Button variant="subtle" onClick={handleBack} className="logs-action">Back to Home</Button>
          <Button variant="light" onClick={fetchLogs} className="logs-action">Refresh</Button>
          <Button variant="light" color="grape" onClick={exportAllLogs} disabled={logs.length === 0} className="logs-action">
            Export All
          </Button>
          <Button variant="light" color="red" onClick={handleClearAll} disabled={logs.length === 0} className="logs-action">
            Clear Logs
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" mb="md" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="lg" />
        </Group>
      ) : logs.length === 0 ? (
        <Card withBorder padding="xl" radius="md">
          <Text ta="center" c="dimmed" className="logs-empty-text">No logs yet</Text>
        </Card>
      ) : (
        <Stack gap="md">
          {logs.map((log) => (
            <Card key={log.id} padding="md" radius="md" className="log-card">
              <Group justify="space-between" mb="sm">
                <Group>
                  <Badge color={statusColors[log.status] || 'gray'} size="lg">
                    {log.status}
                  </Badge>
                  <Text size="sm" c="dimmed">{log.id}</Text>
                </Group>
                <Group>
                  <Text size="sm" c="dimmed">
                    {new Date(log.createdAt).toLocaleString()}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Duration: {formatDuration(log.duration)}
                  </Text>
                </Group>
              </Group>

              <Group mb="sm">
                <Text size="sm">Shots: {log.storyboard?.length || 0}</Text>
                {isVideo ? (
                  <Text size="sm">Transitions: {log.transitionPlans?.length || 0}</Text>
                ) : (
                  <Text size="sm">Requested shots: {log.requestedShots || '-'}</Text>
                )}
                {isVideo && log.finalVideoUrl && (
                  <a href={log.finalVideoUrl} target="_blank" rel="noopener noreferrer">
                    <Badge color="grape">View Video</Badge>
                  </a>
                )}
              </Group>

              {!isVideo && log.sentence && (
                <Text size="sm" c="dimmed" lineClamp={2}>
                  Story: {log.sentence}
                </Text>
              )}

              {log.errorMessage && (
                <Alert color="red" mb="sm" variant="light">
                  {log.errorMessage}
                </Alert>
              )}

              <Group>
                <Button size="xs" variant="light" onClick={() => setSelectedLog(log)}>
                  View Details
                </Button>
                <Button size="xs" variant="light" color="grape" onClick={() => exportLog(log)}>
                  Export
                </Button>
                <Button size="xs" variant="light" color="red" onClick={() => handleDelete(log.id)}>
                  Delete
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Modal
        opened={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Log Details - ${selectedLog?.id}`}
        size="xl"
        radius="lg"
      >
        {selectedLog && (
          <ScrollArea h={600}>
            <Stack gap="md">
              <Group justify="space-between">
                <Group>
                  <Badge color={statusColors[selectedLog.status] || 'gray'} size="lg">
                    {selectedLog.status}
                  </Badge>
                  <Text size="sm">{new Date(selectedLog.createdAt).toLocaleString()}</Text>
                  <Text size="sm">Duration: {formatDuration(selectedLog.duration)}</Text>
                </Group>
                <Button size="xs" variant="light" color="grape" onClick={() => exportLog(selectedLog)}>
                  Export Log
                </Button>
              </Group>

              {selectedLog.errorMessage && (
                <Alert color="red" variant="light">
                  <Text fw={500}>Error:</Text>
                  {selectedLog.errorMessage}
                </Alert>
              )}

              {!isVideo && (
                <Card padding="sm">
                  <Text fw={500} mb="xs">Storyboard Task Info</Text>
                  {selectedLog.sentence && <Text size="sm">Story: {selectedLog.sentence}</Text>}
                  {selectedLog.style && <Text size="sm">Style: {selectedLog.style}</Text>}
                  <Text size="sm">Requested shots: {selectedLog.requestedShots || '-'}</Text>
                  <Text size="sm">Actually generated: {selectedLog.generatedShots || selectedLog.storyboard?.length || 0}</Text>
                </Card>
              )}

              {isVideo && selectedLog.finalVideoUrl && (
                <Card padding="sm">
                  <Text fw={500} mb="xs">Generated Video:</Text>
                  <video controls width="100%" src={selectedLog.finalVideoUrl} style={{ maxHeight: 300 }} />
                </Card>
              )}

              <Accordion variant="separated">
                <Accordion.Item value="storyboard">
                  <Accordion.Control>
                    <Text fw={500}>Input Storyboard ({selectedLog.storyboard?.length || 0} shots)</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      {selectedLog.storyboard?.map((shot, idx) => (
                        <Card key={idx} padding="sm">
                          <Group align="flex-start">
                            {shot.imageUrl && (
                              <Image
                                src={shot.imageUrl}
                                alt={`Shot ${shot.shot}`}
                                width={120}
                                height={80}
                                radius="sm"
                                fit="cover"
                              />
                            )}
                            <Stack gap={4} style={{ flex: 1 }}>
                              <Badge size="sm">Shot {shot.shot}</Badge>
                              <Text size="sm" fw={500}>{shot.description}</Text>
                              <Text size="xs" c="dimmed" lineClamp={2}>{shot.prompt}</Text>
                              {shot.shotStory && (
                                <Text size="xs" c="blue">{shot.shotStory}</Text>
                              )}
                            </Stack>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                {isVideo && (
                  <Accordion.Item value="transitions">
                    <Accordion.Control>
                      <Text fw={500}>Transition Plans ({selectedLog.transitionPlans?.length || 0})</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        {selectedLog.transitionPlans?.map((plan, idx) => (
                          <Card key={idx} padding="sm">
                            <Group mb="xs">
                              <Badge>Transition {plan.index + 1}</Badge>
                              <Text size="sm">
                                Shot {plan.shotA?.shot} → Shot {plan.shotB?.shot}
                              </Text>
                              <Badge color="orange">{plan.duration}s</Badge>
                            </Group>
                            <Text size="sm" fw={500}>Prompt:</Text>
                            <Code block style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                              {plan.prompt}
                            </Code>
                          </Card>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}

                {isVideo && (
                  <Accordion.Item value="clips">
                    <Accordion.Control>
                      <Text fw={500}>Generated Clips ({selectedLog.clipResults?.length || 0})</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Index</Table.Th>
                            <Table.Th>Duration</Table.Th>
                            <Table.Th>Video Path</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {selectedLog.clipResults?.map((clip, idx) => (
                            <Table.Tr key={idx}>
                              <Table.Td>{clip.index}</Table.Td>
                              <Table.Td>{clip.duration}s</Table.Td>
                              <Table.Td>
                                <Code style={{ fontSize: 11 }}>{clip.videoPath}</Code>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
              </Accordion>
            </Stack>
          </ScrollArea>
        )}
      </Modal>
    </Container>
  );
}

export default VideoLogs;
