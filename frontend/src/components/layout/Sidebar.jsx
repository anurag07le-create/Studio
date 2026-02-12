import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Stack, UnstyledButton, Text, Tooltip, Box, Divider } from '@mantine/core';

const navItems = [
  { path: '/', label: 'Home', icon: '🏠', description: 'Dashboard' },
  { path: '/studio', label: 'Studio', icon: '🎬', description: 'Screenplay projects' },
  { path: '/image-generation', label: 'Images', icon: '🎨', description: 'AI storyboard images' },
  { path: '/video-generation', label: 'Videos', icon: '📹', description: 'AI video generation' },
  { path: '/gallery', label: 'Gallery', icon: '🖼️', description: 'Saved stories' },
  { path: '/logs', label: 'Logs', icon: '📋', description: 'Generation logs' },
  { path: '/settings', label: 'Settings', icon: '⚙️', description: 'Preferences' },
];

export default function Sidebar({ collapsed = false, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      component="nav"
      className="sidebar"
      style={{
        width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
        transition: 'width var(--duration-normal) var(--ease-default)',
        borderRight: '1px solid var(--pucho-border)',
        background: 'var(--pucho-bg)',
        height: 'calc(100vh - var(--header-height))',
        position: 'sticky',
        top: 'var(--header-height)',
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 'var(--z-sidebar)',
      }}
    >
      <Stack gap={4} p={collapsed ? 'xs' : 'sm'} style={{ flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const btn = (
            <UnstyledButton
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px 0' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--pucho-primary-bg)' : 'transparent',
                color: active ? 'var(--pucho-primary)' : 'var(--pucho-text)',
                fontWeight: active ? 600 : 500,
                fontSize: 'var(--font-size-sm)',
                transition: 'all var(--duration-fast) var(--ease-default)',
                width: '100%',
              }}
              className="sidebar-nav-item"
            >
              <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{item.icon}</span>
              {!collapsed && <Text size="sm" fw={active ? 600 : 500}>{item.label}</Text>}
            </UnstyledButton>
          );

          return collapsed ? (
            <Tooltip key={item.path} label={item.label} position="right" withArrow>
              {btn}
            </Tooltip>
          ) : btn;
        })}
      </Stack>

      <Divider color="var(--pucho-border)" />

      <Box p={collapsed ? 'xs' : 'sm'}>
        <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="right" withArrow>
          <UnstyledButton
            onClick={onToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 12,
              padding: collapsed ? '10px 0' : '10px 14px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--pucho-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              width: '100%',
              transition: 'all var(--duration-fast) var(--ease-default)',
            }}
            className="sidebar-nav-item"
          >
            <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{collapsed ? '▶' : '◀'}</span>
            {!collapsed && <Text size="sm" c="dimmed">Collapse</Text>}
          </UnstyledButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
