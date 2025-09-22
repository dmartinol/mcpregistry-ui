# ToolHive Registry Management - Deployment Guide

## Overview

This guide covers deploying the ToolHive Registry Management Application to Kubernetes clusters, both for development and production environments.

## Prerequisites

### Required Software
- Kubernetes cluster (v1.24+)
- ToolHive operator installed and running
- Helm 3.x
- kubectl configured with cluster access

### Required Permissions
The application requires RBAC permissions to manage ToolHive resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: registry-ui-role
  namespace: toolhive-system
rules:
- apiGroups: ["toolhive.stacklok.dev"]
  resources: ["mcpregistries", "mcpservers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
```

## Deployment Methods

### Method 1: Helm Chart (Recommended)

The application includes a Helm chart for easy deployment with customizable configurations.

#### Basic Installation

```bash
# Add the repository (if using external chart repository)
helm repo add toolhive-registry https://charts.example.com/toolhive

# Install with default values
helm install registry-ui ./charts/registry-ui \
  --namespace toolhive-system \
  --create-namespace
```

#### Custom Configuration

Create a `values.yaml` file:

```yaml
# values.yaml
global:
  environment: production

backend:
  image:
    repository: toolhive/registry-backend
    tag: "1.0.0"
    pullPolicy: IfNotPresent

  replicas: 2

  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

  env:
    NODE_ENV: production
    LOG_LEVEL: info
    CORS_ORIGIN: "https://registry-ui.example.com"

  service:
    type: ClusterIP
    port: 8000

frontend:
  image:
    repository: toolhive/registry-frontend
    tag: "1.0.0"
    pullPolicy: IfNotPresent

  replicas: 2

  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi

  service:
    type: ClusterIP
    port: 3000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"

  hosts:
    - host: registry-ui.example.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
        - path: /api
          pathType: Prefix
          service: backend

  tls:
    - secretName: registry-ui-tls
      hosts:
        - registry-ui.example.com

rbac:
  create: true
  serviceAccountName: registry-ui

monitoring:
  enabled: true
  prometheus:
    enabled: true
    port: 9090
  grafana:
    dashboard: true

security:
  networkPolicy:
    enabled: true
  podSecurityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  securityContext:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop:
        - ALL
```

Install with custom values:

```bash
helm install registry-ui ./charts/registry-ui \
  --namespace toolhive-system \
  --values values.yaml
```

#### Upgrading

```bash
# Upgrade to new version
helm upgrade registry-ui ./charts/registry-ui \
  --namespace toolhive-system \
  --values values.yaml

# Rollback if needed
helm rollback registry-ui 1 --namespace toolhive-system
```

### Method 2: Manual Kubernetes Manifests

For environments without Helm, use raw Kubernetes manifests:

#### Namespace and RBAC

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: toolhive-system
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: registry-ui
  namespace: toolhive-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: registry-ui-role
  namespace: toolhive-system
rules:
- apiGroups: ["toolhive.stacklok.dev"]
  resources: ["mcpregistries", "mcpservers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: registry-ui-binding
  namespace: toolhive-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: registry-ui-role
subjects:
- kind: ServiceAccount
  name: registry-ui
  namespace: toolhive-system
```

#### Backend Deployment

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-ui-backend
  namespace: toolhive-system
  labels:
    app: registry-ui
    component: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: registry-ui
      component: backend
  template:
    metadata:
      labels:
        app: registry-ui
        component: backend
    spec:
      serviceAccountName: registry-ui
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: backend
        image: toolhive/registry-backend:1.0.0
        ports:
        - containerPort: 8000
          name: http
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "8000"
        - name: LOG_LEVEL
          value: info
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: registry-ui-backend
  namespace: toolhive-system
  labels:
    app: registry-ui
    component: backend
spec:
  selector:
    app: registry-ui
    component: backend
  ports:
  - port: 8000
    targetPort: 8000
    name: http
```

#### Frontend Deployment

```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-ui-frontend
  namespace: toolhive-system
  labels:
    app: registry-ui
    component: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: registry-ui
      component: frontend
  template:
    metadata:
      labels:
        app: registry-ui
        component: frontend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: frontend
        image: toolhive/registry-frontend:1.0.0
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: VITE_API_BASE_URL
          value: "/api/v1"
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: registry-ui-frontend
  namespace: toolhive-system
  labels:
    app: registry-ui
    component: frontend
spec:
  selector:
    app: registry-ui
    component: frontend
  ports:
  - port: 3000
    targetPort: 3000
    name: http
```

#### Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: registry-ui
  namespace: toolhive-system
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - registry-ui.example.com
    secretName: registry-ui-tls
  rules:
  - host: registry-ui.example.com
    http:
      paths:
      - path: /api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: registry-ui-backend
            port:
              number: 8000
      - path: /()(.*)
        pathType: Prefix
        backend:
          service:
            name: registry-ui-frontend
            port:
              number: 3000
```

Apply manifests:

```bash
kubectl apply -f namespace.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f ingress.yaml
```

## Environment-Specific Configurations

### Development Environment

```yaml
# dev-values.yaml
global:
  environment: development

backend:
  replicas: 1
  env:
    NODE_ENV: development
    LOG_LEVEL: debug

  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi

frontend:
  replicas: 1
  resources:
    requests:
      cpu: 25m
      memory: 64Mi
    limits:
      cpu: 100m
      memory: 128Mi

ingress:
  enabled: false

monitoring:
  enabled: false
```

### Staging Environment

```yaml
# staging-values.yaml
global:
  environment: staging

backend:
  replicas: 1
  env:
    NODE_ENV: staging
    LOG_LEVEL: info

frontend:
  replicas: 1

ingress:
  enabled: true
  hosts:
    - host: registry-ui-staging.example.com

monitoring:
  enabled: true
```

### Production Environment

```yaml
# prod-values.yaml
global:
  environment: production

backend:
  replicas: 3
  env:
    NODE_ENV: production
    LOG_LEVEL: warn

  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

frontend:
  replicas: 3
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

ingress:
  enabled: true
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"

monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    dashboard: true

security:
  networkPolicy:
    enabled: true
  podSecurityContext:
    runAsNonRoot: true
```

## Monitoring and Observability

### Prometheus Metrics

The application exposes metrics on `/metrics` endpoint:

- `http_requests_total` - Total number of HTTP requests
- `http_request_duration_seconds` - HTTP request duration
- `registry_sync_duration_seconds` - Registry sync operation duration
- `active_instances_total` - Number of active instances
- `kubernetes_api_requests_total` - Kubernetes API request count

### Grafana Dashboard

Import the provided Grafana dashboard from `charts/registry-ui/dashboards/registry-ui.json`.

### Logging

Application logs are structured JSON and include:
- Request/response logging
- Registry sync events
- Kubernetes operation events
- Error tracking

Configure log aggregation with your preferred solution (ELK, Fluentd, etc.).

## Security Considerations

### Network Policies

Enable network policies to restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: registry-ui-policy
  namespace: toolhive-system
spec:
  podSelector:
    matchLabels:
      app: registry-ui
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
    - protocol: TCP
      port: 3000
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443  # Kubernetes API
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
```

### Pod Security Standards

Use Pod Security Standards to enforce security policies:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: toolhive-system
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Image Security

- Use distroless or minimal base images
- Scan images for vulnerabilities
- Use specific image tags, not `latest`
- Enable image pull policies

## Troubleshooting

### Common Issues

**Pod startup failures**:
```bash
# Check pod status
kubectl get pods -n toolhive-system

# View pod logs
kubectl logs -n toolhive-system deployment/registry-ui-backend

# Describe pod for events
kubectl describe pod -n toolhive-system <pod-name>
```

**RBAC permission errors**:
```bash
# Check service account permissions
kubectl auth can-i get mcpregistries --as=system:serviceaccount:toolhive-system:registry-ui -n toolhive-system

# View role bindings
kubectl get rolebindings -n toolhive-system
```

**Ingress issues**:
```bash
# Check ingress status
kubectl get ingress -n toolhive-system

# View ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Health Checks

Verify deployment health:

```bash
# Check application health
curl https://registry-ui.example.com/api/v1/health

# Check Kubernetes resources
kubectl get all -n toolhive-system -l app=registry-ui

# Monitor resource usage
kubectl top pods -n toolhive-system
```

## Backup and Recovery

### Configuration Backup

```bash
# Backup Helm values
helm get values registry-ui -n toolhive-system > backup-values.yaml

# Backup Kubernetes manifests
kubectl get all -n toolhive-system -o yaml > backup-manifests.yaml
```

### Disaster Recovery

1. **Restore from backup**:
   ```bash
   helm install registry-ui ./charts/registry-ui \
     --namespace toolhive-system \
     --values backup-values.yaml
   ```

2. **Scale up replicas** if needed:
   ```bash
   kubectl scale deployment registry-ui-backend --replicas=3 -n toolhive-system
   kubectl scale deployment registry-ui-frontend --replicas=3 -n toolhive-system
   ```

## Performance Tuning

### Resource Optimization

- Monitor CPU and memory usage
- Adjust resource requests/limits based on actual usage
- Use Horizontal Pod Autoscaler for dynamic scaling
- Configure resource quotas at namespace level

### Scaling Configuration

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: registry-ui-backend-hpa
  namespace: toolhive-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: registry-ui-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

This completes the deployment guide for the ToolHive Registry Management Application.