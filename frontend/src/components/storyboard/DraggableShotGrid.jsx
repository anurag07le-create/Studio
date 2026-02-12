import React from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card, Image, Text, Badge, Group, Button, Stack, SimpleGrid,
} from '@mantine/core';

function SortableShotCard({ shot, onGenerateImage, onEditShot, generatingImageId }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: shot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      withBorder
      radius="md"
      padding="xs"
      {...attributes}
      {...listeners}
    >
      {shot.imageUrl ? (
        <Card.Section>
          <Image src={shot.imageUrl} h={140} fit="cover" />
        </Card.Section>
      ) : (
        <Card.Section>
          <div style={{
            height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--mantine-color-gray-1)',
          }}>
            <Text c="dimmed" size="xs">No image yet</Text>
          </div>
        </Card.Section>
      )}
      <Group gap={4} mt="xs">
        <Badge size="xs" color="violet">Shot {shot.shotNumber}</Badge>
        {shot.cameraAngle && <Badge size="xs" variant="outline" color="gray">{shot.cameraAngle}</Badge>}
        {shot.duration && <Badge size="xs" variant="outline" color="blue">{shot.duration}s</Badge>}
      </Group>
      <Text size="xs" lineClamp={2} mt={4} fw={500}>{shot.prompt || shot.description}</Text>
      <Group gap={4} mt="xs" justify="flex-end">
        {onEditShot && (
          <Button size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); onEditShot(shot); }}>
            Edit
          </Button>
        )}
        {!shot.imageUrl && onGenerateImage && (
          <Button
            size="xs"
            variant="light"
            color="grape"
            loading={generatingImageId === shot.id}
            onClick={(e) => { e.stopPropagation(); onGenerateImage(shot.id); }}
          >
            Gen Image
          </Button>
        )}
      </Group>
    </Card>
  );
}

export default function DraggableShotGrid({
  shots = [],
  onReorder,
  onGenerateImage,
  onEditShot,
  generatingImageId,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = shots.findIndex((s) => s.id === active.id);
    const newIndex = shots.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(shots, oldIndex, newIndex);
    onReorder?.(reordered.map((s) => s.id));
  };

  if (shots.length === 0) {
    return (
      <Card withBorder padding="xl" radius="md">
        <Text ta="center" c="dimmed">No shots yet. Generate shots from a scene first.</Text>
      </Card>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={shots.map((s) => s.id)} strategy={rectSortingStrategy}>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
          {shots.map((shot) => (
            <SortableShotCard
              key={shot.id}
              shot={shot}
              onGenerateImage={onGenerateImage}
              onEditShot={onEditShot}
              generatingImageId={generatingImageId}
            />
          ))}
        </SimpleGrid>
      </SortableContext>
    </DndContext>
  );
}
