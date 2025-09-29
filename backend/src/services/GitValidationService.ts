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
   * Get project logo URL from a Git repository
   */
  async getProjectLogoUrl(repositoryUrl: string, branch: string = 'main'): Promise<string | null> {
    console.log(`🔍 [LOGO ENTRY] Starting logo fetch for ${repositoryUrl}:${branch}`);

    try {
      const parsedUrl = new URL(repositoryUrl);
      console.log(`🔍 [LOGO ENTRY] Parsed URL hostname: ${parsedUrl.hostname}`);

      // For GitHub repositories, get the organization/user avatar
      if (parsedUrl.hostname.includes('github.com')) {
        const pathParts = parsedUrl.pathname.split('/').filter(p => p.length > 0);
        if (pathParts.length >= 2) {
          const owner = pathParts[0];
          // GitHub avatar URL format: https://avatars.githubusercontent.com/u/USERNAME?v=4
          // First, try to get the user/org info to get the numeric ID, but fallback to username
          const avatarUrl = `https://avatars.githubusercontent.com/${owner}?v=4`;

          console.log(`🔍 [LOGO DEBUG] Checking GitHub avatar for ${owner}: ${avatarUrl}`);

          try {
            // Create abort controller for timeout instead of AbortSignal.timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            // Verify the avatar exists
            const response = await fetch(avatarUrl, {
              method: 'HEAD',
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log(`🔍 [LOGO DEBUG] Response status for ${owner}: ${response.status}`);

            if (response.ok) {
              console.log(`✅ [LOGO] Found logo for ${owner}: ${avatarUrl}`);
              return avatarUrl;
            } else {
              console.log(`❌ [LOGO DEBUG] Non-OK response for ${owner}: ${response.status} ${response.statusText}`);
            }
          } catch (error) {
            console.error(`❌ [LOGO DEBUG] Error fetching avatar for ${owner}:`, error);
          }
        }
      }

      // For GitLab repositories, try to get the user/group avatar
      else if (parsedUrl.hostname.includes('gitlab.com')) {
        const pathParts = parsedUrl.pathname.split('/').filter(p => p.length > 0);
        if (pathParts.length >= 2) {
          const owner = pathParts[0];
          // GitLab avatar URL format: https://gitlab.com/uploads/-/system/user/avatar/ID/avatar.png
          // Since we don't have the ID, we'll fallback to checking for common logo files
          const avatarUrl = `https://gitlab.com/${owner}.png`;

          try {
            const response = await fetch(avatarUrl, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
              console.log(`✅ [LOGO] Found GitLab logo for ${owner}: ${avatarUrl}`);
              return avatarUrl;
            }
          } catch (error) {
            // Continue to file-based approach for GitLab
          }
        }
      }

      // Fallback: Look for common logo files in the repository
      const logoFiles = [
        'logo.png', 'logo.svg', 'logo.jpg', 'logo.jpeg',
        'icon.png', 'icon.svg', 'icon.jpg', 'icon.jpeg',
        'assets/logo.png', 'assets/logo.svg', 'assets/icon.png', 'assets/icon.svg',
        'docs/logo.png', 'docs/logo.svg', 'docs/icon.png', 'docs/icon.svg',
        '.github/logo.png', '.github/logo.svg', '.github/icon.png', '.github/icon.svg',
        'images/logo.png', 'images/logo.svg', 'images/icon.png', 'images/icon.svg'
      ];

      for (const logoFile of logoFiles) {
        try {
          const rawUrl = this.constructRawUrl(repositoryUrl, logoFile, branch);
          if (!rawUrl) {
            continue;
          }

          const response = await fetch(rawUrl, {
            method: 'HEAD', // Just check if file exists
            signal: AbortSignal.timeout(5000) // 5 seconds timeout
          });

          if (response.ok) {
            console.log(`✅ [LOGO] Found repository logo at: ${rawUrl}`);
            return rawUrl;
          }
        } catch (error) {
          // Continue to next logo file
          continue;
        }
      }

    } catch (error) {
      console.error('Error fetching project logo:', error);
    }

    console.log(`📄 [LOGO] No logo found for ${repositoryUrl}`);
    return null;
  }

  /**
   * Get file content from a Git repository using raw URLs
   */
  async getFileContent(repositoryUrl: string, filePath: string, branch: string = 'main'): Promise<string | null> {
    console.log(`Fetching file content from ${repositoryUrl}:${branch}/${filePath}`);

    try {
      const rawUrl = this.constructRawUrl(repositoryUrl, filePath, branch);
      if (!rawUrl) {
        console.warn(`Could not construct raw URL for ${repositoryUrl}`);
        return null;
      }

      console.log(`Fetching content from raw URL: ${rawUrl}`);

      const response = await fetch(rawUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'ToolHive-Registry-UI'
        },
        // Set a reasonable timeout
        signal: AbortSignal.timeout(10000) // 10 seconds
      });

      if (!response.ok) {
        console.warn(`Failed to fetch file content: HTTP ${response.status} ${response.statusText}`);
        return null;
      }

      const content = await response.text();
      console.log(`Successfully fetched ${content.length} characters from ${filePath}`);
      return content;
    } catch (error) {
      console.error(`Error fetching file content:`, error);
      return null;
    }
  }

  /**
   * Construct raw URL for fetching file content from Git hosting services
   */
  private constructRawUrl(repositoryUrl: string, filePath: string, branch: string): string | null {
    try {
      const parsedUrl = new URL(repositoryUrl);

      // Remove .git suffix if present
      let pathname = parsedUrl.pathname;
      if (pathname.endsWith('.git')) {
        pathname = pathname.slice(0, -4);
      }

      // Handle different Git hosting providers
      if (parsedUrl.hostname.includes('github.com')) {
        // GitHub raw URL format: https://raw.githubusercontent.com/owner/repo/branch/path
        const pathParts = pathname.split('/').filter(p => p.length > 0);
        if (pathParts.length >= 2) {
          const [owner, repo] = pathParts;
          return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        }
      } else if (parsedUrl.hostname.includes('gitlab.com')) {
        // GitLab raw URL format: https://gitlab.com/owner/repo/-/raw/branch/path
        return `https://gitlab.com${pathname}/-/raw/${branch}/${filePath}`;
      } else if (parsedUrl.hostname.includes('bitbucket.org')) {
        // Bitbucket raw URL format: https://bitbucket.org/owner/repo/raw/branch/path
        return `https://bitbucket.org${pathname}/raw/${branch}/${filePath}`;
      }

      console.warn(`Unsupported Git hosting service: ${parsedUrl.hostname}`);
      return null;
    } catch (error) {
      console.error('Error constructing raw URL:', error);
      return null;
    }
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