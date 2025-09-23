const express = require('express');
const app = express();
const port = 9000;

// Mock registry server implementing /v0/servers endpoint
app.get('/v0/servers', (req, res) => {
  res.json({
    servers: [
      {
        name: 'live-web-crawler',
        image: 'registry.example.com/live-web-crawler:2.1.0',
        version: '2.1.0',
        description: 'Real web crawler from live registry API',
        tags: ['web', 'crawler', 'live'],
        capabilities: ['tools', 'resources'],
        author: 'Live Registry Team',
        repository: 'https://github.com/live-registry/web-crawler',
        documentation: 'https://docs.live-registry.com/web-crawler'
      },
      {
        name: 'live-data-processor',
        image: 'registry.example.com/live-data-processor:1.5.0',
        version: '1.5.0',
        description: 'Real-time data processing tool from live registry',
        tags: ['data', 'processing', 'live', 'real-time'],
        capabilities: ['tools'],
        author: 'Live Registry Team',
        repository: 'https://github.com/live-registry/data-processor'
      },
      {
        name: 'live-ai-assistant',
        image: 'registry.example.com/live-ai-assistant:latest',
        description: 'AI assistant tool fetched from live registry API',
        tags: ['ai', 'assistant', 'live'],
        capabilities: ['tools', 'resources'],
        author: 'AI Team'
      }
    ],
    total: 3,
    version: 'v0'
  });
});

// Mock registry server implementing /v0/servers/deployed endpoint
app.get('/v0/servers/deployed', (req, res) => {
  res.json({
    servers: [
      {
        name: 'deployed-web-crawler',
        image: 'registry.example.com/live-web-crawler:2.1.0',
        version: '2.1.0',
        description: 'Deployed web crawler instance',
        tags: ['web', 'crawler', 'deployed', 'running'],
        capabilities: ['tools', 'resources'],
        author: 'Live Registry Team',
        repository: 'https://github.com/live-registry/web-crawler'
      },
      {
        name: 'deployed-ai-assistant',
        image: 'registry.example.com/live-ai-assistant:latest',
        version: 'latest',
        description: 'Deployed AI assistant instance',
        tags: ['ai', 'assistant', 'deployed', 'running'],
        capabilities: ['tools', 'resources'],
        author: 'AI Team'
      }
    ],
    total: 2,
    version: 'v0'
  });
});

// Individual server endpoints with enhanced data
app.get('/v0/servers/live-web-crawler', (req, res) => {
  res.json({
    name: 'live-web-crawler',
    image: 'registry.example.com/live-web-crawler:2.1.0',
    version: '2.1.0',
    description: 'Real web crawler from live registry API with enhanced details',
    tags: ['web', 'crawler', 'live'],
    capabilities: ['tools', 'resources'],
    author: 'Live Registry Team',
    repository: 'https://github.com/live-registry/web-crawler',
    documentation: 'https://docs.live-registry.com/web-crawler',
    tools: ['scrape_page', 'extract_links', 'capture_screenshot', 'parse_html'],
    env_vars: [
      {
        name: 'CRAWLER_TIMEOUT',
        description: 'Maximum time to wait for page load (in seconds)',
        required: false,
        secret: false
      },
      {
        name: 'API_KEY',
        description: 'API key for authenticated requests',
        required: true,
        secret: true
      }
    ],
    metadata: {
      last_updated: '2024-01-15T10:30:00Z',
      pulls: 15420,
      stars: 234
    },
    repository_url: 'https://github.com/live-registry/web-crawler'
  });
});

app.get('/v0/servers/live-data-processor', (req, res) => {
  res.json({
    name: 'live-data-processor',
    image: 'registry.example.com/live-data-processor:1.5.0',
    version: '1.5.0',
    description: 'Real-time data processing tool from live registry with enhanced capabilities',
    tags: ['data', 'processing', 'live', 'real-time'],
    capabilities: ['tools'],
    author: 'Live Registry Team',
    repository: 'https://github.com/live-registry/data-processor',
    tools: ['transform_csv', 'validate_json', 'aggregate_data', 'filter_records'],
    env_vars: [
      {
        name: 'BATCH_SIZE',
        description: 'Number of records to process in each batch',
        required: false,
        secret: false
      },
      {
        name: 'DATABASE_URL',
        description: 'Connection string for the database',
        required: true,
        secret: true
      }
    ],
    metadata: {
      last_updated: '2024-01-10T14:20:00Z',
      pulls: 8903,
      stars: 156
    },
    repository_url: 'https://github.com/live-registry/data-processor'
  });
});

app.get('/v0/servers/live-ai-assistant', (req, res) => {
  res.json({
    name: 'live-ai-assistant',
    image: 'registry.example.com/live-ai-assistant:latest',
    description: 'AI assistant tool fetched from live registry API with enhanced features',
    tags: ['ai', 'assistant', 'live'],
    capabilities: ['tools', 'resources'],
    author: 'AI Team',
    tools: ['chat_completion', 'text_analysis', 'summarize_text', 'translate_text', 'code_review'],
    env_vars: [
      {
        name: 'MODEL_NAME',
        description: 'Name of the AI model to use',
        required: false,
        secret: false
      },
      {
        name: 'OPENAI_API_KEY',
        description: 'API key for OpenAI services',
        required: true,
        secret: true
      }
    ],
    metadata: {
      last_updated: '2024-01-20T09:15:00Z',
      pulls: 23567,
      stars: 489
    },
    repository_url: 'https://github.com/ai-team/live-ai-assistant'
  });
});

app.listen(port, () => {
  console.log(`Test registry server running at http://localhost:${port}`);
  console.log(`Servers endpoint: http://localhost:${port}/v0/servers`);
  console.log(`Individual server endpoints: http://localhost:${port}/v0/servers/{name}`);
});