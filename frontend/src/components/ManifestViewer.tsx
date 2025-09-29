import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`manifest-tabpanel-${index}`}
      aria-labelledby={`manifest-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const CodeEditor = styled('div')(({ theme }) => ({
  margin: 0,
  padding: 0,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
  fontSize: '14px',
  lineHeight: 1.5,
  backgroundColor: theme.palette.grey[50],
  border: `1px solid ${theme.palette.grey[300]}`,
  borderRadius: theme.shape.borderRadius,
  overflow: 'auto',
  maxHeight: '60vh',
  position: 'relative',
}));

const CodeLine = styled('div')<{ indent: number; foldable: boolean; folded: boolean }>(({ theme, foldable, folded }) => ({
  display: folded ? 'none' : 'flex',
  alignItems: 'center',
  position: 'relative',
  paddingLeft: '80px', // Fixed padding for line numbers, no extra indentation
  paddingRight: theme.spacing(2),
  paddingTop: '1px',
  paddingBottom: '1px',
  minHeight: '21px',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&::before': {
    content: 'attr(data-line-number)',
    position: 'absolute',
    left: '10px',
    top: 0,
    color: theme.palette.grey[500],
    fontSize: '12px',
    lineHeight: 'inherit',
    textAlign: 'right',
    width: '40px',
    borderRight: `1px solid ${theme.palette.grey[300]}`,
    paddingRight: '8px',
    userSelect: 'none',
  },
  '& .fold-handle': {
    position: 'absolute',
    left: '55px', // Fixed position next to line numbers, not indented
    top: '2px',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    display: foldable ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
    fontSize: '14px',
    color: theme.palette.grey[600],
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      color: theme.palette.primary.main,
    },
  },
}));

interface ParsedLine {
  content: string;
  indent: number;
  foldable: boolean;
  foldId?: string;
  parentFoldId?: string;
}

interface FoldState {
  [foldId: string]: boolean;
}

// Function to parse content and identify foldable sections
function parseContentForFolding(content: string, format: 'yaml' | 'json'): ParsedLine[] {
  const lines = content.split('\n');
  const parsedLines: ParsedLine[] = [];
  let foldCounter = 0;

  // First pass: identify all foldable lines and their ranges
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let indent = 0;
    let foldable = false;
    let foldId: string | undefined;

    // Calculate indentation
    const match = line.match(/^(\s*)/);
    if (match) {
      indent = Math.floor(match[1].length / 2);
    }

    // Detect foldable sections
    if (format === 'yaml') {
      // YAML: Look for keys that have child content
      if (line.includes(':')) {
        const trimmed = line.trim();
        // Skip if it's a simple key-value pair on the same line
        if (!trimmed.endsWith(':') && trimmed.includes(': ')) {
          // Check if there are child elements (next lines with greater indentation)
          const currentIndent = match?.[1]?.length || 0;
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            if (nextLine.trim() === '') {continue;} // Skip empty lines

            const nextIndent = nextLine.match(/^(\s*)/)?.[1]?.length || 0;
            if (nextIndent > currentIndent) {
              foldable = true;
              foldId = `fold_${foldCounter++}`;
              break;
            } else if (nextIndent <= currentIndent) {
              break; // No child content
            }
          }
        } else if (trimmed.endsWith(':')) {
          // Object or array declaration - check if next lines are indented
          const currentIndent = match?.[1]?.length || 0;
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            if (nextLine.trim() !== '') {
              const nextIndent = nextLine.match(/^(\s*)/)?.[1]?.length || 0;
              if (nextIndent > currentIndent) {
                foldable = true;
                foldId = `fold_${foldCounter++}`;
              }
            }
          }
        }
      }
    } else {
      // JSON: Look for objects and arrays
      const trimmed = line.trim();
      if ((trimmed.includes('{') && !trimmed.endsWith('{}')) ||
          (trimmed.includes('[') && !trimmed.endsWith('[]'))) {
        foldable = true;
        foldId = `fold_${foldCounter++}`;
      }
    }

    parsedLines.push({
      content: line,
      indent,
      foldable,
      foldId,
      parentFoldId: undefined, // Will be set in second pass
    });
  }

  // Second pass: establish parent-child relationships
  for (let i = 0; i < parsedLines.length; i++) {
    const currentLine = parsedLines[i];

    // Find the nearest foldable parent (line with less indentation and foldable=true)
    for (let j = i - 1; j >= 0; j--) {
      const potentialParent = parsedLines[j];
      if (potentialParent.foldable && potentialParent.indent < currentLine.indent) {
        // Check if this line is actually within the foldable section
        const parentIndent = potentialParent.indent;
        let isChild = true;

        // Look for any line between parent and current that has same or less indentation than parent
        for (let k = j + 1; k < i; k++) {
          const betweenLine = parsedLines[k];
          if (betweenLine.content.trim() !== '' && betweenLine.indent <= parentIndent) {
            isChild = false;
            break;
          }
        }

        if (isChild) {
          currentLine.parentFoldId = potentialParent.foldId;
          break;
        }
      }
    }
  }

  return parsedLines;
}

export interface ManifestViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  manifest: object;
  inline?: boolean;
}

export const ManifestViewer: React.FC<ManifestViewerProps> = ({
  open,
  onClose,
  title,
  manifest,
  inline = false,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [yamlFoldState, setYamlFoldState] = useState<FoldState>({});
  const [jsonFoldState, setJsonFoldState] = useState<FoldState>({});

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const yamlContent = convertToYAML(manifest);
  const jsonContent = JSON.stringify(manifest, null, 2);

  // Parse content into lines with folding information
  const yamlLines = useMemo(() => parseContentForFolding(yamlContent, 'yaml'), [yamlContent]);
  const jsonLines = useMemo(() => parseContentForFolding(jsonContent, 'json'), [jsonContent]);

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleFold = (foldId: string, isYaml: boolean) => {
    if (isYaml) {
      setYamlFoldState(prev => ({
        ...prev,
        [foldId]: !prev[foldId]
      }));
    } else {
      setJsonFoldState(prev => ({
        ...prev,
        [foldId]: !prev[foldId]
      }));
    }
  };

  const isLineFolded = (line: ParsedLine, foldState: FoldState, allLines: ParsedLine[]): boolean => {
    if (!line.parentFoldId) {return false;}

    // Check if any parent fold is collapsed
    let current: string | undefined = line.parentFoldId;
    while (current) {
      if (foldState[current]) {return true;}
      // Find parent of current fold ID
      const parentLine = allLines.find(l => l.foldId === current);
      current = parentLine?.parentFoldId;
    }
    return false;
  };

  const renderCodeWithFolding = (lines: ParsedLine[], foldState: FoldState, isYaml: boolean) => {
    return lines.map((line, index) => {
      const isFolded = isLineFolded(line, foldState, lines);
      const lineNumber = index + 1;

      return (
        <CodeLine
          key={index}
          indent={line.indent}
          foldable={line.foldable}
          folded={isFolded}
          data-line-number={lineNumber}
        >
          {line.foldable && (
            <div
              className="fold-handle"
              onClick={() => line.foldId && handleFold(line.foldId, isYaml)}
            >
              {foldState[line.foldId || ''] ? (
                <ChevronRightIcon sx={{ fontSize: 12 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 12 }} />
              )}
            </div>
          )}
          <span style={{ whiteSpace: 'pre' }}>{line.content}</span>
        </CodeLine>
      );
    });
  };

  // Render inline content without dialog wrapper
  const renderContent = () => (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: inline ? 0 : 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="manifest format tabs"
        >
          <Tab
            label="YAML"
            id="manifest-tab-0"
            aria-controls="manifest-tabpanel-0"
          />
          <Tab
            label="JSON"
            id="manifest-tab-1"
            aria-controls="manifest-tabpanel-1"
          />
        </Tabs>
      </Box>

      <Box sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ position: 'relative' }}>
            <Tooltip title="Copy YAML">
              <IconButton
                onClick={() => copyToClipboard(yamlContent)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
                size="small"
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <CodeEditor>
              {renderCodeWithFolding(yamlLines, yamlFoldState, true)}
            </CodeEditor>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ position: 'relative' }}>
            <Tooltip title="Copy JSON">
              <IconButton
                onClick={() => copyToClipboard(jsonContent)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
                size="small"
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <CodeEditor>
              {renderCodeWithFolding(jsonLines, jsonFoldState, false)}
            </CodeEditor>
          </Box>
        </TabPanel>
      </Box>
    </>
  );

  if (inline) {
    return (
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
        {renderContent()}
      </Box>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxHeight: '800px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title} - Manifest
        </Typography>
        <Tooltip title="Close">
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ ml: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* Fixed Tabs Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="manifest format tabs"
        >
          <Tab
            label="YAML"
            id="manifest-tab-0"
            aria-controls="manifest-tabpanel-0"
          />
          <Tab
            label="JSON"
            id="manifest-tab-1"
            aria-controls="manifest-tabpanel-1"
          />
        </Tabs>
      </Box>

      {/* Scrollable Content Section */}
      <Box sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ position: 'relative' }}>
            <Tooltip title="Copy YAML">
              <IconButton
                onClick={() => copyToClipboard(yamlContent)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
                size="small"
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <CodeEditor>
              {renderCodeWithFolding(yamlLines, yamlFoldState, true)}
            </CodeEditor>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ position: 'relative' }}>
            <Tooltip title="Copy JSON">
              <IconButton
                onClick={() => copyToClipboard(jsonContent)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
                size="small"
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <CodeEditor>
              {renderCodeWithFolding(jsonLines, jsonFoldState, false)}
            </CodeEditor>
          </Box>
        </TabPanel>
      </Box>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Simple YAML converter (basic implementation)
function convertToYAML(obj: any, indent = 0): string {
  const indentStr = ' '.repeat(indent);

  if (obj === null) {return 'null';}
  if (typeof obj === 'undefined') {return 'undefined';}
  if (typeof obj === 'boolean') {return obj.toString();}
  if (typeof obj === 'number') {return obj.toString();}
  if (typeof obj === 'string') {
    // Use literal block scalar for very long strings or JSON strings
    if (obj.length > 100 || (obj.startsWith('{') && obj.endsWith('}'))) {
      const lines = obj.split('\n');
      if (lines.length === 1) {
        // Single line but long or JSON - use literal block scalar
        return `|\n${' '.repeat(indent + 2)}${obj}`;
      } else {
        // Multi-line string - use literal block scalar
        return `|\n${lines.map(line => ' '.repeat(indent + 2) + line).join('\n')}`;
      }
    }
    // Quote strings that need quoting
    if (obj.includes('\n') || obj.includes('"') || obj.includes("'") || obj.includes(':') || obj.includes('[') || obj.includes(']') || obj.includes('{') || obj.includes('}')) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {return '[]';}
    return obj.map((item) => {
      if (typeof item === 'object' && item !== null) {
        // For array of objects, the first property starts right after the dash
        const itemYaml = convertToYAML(item, 0); // No base indentation for the object
        const lines = itemYaml.split('\n');
        const firstLine = `${indentStr}- ${lines[0]}`;
        const remainingLines = lines.slice(1).map(line => `${indentStr}  ${line}`);
        return [firstLine, ...remainingLines].join('\n');
      } else {
        // For array of primitives
        const itemYaml = convertToYAML(item, 0);
        return `${indentStr}- ${itemYaml}`;
      }
    }).join('\n');
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) {return '{}';}

    return keys.map(key => {
      const value = obj[key];

      if (value === null || value === undefined) {
        return `${indentStr}${key}: ${value === null ? 'null' : 'undefined'}`;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return `${indentStr}${key}: []`;
        }
        const arrayYaml = convertToYAML(value, indent + 2);
        return `${indentStr}${key}:\n${arrayYaml}`;
      }

      if (typeof value === 'object') {
        // Check if it's an empty object
        if (Object.keys(value).length === 0) {
          return `${indentStr}${key}: {}`;
        }
        const objectYaml = convertToYAML(value, indent + 2);
        return `${indentStr}${key}:\n${objectYaml}`;
      }

      // Primitive values (string, number, boolean)
      const primitiveYaml = convertToYAML(value, 0);
      return `${indentStr}${key}: ${primitiveYaml}`;
    }).join('\n');
  }

  return String(obj);
}