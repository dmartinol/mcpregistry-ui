import { URL } from 'url';

export interface GitValidationResult {
  valid: boolean;
  accessible: boolean;
  branches?: string[];
  error?: string;
  fileExists?: boolean;
  fileContent?: string;
}

export interface GitBranchInfo {
  name: string;
  isDefault: boolean;
  lastCommitDate?: string;
}

export class GitValidationService {
  // Simple in-memory cache for validation results
  private validationCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate a Git repository URL
   */
  async validateGitUrl(repositoryUrl: string): Promise<GitValidationResult> {
    try {
      console.log(`Validating Git URL: ${repositoryUrl}`);

      // Check cache first
      const cacheKey = `validate:${repositoryUrl}`;
      const cached = this.validationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('Using cached validation result');
        return cached.result;
      }

      // Basic URL format validation
      if (!this.isValidGitUrl(repositoryUrl)) {
        const result = {
          valid: false,
          accessible: false,
          error: 'Invalid Git URL format. Expected HTTPS URL (e.g., https://github.com/user/repo.git)'
        };
        this.validationCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Note: We skip accessibility check to avoid API rate limits
      // Repository accessibility will be verified during sync

      const result = {
        valid: true,
        accessible: true,
      };
      this.validationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error validating Git URL:', error);
      return {
        valid: false,
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get the default branch for a Git repository (fallback to 'main')
   */
  async getDefaultBranch(repositoryUrl: string): Promise<string> {
    console.log('Using default branch "main" for:', repositoryUrl);
    return 'main'; // Always return 'main' to avoid API calls
  }

  /**
   * Get common Git branch suggestions (no API calls)
   */
  async getRepositoryBranches(repositoryUrl: string, searchTerm?: string): Promise<GitBranchInfo[]> {
    console.log(`Providing branch suggestions for repository: ${repositoryUrl}, search: ${searchTerm || 'none'}`);

    // Common branch names used in Git repositories
    const commonBranches: GitBranchInfo[] = [
      { name: 'main', isDefault: true },
      { name: 'master', isDefault: false },
      { name: 'develop', isDefault: false },
      { name: 'dev', isDefault: false },
      { name: 'staging', isDefault: false },
      { name: 'production', isDefault: false },
      { name: 'release', isDefault: false },
      { name: 'feature', isDefault: false },
      { name: 'hotfix', isDefault: false }
    ];

    // Filter by search term if provided
    let filteredBranches = commonBranches;
    if (searchTerm && searchTerm.length >= 1) {
      const searchLower = searchTerm.toLowerCase();
      filteredBranches = commonBranches.filter(branch =>
        branch.name.toLowerCase().includes(searchLower)
      );

      // If search term doesn't match any common branches, suggest it as a custom branch
      if (filteredBranches.length === 0 && searchTerm.length >= 2) {
        filteredBranches = [{ name: searchTerm, isDefault: false }];
      }
    }

    console.log(`Suggesting ${filteredBranches.length} branches`);
    return filteredBranches;
  }

  /**
   * Basic file path validation (no API calls)
   */
  async validateFilePath(repositoryUrl: string, filePath: string, branch: string = 'main'): Promise<GitValidationResult> {
    console.log(`Validating file path format: ${filePath} in branch: ${branch} of repository: ${repositoryUrl}`);

    // Basic path validation without external API calls
    if (!filePath || filePath.trim().length === 0) {
      return {
        valid: false,
        accessible: false,
        fileExists: false,
        error: 'File path is required'
      };
    }

    // Check for invalid characters (excluding control characters due to ESLint)
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(filePath)) {
      return {
        valid: false,
        accessible: false,
        fileExists: false,
        error: 'File path contains invalid characters'
      };
    }

    // Check for absolute paths (should be relative)
    if (filePath.startsWith('/') || filePath.startsWith('\\')) {
      return {
        valid: false,
        accessible: false,
        fileExists: false,
        error: 'File path should be relative to repository root (e.g., "registry.json" or "data/registry.json")'
      };
    }

    // Suggest common registry file names if the path looks unusual
    const commonExtensions = ['.json', '.yaml', '.yml'];
    const hasValidExtension = commonExtensions.some(ext => filePath.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      return {
        valid: true,
        accessible: true,
        fileExists: undefined, // Unknown without API call
        error: 'Note: Common registry file extensions are .json, .yaml, or .yml'
      };
    }

    return {
      valid: true,
      accessible: true,
      fileExists: undefined, // Cannot verify without API calls
      fileContent: undefined
    };
  }

  /**
   * Comprehensive validation of Git repository, branch, and file (format validation only)
   */
  async validateGitSource(repositoryUrl: string, branch?: string, filePath?: string): Promise<GitValidationResult> {
    // First validate the repository URL format
    const urlValidation = await this.validateGitUrl(repositoryUrl);
    if (!urlValidation.valid) {
      return urlValidation;
    }

    // Basic branch name validation (if provided)
    if (branch) {
      if (!branch.match(/^[a-zA-Z0-9._/-]+$/)) {
        return {
          valid: false,
          accessible: true,
          error: 'Branch name contains invalid characters. Use only letters, numbers, dots, underscores, hyphens, and forward slashes.'
        };
      }
    }

    // If file path is specified, validate the format
    if (filePath) {
      const fileValidation = await this.validateFilePath(repositoryUrl, filePath, branch || 'main');
      return fileValidation;
    }

    return {
      valid: true,
      accessible: true,
      branches: ['main', 'master', 'develop'] // Common suggestions
    };
  }

  /**
   * Get file content from a Git repository (simplified implementation)
   * Note: This is a placeholder implementation that doesn't make external API calls
   * In a real implementation, this would fetch content from GitHub/GitLab API
   */
  async getFileContent(repositoryUrl: string, filePath: string, branch: string = 'main'): Promise<string | null> {
    console.log(`Fetching file content from ${repositoryUrl}:${branch}/${filePath}`);

    // This is a placeholder implementation that returns null
    // In a real implementation, this would:
    // 1. Parse the repository URL to determine the provider (GitHub, GitLab, etc.)
    // 2. Use the appropriate API to fetch the file content
    // 3. Handle authentication if required
    // 4. Return the raw file content

    console.warn(`getFileContent is not fully implemented - returning null for ${filePath}`);
    return null;
  }

  /**
   * Check if URL format is valid for Git repositories
   */
  private isValidGitUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Must be HTTPS for security
      if (parsedUrl.protocol !== 'https:') {
        return false;
      }

      // Must be a known Git hosting service
      const validHosts = ['github.com', 'gitlab.com', 'bitbucket.org'];
      if (!validHosts.some(host => parsedUrl.hostname.includes(host))) {
        return false;
      }

      // Must have a valid path structure
      const pathParts = parsedUrl.pathname.split('/').filter(p => p.length > 0);
      if (pathParts.length < 2) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

}