/**
 * Utility functions for converting technical names to user-friendly display names
 */

/**
 * Convert technical names to user-friendly display names
 * @param name - The technical name to convert (e.g., "chroma-mcp-server")
 * @returns The display name (e.g., "Chroma MCP Server")
 */
export const getDisplayName = (name: string): string => {
  // Convert technical names to user-friendly display names
  return name
    .split('-')
    .map(word => {
      // Handle special acronyms
      const upperWord = word.toUpperCase();
      if (['OSS', 'API', 'SQL', 'HTTP', 'JSON', 'XML', 'AWS', 'GCP', 'MCP'].includes(upperWord)) {
        return upperWord;
      }
      // Regular title case for other words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};