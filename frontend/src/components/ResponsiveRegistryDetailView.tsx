import React, { useState } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { MobileRegistryDashboard } from './MobileRegistryDashboard';
import { MobileServerDiscovery } from './MobileServerDiscovery';
import { MobileServerCard } from './MobileServerCard';
import { MobileServerDialog } from './MobileServerDialog';
import { DesktopRegistryManagement } from './DesktopRegistryManagement';
import { Registry } from '../App';

interface Server {
  name: string;
  image: string;
  description?: string;
  tags?: string[];
  tier?: string;
  transport?: string;
  status?: string;
  ready?: boolean;
  tools_count?: number;
  logoUrl?: string;
  endpoint_url?: string;
  version?: string;
  namespace?: string;
}

interface ResponsiveRegistryDetailViewProps {
  registry: Registry;
  availableServers: Server[];
  deployedServers: Server[];
  onServerClick: (server: Server, isDeployed: boolean) => void;
  onForceSync: (event: React.MouseEvent) => void;
  onRefresh: () => void;
  onShowManifest: (serverName: string, isDeployed: boolean) => void;
  onDeleteServer?: (server: Server) => void;
  onQuickDeploy?: (server: Server) => void;
  refreshing?: boolean;
  serversLoading?: boolean;
  deployedServersLoading?: boolean;
}

export const ResponsiveRegistryDetailView: React.FC<ResponsiveRegistryDetailViewProps> = (props) => {
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Mobile server dialog state
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [isSelectedServerDeployed, setIsSelectedServerDeployed] = useState(false);

  const handleMobileServerClick = (server: Server, isDeployed: boolean) => {
    if (isMobileOrTablet) {
      // Use mobile dialog for mobile/tablet
      setSelectedServer(server);
      setIsSelectedServerDeployed(isDeployed);
      setMobileDialogOpen(true);
    } else {
      // Use desktop dialog for desktop
      props.onServerClick(server, isDeployed);
    }
  };

  const handleMobileDialogClose = () => {
    setMobileDialogOpen(false);
    setSelectedServer(null);
    setIsSelectedServerDeployed(false);
  };

  if (isMobileOrTablet) {
    // Mobile/Tablet: Monitor-first experience with simplified dashboard and server views
    return (
      <>
        {/* Mobile Registry Health Dashboard */}
        <MobileRegistryDashboard
          registry={props.registry}
          availableServers={props.availableServers}
          deployedServers={props.deployedServers}
          refreshing={props.refreshing}
        />

        {/* Mobile Server Views */}
        {/* Available Servers Discovery */}
        <MobileServerDiscovery
          servers={props.availableServers}
          onServerView={(server) => handleMobileServerClick(server, false)}
          loading={props.serversLoading}
        />

        {/* Deployed Servers Management */}
        {props.deployedServers.length > 0 && (
          <>
            <div style={{ padding: '0 16px', marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>
                Deployed Servers ({props.deployedServers.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {props.deployedServers.map((server) => (
                  <MobileServerCard
                    key={server.name}
                    server={server}
                    isDeployed={true}
                    onRestart={() => {
                      // Restart server action
                      console.log('Restart server:', server.name);
                    }}
                    onDelete={props.onDeleteServer ? () => props.onDeleteServer!(server) : undefined}
                    onView={() => handleMobileServerClick(server, true)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Mobile Server Dialog */}
        <MobileServerDialog
          open={mobileDialogOpen}
          server={selectedServer}
          isDeployed={isSelectedServerDeployed}
          onClose={handleMobileDialogClose}
        />
      </>
    );
  }

  // Desktop: Full management interface
  return (
    <DesktopRegistryManagement
      registry={props.registry}
      availableServers={props.availableServers}
      deployedServers={props.deployedServers}
      onServerClick={props.onServerClick}
      onForceSync={props.onForceSync}
      onRefresh={props.onRefresh}
      onShowManifest={props.onShowManifest}
      onDeleteServer={props.onDeleteServer}
      onQuickDeploy={props.onQuickDeploy}
      refreshing={props.refreshing}
      serversLoading={props.serversLoading}
      deployedServersLoading={props.deployedServersLoading}
    />
  );
};