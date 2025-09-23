# ToolHive Registry UI - Kubernetes Deployment

Simple Kubernetes deployment manifests for the ToolHive Registry UI application.

## 📁 Files

- **`rbac.yaml`** - ServiceAccount and permissions
- **`configmap.yaml`** - Application configuration
- **`deployment.yaml`** - Main application deployment
- **`service.yaml`** - Service definition
- **`ingress.yaml`** - External access configuration
- **`kustomization.yaml`** - Kustomize configuration

## 🚀 Quick Deploy

**Prerequisites:**
- Kubernetes cluster with `kubectl` access
- Container image built and available
- NGINX Ingress Controller (optional, for external access)

### 1. Build the Image

```bash
# From project root
docker build -t toolhive/registry-ui:latest .
```

### 2. Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace toolhive-system

# Apply all manifests
kubectl apply -k k8s/ -n toolhive-system

# Check deployment status
kubectl get pods -n toolhive-system
```

### 3. Access the Application

**Via Port Forward (immediate access):**
```bash
kubectl port-forward svc/toolhive-registry-ui 8080:80 -n toolhive-system
# Access at: http://localhost:8080
```

**Via Ingress (external access):**
- Default domain: `https://registry.toolhive.local`
- Add to `/etc/hosts`: `127.0.0.1 registry.toolhive.local`
- Or change the domain in `ingress.yaml`

## ⚙️ Configuration

### Custom Domain
Edit `ingress.yaml` line 54:
```yaml
- host: your-domain.com  # Change this
```

### Custom Image
Edit `kustomization.yaml` lines 29-30:
```yaml
images:
- name: toolhive/registry-ui
  newTag: your-tag  # Change this
```

### Environment Variables
Edit `configmap.yaml` to modify:
- `KUBERNETES_NAMESPACE` - Target namespace for MCP resources
- `LOG_LEVEL` - Logging verbosity
- `NODE_ENV` - Environment setting

## 🔧 Common Tasks

### Update Image
```bash
kubectl set image deployment/toolhive-registry-ui registry-ui=toolhive/registry-ui:new-tag -n toolhive-system
```

### View Logs
```bash
kubectl logs -f deployment/toolhive-registry-ui -n toolhive-system
```

### Scale Application
```bash
kubectl scale deployment/toolhive-registry-ui --replicas=3 -n toolhive-system
```

### Check Health
```bash
kubectl get pods -n toolhive-system -l app.kubernetes.io/name=toolhive-registry-ui
```

## 🗑️ Remove

```bash
kubectl delete -f k8s/ -n toolhive-system
kubectl delete namespace toolhive-system  # If no other resources
```

## 🔒 RBAC Permissions

The application needs permissions to manage MCP resources:
- `mcpregistries` and `mcpservers` - Full CRUD access
- `services/proxy` - For API calls to registry services
- `configmaps`, `secrets` - Read configuration

All permissions are defined in `rbac.yaml`.

## 🌐 Access Methods

| Method | URL | Use Case |
|--------|-----|----------|
| Port Forward | `http://localhost:8080` | Development/testing |
| Ingress | `https://registry.toolhive.local` | Production access |
| NodePort | `http://<node-ip>:30080` | Direct access (uncomment in service.yaml) |

## 📊 Monitoring

The deployment includes:
- **Health checks** - Liveness and readiness probes on `/api/health`
- **Metrics** - Prometheus annotations for scraping
- **Logging** - JSON structured logs to stdout

---

**That's it!** The deployment is designed to be simple and straightforward. For advanced configurations, see the individual YAML files.