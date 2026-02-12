import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Group, Button, Text, Drawer, ActionIcon, Box } from '@mantine/core';
import Sidebar from './Sidebar';
import '../../App.css';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Build breadcrumbs from current path
  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [{ label: 'Studio', path: '/' }];

    const crumbs = [{ label: 'Home', path: '/' }];
    const pathMap = {
      studio: 'Studio',
      'image-generation': 'Image Generation',
      'video-generation': 'Video Generation',
      gallery: 'Gallery',
      logs: 'Logs',
      settings: 'Settings',
      project: 'Project',
      video: 'Video Lab',
    };

    let accumulated = '';
    for (const part of parts) {
      accumulated += `/${part}`;
      const label = pathMap[part] || (part.length > 12 ? part.slice(0, 8) + '...' : part);
      crumbs.push({ label, path: accumulated });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ─── Header ─────────────────────────────────────── */}
      <Box
        component="header"
        style={{
          height: 'var(--header-height)',
          borderBottom: '1px solid var(--pucho-border)',
          background: 'var(--pucho-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-header)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--space-md)',
        }}
      >
        <Group justify="space-between" style={{ width: '100%' }}>
          <Group align="center" gap="md">
            {/* Mobile hamburger */}
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={() => setMobileDrawerOpen(true)}
              className="mobile-hamburger"
            >
              <span style={{ fontSize: 20 }}>&#9776;</span>
            </ActionIcon>

            <img
              src="/pucho-logo.webp"
              alt="pucho.ai"
              className="hero-logo"
              onClick={() => navigate('/')}
              style={{ height: 36, cursor: 'pointer' }}
            />

            {/* Desktop nav links */}
            <Group gap="xs" className="nav-links desktop-nav">
              <Button variant={isActive('/') ? 'light' : 'subtle'} color="grape" size="sm" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button variant={isActive('/studio') ? 'light' : 'subtle'} color="grape" size="sm" onClick={() => navigate('/studio')}>
                Studio
              </Button>
              <Button variant={isActive('/image-generation') ? 'light' : 'subtle'} color="grape" size="sm" onClick={() => navigate('/image-generation')}>
                Images
              </Button>
              <Button variant={isActive('/video-generation') ? 'light' : 'subtle'} color="grape" size="sm" onClick={() => navigate('/video-generation')}>
                Videos
              </Button>
              <Button variant={isActive('/gallery') ? 'light' : 'subtle'} color="grape" size="sm" onClick={() => navigate('/gallery')}>
                Gallery
              </Button>
              <Button variant={isActive('/settings') ? 'light' : 'subtle'} color="grape" size="sm" onClick={() => navigate('/settings')}>
                Settings
              </Button>
            </Group>
          </Group>

          {/* Breadcrumbs (desktop) */}
          <Group gap={4} className="breadcrumbs desktop-nav">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.path}>
                {i > 0 && <Text size="xs" c="dimmed" mx={2}>/</Text>}
                <Text
                  size="xs"
                  c={i === breadcrumbs.length - 1 ? 'var(--pucho-text)' : 'dimmed'}
                  fw={i === breadcrumbs.length - 1 ? 600 : 400}
                  style={{ cursor: i < breadcrumbs.length - 1 ? 'pointer' : 'default' }}
                  onClick={i < breadcrumbs.length - 1 ? () => navigate(crumb.path) : undefined}
                >
                  {crumb.label}
                </Text>
              </React.Fragment>
            ))}
          </Group>
        </Group>
      </Box>

      {/* ─── Body (Sidebar + Content) ───────────────────── */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar */}
        <div className="desktop-sidebar">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content */}
        <Box
          component="main"
          style={{
            flex: 1,
            padding: 'var(--space-lg)',
            maxWidth: 'var(--content-max-width)',
            width: '100%',
            margin: '0 auto',
            minHeight: 'calc(100vh - var(--header-height))',
          }}
        >
          <Outlet />
        </Box>
      </div>

      {/* ─── Mobile Drawer ──────────────────────────────── */}
      <Drawer
        opened={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        size={260}
        padding={0}
        withCloseButton={false}
      >
        <Sidebar
          collapsed={false}
          onToggle={() => setMobileDrawerOpen(false)}
        />
      </Drawer>
    </div>
  );
}
