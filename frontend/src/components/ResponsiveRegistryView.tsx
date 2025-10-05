import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { MobileMonitoringDashboard } from './MobileMonitoringDashboard';
import { DesktopManagementInterface } from './DesktopManagementInterface';
import { Registry } from '../App';

interface ResponsiveRegistryViewProps {
  registries: Registry[];
  onRegistryClick: (registryId: string) => void;
  onCreateRegistry: () => void;
  onRefresh: () => void;
  onForceSync: (registryId: string, event: React.MouseEvent) => void;
  onShowManifest: (registryId: string) => void;
  onDelete: (registry: Registry) => void;
  refreshing?: boolean;
  currentNamespace: string;
  onNamespaceChange: (namespace: string) => void;
}

export const ResponsiveRegistryView: React.FC<ResponsiveRegistryViewProps> = (props) => {
  const theme = useTheme();

  // Use 'md' breakpoint to distinguish between mobile/tablet monitoring view and desktop management view
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobileOrTablet) {
    // Mobile/Tablet: Monitor-first experience
    return (
      <MobileMonitoringDashboard
        registries={props.registries}
        onRegistryClick={props.onRegistryClick}
        onRefresh={props.onRefresh}
        onForceSync={props.onForceSync}
        refreshing={props.refreshing}
      />
    );
  }

  // Desktop: Full management interface
  return (
    <DesktopManagementInterface
      registries={props.registries}
      onRegistryClick={props.onRegistryClick}
      onCreateRegistry={props.onCreateRegistry}
      onRefresh={props.onRefresh}
      onForceSync={props.onForceSync}
      onShowManifest={props.onShowManifest}
      onDelete={props.onDelete}
      refreshing={props.refreshing}
      currentNamespace={props.currentNamespace}
      onNamespaceChange={props.onNamespaceChange}
    />
  );
};