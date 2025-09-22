import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';

interface TabItem {
  label: string;
  count?: number;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface TabNavigationProps {
  tabs: TabItem[];
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  variant?: 'standard' | 'scrollable' | 'fullWidth';
  centered?: boolean;
  indicatorColor?: 'primary' | 'secondary';
  textColor?: 'primary' | 'secondary' | 'inherit';
  'aria-label'?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  id?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, id, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={id || `tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
};

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  value,
  onChange,
  variant = 'standard',
  centered = false,
  indicatorColor = 'primary',
  textColor = 'primary',
  'aria-label': ariaLabel = 'navigation tabs',
}) => {
  const a11yProps = (index: number) => {
    return {
      id: `tab-${index}`,
      'aria-controls': `tabpanel-${index}`,
    };
  };

  const renderTabLabel = (tab: TabItem) => {
    if (tab.count !== undefined) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {tab.icon && tab.icon}
          <span>{tab.label}</span>
          <Badge
            badgeContent={tab.count}
            color="primary"
            max={999}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.75rem',
                height: 18,
                minWidth: 18,
              },
            }}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {tab.icon && tab.icon}
        <span>{tab.label}</span>
      </Box>
    );
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={value}
        onChange={onChange}
        variant={variant}
        centered={centered}
        indicatorColor={indicatorColor}
        textColor={textColor}
        aria-label={ariaLabel}
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minWidth: 120,
            '&.Mui-selected': {
              fontWeight: 600,
            },
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={renderTabLabel(tab)}
            disabled={tab.disabled}
            {...a11yProps(index)}
          />
        ))}
      </Tabs>
    </Box>
  );
};

// Helper hook for managing tab state
export const useTabNavigation = (initialTab: number = 0) => {
  const [tabValue, setTabValue] = React.useState(initialTab);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return {
    tabValue,
    handleTabChange,
    setTabValue,
  };
};

// Pre-configured tab navigation for registry servers
interface RegistryTabNavigationProps {
  availableCount?: number;
  deployedCount?: number;
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

export const RegistryTabNavigation: React.FC<RegistryTabNavigationProps> = ({
  availableCount,
  deployedCount,
  value,
  onChange,
}) => {
  const tabs: TabItem[] = [
    {
      label: 'Available Servers',
      count: availableCount,
    },
    {
      label: 'Deployed Servers',
      count: deployedCount,
    },
  ];

  return (
    <TabNavigation
      tabs={tabs}
      value={value}
      onChange={onChange}
      aria-label="registry server tabs"
    />
  );
};

export default TabNavigation;