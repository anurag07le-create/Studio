import React, { useState, useEffect } from 'react';
import {
  Card, Title, Text, Group, Button, Stack, TextInput, Badge, Select, ActionIcon, Alert,
} from '@mantine/core';
import * as api from '../../api/v2';

const ROLE_COLORS = { viewer: 'blue', editor: 'green', admin: 'violet' };

export default function SharePanel({ projectId }) {
  const [collaborators, setCollaborators] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCollaborators = async () => {
    try {
      const list = await api.listCollaborators(projectId);
      setCollaborators(list);
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, [projectId]);

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) return;
    setLoading(true);
    setError(null);
    try {
      await api.inviteCollaborator(projectId, email.trim(), role);
      setEmail('');
      await fetchCollaborators();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (collabId, newRole) => {
    try {
      await api.updateCollaboratorRole(projectId, collabId, newRole);
      await fetchCollaborators();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (collabId) => {
    try {
      await api.removeCollaborator(projectId, collabId);
      await fetchCollaborators();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={5}>Share & Collaborate</Title>
          <Badge size="sm" variant="light">{collaborators.length} collaborators</Badge>
        </Group>

        {error && (
          <Alert color="red" variant="light" size="xs" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Group gap="xs" align="flex-end">
          <TextInput
            size="xs"
            label="Invite by email"
            placeholder="collaborator@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            style={{ flex: 1 }}
          />
          <Select
            size="xs"
            label="Role"
            data={[
              { value: 'viewer', label: 'Viewer' },
              { value: 'editor', label: 'Editor' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={role}
            onChange={setRole}
            w={100}
          />
          <Button size="xs" color="violet" onClick={handleInvite} loading={loading}>
            Invite
          </Button>
        </Group>

        <Stack gap={4}>
          {collaborators.map((collab) => (
            <Group key={collab.id} justify="space-between" p="xs" style={{ background: 'var(--mantine-color-gray-0)', borderRadius: 6 }}>
              <Group gap="xs">
                <Text size="xs" fw={500}>{collab.email}</Text>
                <Badge size="xs" color={ROLE_COLORS[collab.role]} variant="light">{collab.role}</Badge>
                {collab.acceptedAt && <Badge size="xs" color="green" variant="dot">Accepted</Badge>}
              </Group>
              <Group gap={4}>
                <Select
                  size="xs"
                  data={[
                    { value: 'viewer', label: 'Viewer' },
                    { value: 'editor', label: 'Editor' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  value={collab.role}
                  onChange={(val) => handleUpdateRole(collab.id, val)}
                  w={90}
                  variant="unstyled"
                />
                <Button size="xs" variant="subtle" color="red" onClick={() => handleRemove(collab.id)}>
                  Remove
                </Button>
              </Group>
            </Group>
          ))}
          {collaborators.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py="xs">
              No collaborators yet. Invite someone to work together.
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
