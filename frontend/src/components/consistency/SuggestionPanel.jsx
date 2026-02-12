import React, { useState } from 'react';
import {
  Card, Text, Title, Group, Badge, Button, Stack, Checkbox, TextInput, Textarea,
  Alert, Loader, Accordion, ThemeIcon, Divider, Grid, Paper,
} from '@mantine/core';

/**
 * SuggestionPanel — Shows AI-suggested characters and locations from script analysis.
 * Users can review, edit, and approve suggestions to create character/location refs.
 */
export default function SuggestionPanel({
  projectId,
  hasScript,
  onSuggestEntities,
  onApproveSuggestions,
  suggestions,
  suggesting,
  existingCharacters = [],
  existingLocations = [],
}) {
  const [selectedChars, setSelectedChars] = useState(new Set());
  const [selectedLocs, setSelectedLocs] = useState(new Set());
  const [editedChars, setEditedChars] = useState({});
  const [editedLocs, setEditedLocs] = useState({});
  const [approving, setApproving] = useState(false);

  if (!hasScript) return null;

  const suggestedCharacters = suggestions?.suggestedCharacters || [];
  const suggestedLocations = suggestions?.suggestedLocations || [];

  // Filter out already existing characters/locations
  const existingCharNames = new Set(existingCharacters.map(c => c.name?.toUpperCase()));
  const existingLocNames = new Set(existingLocations.map(l => l.name?.toUpperCase()));

  const newCharacters = suggestedCharacters.filter(c => !existingCharNames.has(c.name?.toUpperCase()));
  const newLocations = suggestedLocations.filter(l => !existingLocNames.has(l.name?.toUpperCase()));

  const toggleChar = (idx) => {
    const next = new Set(selectedChars);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelectedChars(next);
  };

  const toggleLoc = (idx) => {
    const next = new Set(selectedLocs);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelectedLocs(next);
  };

  const selectAllChars = () => {
    if (selectedChars.size === newCharacters.length) {
      setSelectedChars(new Set());
    } else {
      setSelectedChars(new Set(newCharacters.map((_, i) => i)));
    }
  };

  const selectAllLocs = () => {
    if (selectedLocs.size === newLocations.length) {
      setSelectedLocs(new Set());
    } else {
      setSelectedLocs(new Set(newLocations.map((_, i) => i)));
    }
  };

  const updateCharField = (idx, field, value) => {
    setEditedChars(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), [field]: value },
    }));
  };

  const updateLocField = (idx, field, value) => {
    setEditedLocs(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), [field]: value },
    }));
  };

  const getChar = (idx) => ({
    ...newCharacters[idx],
    ...(editedChars[idx] || {}),
  });

  const getLoc = (idx) => ({
    ...newLocations[idx],
    ...(editedLocs[idx] || {}),
  });

  const handleApprove = async () => {
    const characters = [...selectedChars].map(idx => getChar(idx));
    const locations = [...selectedLocs].map(idx => getLoc(idx));
    if (characters.length === 0 && locations.length === 0) return;

    setApproving(true);
    try {
      await onApproveSuggestions(characters, locations);
      setSelectedChars(new Set());
      setSelectedLocs(new Set());
      setEditedChars({});
      setEditedLocs({});
    } finally {
      setApproving(false);
    }
  };

  // Before analysis: show "Analyze Script" button
  if (!suggestions) {
    return (
      <Card withBorder padding="md" radius="md" mb="md" style={{ borderColor: 'var(--mantine-color-violet-4)', borderStyle: 'dashed' }}>
        <Group justify="space-between" align="center">
          <div>
            <Group gap="xs">
              <ThemeIcon variant="light" color="violet" size="sm">
                <span style={{ fontSize: 14 }}>🎭</span>
              </ThemeIcon>
              <Text fw={600} size="sm">Script Analysis</Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              AI can analyze your script to suggest characters and locations with detailed descriptions.
            </Text>
          </div>
          <Button
            variant="light"
            color="violet"
            size="sm"
            onClick={onSuggestEntities}
            loading={suggesting}
          >
            {suggesting ? 'Analyzing Script...' : 'Analyze Script'}
          </Button>
        </Group>
      </Card>
    );
  }

  // After analysis: show suggestions
  const totalNew = newCharacters.length + newLocations.length;
  const totalSelected = selectedChars.size + selectedLocs.size;

  if (totalNew === 0) {
    return (
      <Alert color="green" variant="light" mb="md" title="All entities already created">
        All {suggestedCharacters.length} characters and {suggestedLocations.length} locations from the script are already in your project.
      </Alert>
    );
  }

  return (
    <Card withBorder padding="md" radius="md" mb="md">
      <Group justify="space-between" mb="sm">
        <div>
          <Title order={5}>Script Suggestions</Title>
          <Text size="xs" c="dimmed">
            Found {newCharacters.length} new character{newCharacters.length !== 1 ? 's' : ''} and {newLocations.length} new location{newLocations.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Group gap="xs">
          <Button
            variant="light"
            size="xs"
            color="gray"
            onClick={onSuggestEntities}
            loading={suggesting}
          >
            Re-analyze
          </Button>
          <Button
            variant="filled"
            size="sm"
            color="violet"
            onClick={handleApprove}
            loading={approving}
            disabled={totalSelected === 0}
          >
            Approve {totalSelected} Selected
          </Button>
        </Group>
      </Group>

      {/* Characters Section */}
      {newCharacters.length > 0 && (
        <>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600} c="violet">Characters ({newCharacters.length})</Text>
            <Button variant="subtle" size="xs" onClick={selectAllChars}>
              {selectedChars.size === newCharacters.length ? 'Deselect All' : 'Select All'}
            </Button>
          </Group>

          <Accordion variant="contained" radius="sm" mb="md">
            {newCharacters.map((char, idx) => {
              const edited = getChar(idx);
              return (
                <Accordion.Item key={idx} value={`char-${idx}`}>
                  <Accordion.Control>
                    <Group gap="sm">
                      <Checkbox
                        checked={selectedChars.has(idx)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleChar(idx);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                      />
                      <Badge color="violet" variant="light" size="sm">{edited.name}</Badge>
                      <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
                        {edited.description?.substring(0, 80) || 'No description'}
                      </Text>
                      {edited.appearsInScenes?.length > 0 && (
                        <Badge size="xs" variant="outline" color="gray">
                          {edited.appearsInScenes.length} scene{edited.appearsInScenes.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="xs">
                      <TextInput
                        label="Name"
                        size="xs"
                        value={edited.name || ''}
                        onChange={(e) => updateCharField(idx, 'name', e.target.value)}
                      />
                      <Textarea
                        label="Description"
                        size="xs"
                        minRows={2}
                        autosize
                        value={edited.description || ''}
                        onChange={(e) => updateCharField(idx, 'description', e.target.value)}
                      />
                      {edited.traits && Object.keys(edited.traits).length > 0 && (
                        <div>
                          <Text size="xs" fw={600} c="dimmed" mb={4}>Traits</Text>
                          <Group gap={4}>
                            {Object.entries(edited.traits).filter(([,v]) => v).map(([k, v]) => (
                              <Badge key={k} size="xs" variant="outline" color="gray">
                                {k}: {v}
                              </Badge>
                            ))}
                          </Group>
                        </div>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </>
      )}

      {/* Locations Section */}
      {newLocations.length > 0 && (
        <>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600} c="teal">Locations ({newLocations.length})</Text>
            <Button variant="subtle" size="xs" onClick={selectAllLocs}>
              {selectedLocs.size === newLocations.length ? 'Deselect All' : 'Select All'}
            </Button>
          </Group>

          <Accordion variant="contained" radius="sm">
            {newLocations.map((loc, idx) => {
              const edited = getLoc(idx);
              return (
                <Accordion.Item key={idx} value={`loc-${idx}`}>
                  <Accordion.Control>
                    <Group gap="sm">
                      <Checkbox
                        checked={selectedLocs.has(idx)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleLoc(idx);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                      />
                      <Badge color="teal" variant="light" size="sm">{edited.name}</Badge>
                      <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
                        {edited.description?.substring(0, 80) || 'No description'}
                      </Text>
                      {edited.appearsInScenes?.length > 0 && (
                        <Badge size="xs" variant="outline" color="gray">
                          {edited.appearsInScenes.length} scene{edited.appearsInScenes.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="xs">
                      <TextInput
                        label="Name"
                        size="xs"
                        value={edited.name || ''}
                        onChange={(e) => updateLocField(idx, 'name', e.target.value)}
                      />
                      <Textarea
                        label="Description"
                        size="xs"
                        minRows={2}
                        autosize
                        value={edited.description || ''}
                        onChange={(e) => updateLocField(idx, 'description', e.target.value)}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </>
      )}
    </Card>
  );
}
