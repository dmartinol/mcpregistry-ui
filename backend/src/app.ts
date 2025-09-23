import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
import { registriesRouter } from './api/registries';
app.use('/api/v1/registries', registriesRouter);

// Server-specific routes
import { Router } from 'express';
import { KubernetesClient } from './services/KubernetesClient';

const serversRouter = Router();
const kubernetesClient = new KubernetesClient();

// DELETE /api/v1/servers/:serverId
serversRouter.delete('/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { namespace } = req.query;

    // Use the namespace from query params, or default to toolhive-system
    const targetNamespace = (namespace as string) || 'toolhive-system';

    await kubernetesClient.deleteMCPServer(serverId, targetNamespace);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting server:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: `Server '${req.params.serverId}' not found` });
      } else {
        res.status(500).json({ error: `Failed to delete server: ${error.message}` });
      }
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.use('/api/v1/servers', serversRouter);

// Unregistered servers routes
import { OrphanedServer } from './services/KubernetesClient';

const orphanedServersRouter = Router();

// GET /api/v1/orphaned-servers (unregistered servers)
orphanedServersRouter.get('/', async (req, res) => {
  try {
    const { namespace } = req.query;
    const targetNamespace = (namespace as string) || 'toolhive-system';

    const orphanedServers = await kubernetesClient.getOrphanedMCPServers(targetNamespace);

    res.json({
      servers: orphanedServers,
      total: orphanedServers.length,
      namespace: targetNamespace,
    });
  } catch (error) {
    console.error('Error fetching unregistered servers:', error);
    res.status(500).json({ error: 'Failed to fetch unregistered servers' });
  }
});

// POST /api/v1/orphaned-servers/:serverId/connect
orphanedServersRouter.post('/:serverId/connect', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { namespace } = req.query;
    const { registryName, registryNamespace, serverNameInRegistry } = req.body;

    if (!registryName || !registryNamespace || !serverNameInRegistry) {
      res.status(400).json({
        error: 'Missing required fields: registryName, registryNamespace, serverNameInRegistry',
      });
      return;
    }

    const targetNamespace = (namespace as string) || 'toolhive-system';

    // Verify registry exists
    const registry = await kubernetesClient.getMCPRegistry(registryName);
    if (!registry) {
      res.status(404).json({ error: `Registry '${registryName}' not found` });
      return;
    }

    const updatedServer = await kubernetesClient.connectServerToRegistry(
      serverId,
      registryName,
      registryNamespace,
      serverNameInRegistry,
      targetNamespace
    );

    res.json({
      status: 'success',
      message: `Server '${serverId}' connected to registry '${registryName}'`,
      server: updatedServer,
    });
  } catch (error) {
    console.error('Error connecting server to registry:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: `Failed to connect server: ${error.message}` });
      }
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.use('/api/v1/orphaned-servers', orphanedServersRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

export { app };