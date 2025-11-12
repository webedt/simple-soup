# Feature Comparison: webedt → simple-soup

Features from the [webedt repository](https://github.com/ETdoFresh/webedt) that could be implemented in simple-soup.

## Authentication & Authorization

- [ ] **GitHub OAuth Integration** - Replace/supplement email/password authentication with GitHub OAuth for seamless developer onboarding and repository access
- [ ] **OAuth Token Management** - Store and manage GitHub access tokens for repository operations and API calls
- [ ] **Social Login Options** - Expand beyond GitHub to support Google, GitLab, Bitbucket OAuth providers

## Container & Environment Management

- [ ] **Isolated Containerized Workspaces** - Provide each session with its own Docker container with independent `/workspace` directory for true isolation
- [ ] **Per-Session Container Provisioning** - Automatically create and destroy Docker containers for each active session lifecycle
- [ ] **Multi-Tenant Workspace Isolation** - Ensure complete filesystem and process isolation between different user sessions
- [ ] **Container Resource Limits** - Set CPU, memory, and storage quotas per container to prevent resource exhaustion
- [ ] **Container Health Monitoring** - Track container status, resource usage, and automatically restart failed containers

## AI Agent Integration

- [ ] **Claude Code SDK Integration** - Enable AI-powered code editing and assistance within containerized sessions
- [ ] **Multiple AI Framework Support** - Support Codex SDK, Claude Code SDK, and Droid CLI for diverse AI agent capabilities
- [ ] **Agent Action Execution** - Allow AI agents to execute commands, modify files, and interact with the development environment
- [ ] **Agent Session Persistence** - Maintain AI agent conversation history and context across session restarts
- [ ] **AI-Powered Code Suggestions** - Integrate real-time code completion and refactoring suggestions

## Real-Time Communication

- [ ] **Bidirectional WebSocket Communication** - Implement WebSocket servers for real-time data exchange between orchestrator and service containers
- [ ] **Real-Time Log Streaming** - Stream container logs and application output to the frontend in real-time
- [ ] **Live Terminal Access** - Provide web-based terminal access to containerized environments via WebSocket
- [ ] **Collaborative Editing Channels** - Enable multiple users to collaborate on the same session with live updates
- [ ] **Event-Driven Architecture** - Implement pub/sub pattern for container events (start, stop, error, output)

## Deployment & Infrastructure

- [ ] **Automatic HTTPS Provisioning** - Automatically generate and renew Let's Encrypt SSL certificates for each session
- [ ] **Unique Session Domains** - Assign unique subdomains (e.g., `session-abc123.etdofresh.com`) to each active session
- [ ] **Dokploy API Integration** - Leverage Dokploy API for automated application provisioning, deployment, and management
- [ ] **Nixpacks Build Detection** - Automatically detect project types and configure appropriate build environments
- [ ] **Docker Swarm Compatibility** - Support deployment to Docker Swarm clusters for scalability
- [ ] **Zero-Downtime Deployments** - Implement blue-green or rolling deployment strategies for session updates

## Session Management Enhancements

- [ ] **Session Lifecycle Hooks** - Add onCreate, onStart, onStop, onDestroy hooks for custom session logic
- [ ] **Session State Persistence** - Persist full workspace state (files, environment variables, running processes) between restarts
- [ ] **Session Snapshots** - Create and restore snapshots of workspace states at any point in time
- [ ] **Session Templates** - Provide pre-configured templates for common project types (React, Node.js, Python, etc.)
- [ ] **Session Sharing** - Allow users to share read-only or collaborative access to their sessions
- [ ] **Session Cloning** - Duplicate existing sessions with all configurations and files
- [ ] **Automatic Session Timeout** - Automatically stop inactive sessions after configurable idle period
- [ ] **Session Resource Monitoring** - Display CPU, memory, disk usage per session in real-time

## Git & Repository Integration

- [ ] **GitHub Repository Access** - Clone and interact with GitHub repositories using authenticated user's credentials
- [ ] **Repository Auto-Cloning** - Automatically clone selected repository into session workspace on creation
- [ ] **Git Operations UI** - Provide UI for common git operations (commit, push, pull, branch management)
- [ ] **Git Webhook Integration** - Trigger actions on push, pull request, or other GitHub events
- [ ] **Repository Selection UI** - Browse and select from user's accessible GitHub repositories
- [ ] **Branch Management** - Create, switch, merge branches from the UI
- [ ] **Diff Viewer** - Visual diff viewer for file changes and commit history

## Data Persistence & Storage

- [ ] **SQLite Integration** - Replace PostgreSQL/in-memory storage with SQLite for simpler deployment
- [ ] **Workspace Volume Persistence** - Persist session workspaces to Docker volumes for data durability
- [ ] **Backup & Restore** - Automated backup of session data and workspace files
- [ ] **Database Migration System** - Implement migration system for schema changes (e.g., using Knex or Prisma)
- [ ] **File Upload/Download** - Allow users to upload files to or download files from session workspaces
- [ ] **Cloud Storage Integration** - Optional S3/GCS integration for large file storage

## Architecture & Scalability

- [ ] **Git Submodule Architecture** - Restructure as submodules for better separation between orchestrator and service apps
- [ ] **Main App (Orchestrator)** - Central control plane managing users, sessions, database, Dokploy integration, WebSocket servers
- [ ] **Service App (Per-Session)** - Lightweight container image with runtime environment, agent execution, backhaul communication
- [ ] **Shared Type Definitions** - Create shared TypeScript types package for communication protocols between apps
- [ ] **Microservices Architecture** - Separate concerns into distinct services (auth, sessions, containers, logs)
- [ ] **Message Queue Integration** - Add Redis or RabbitMQ for async task processing (container creation, deployments)
- [ ] **Horizontal Scaling** - Support multiple orchestrator instances behind load balancer

## Logging & Monitoring

- [ ] **Dedicated Logs Portal** - Create separate subdomain (logs.etdofresh.com) for viewing deployment and container logs
- [ ] **Structured Logging** - Implement structured JSON logging with log levels and metadata
- [ ] **Log Aggregation** - Centralize logs from all containers into searchable database
- [ ] **Log Filtering & Search** - Provide UI for filtering logs by session, timestamp, level, search terms
- [ ] **Error Tracking** - Integrate error tracking (Sentry) for monitoring application and container errors
- [ ] **Performance Metrics** - Track and display metrics (response times, throughput, error rates)
- [ ] **Audit Logging** - Log all user actions (session creation, file modifications, deployments)

## Frontend & UX Enhancements

- [ ] **React Migration** - Migrate from Vanilla TypeScript to React for better component architecture
- [ ] **Vite for Production** - Leverage Vite for both development and production builds
- [ ] **Component Library** - Create reusable component library (buttons, modals, forms, etc.)
- [ ] **Session Dashboard** - Visual dashboard showing all sessions with status, resource usage, quick actions
- [ ] **Code Editor Integration** - Embed Monaco Editor or CodeMirror for in-browser code editing
- [ ] **Terminal Emulator** - Integrate xterm.js for in-browser terminal access to containers
- [ ] **File Explorer UI** - Tree view for navigating and managing workspace files
- [ ] **Responsive Mobile UI** - Optimize UI for tablet and mobile viewing

## Security Enhancements

- [ ] **Container Sandboxing** - Implement additional security layers (AppArmor, Seccomp profiles) for containers
- [ ] **Network Isolation** - Isolate container networks with configurable firewall rules
- [ ] **Secrets Management** - Secure storage and injection of API keys, tokens, credentials into containers
- [ ] **Rate Limiting** - Implement rate limiting on API endpoints and WebSocket connections
- [ ] **CSRF Protection** - Add CSRF tokens for state-changing operations
- [ ] **Content Security Policy** - Implement strict CSP headers for XSS protection
- [ ] **Automatic Security Updates** - Keep base container images updated with security patches

## Developer Experience

- [ ] **Hot Module Replacement in Containers** - Enable HMR for code changes within containerized sessions
- [ ] **Quick Start Templates** - Pre-built templates for popular frameworks (Next.js, Express, Flask, etc.)
- [ ] **Environment Variable Management** - UI for setting and managing environment variables per session
- [ ] **Port Forwarding** - Automatically expose and forward container ports to public URLs
- [ ] **Pre-built Docker Images** - Maintain library of optimized base images for faster container startup
- [ ] **CLI Tool** - Command-line tool for managing sessions from local terminal
- [ ] **VS Code Extension** - Extension for creating and managing sessions directly from VS Code
- [ ] **API Documentation** - Interactive API docs (Swagger/OpenAPI) for programmatic access

## Collaboration Features

- [ ] **Real-Time Collaboration** - Multiple users can edit files simultaneously with conflict resolution
- [ ] **Session Invitations** - Invite collaborators via email or shareable link
- [ ] **Role-Based Session Access** - Define roles (owner, editor, viewer) per session
- [ ] **Chat & Comments** - Built-in chat and code commenting for collaboration
- [ ] **Activity Feed** - Show recent actions and changes by all session collaborators
- [ ] **Screen Sharing** - Share terminal or browser output with other session users

## Integration & Extensibility

- [ ] **Webhook Support** - Allow users to configure webhooks for session events
- [ ] **Plugin System** - Create plugin architecture for extending functionality
- [ ] **REST API** - Comprehensive REST API for all operations (sessions, containers, users)
- [ ] **GraphQL API** - Alternative GraphQL API for flexible querying
- [ ] **SDK/Client Libraries** - Official SDKs in JavaScript, Python, Go for API integration
- [ ] **Third-Party Integrations** - Connect with Slack, Discord, Jira, Linear, etc.

## Analytics & Insights

- [ ] **Usage Analytics** - Track session creation, duration, resource consumption per user
- [ ] **Cost Tracking** - Calculate and display infrastructure costs per session/user
- [ ] **User Activity Dashboard** - Admin dashboard showing user engagement and system health
- [ ] **Session Analytics** - Insights into most popular templates, average session duration, etc.
- [ ] **Export Reports** - Generate and export usage reports (CSV, PDF)

## Billing & Monetization (Optional)

- [ ] **Stripe Integration** - Payment processing for premium features
- [ ] **Subscription Tiers** - Free, Lite, Plus, Pro tiers with different resource limits
- [ ] **Usage-Based Billing** - Charge based on compute hours, storage, or bandwidth
- [ ] **Invoice Generation** - Automatic invoice generation and email delivery
- [ ] **Payment History** - User-facing payment history and receipt downloads

---

## Implementation Priority Recommendations

### High Priority (Core Improvements)
1. Real-Time Communication (WebSockets)
2. Isolated Containerized Workspaces
3. GitHub OAuth Integration
4. Real-Time Log Streaming
5. Session Lifecycle Hooks

### Medium Priority (Enhanced Functionality)
1. AI Agent Integration
2. Automatic HTTPS Provisioning
3. Unique Session Domains
4. React Migration
5. SQLite Integration
6. Code Editor Integration

### Low Priority (Nice-to-Have)
1. Collaboration Features
2. Analytics & Insights
3. CLI Tool
4. Plugin System
5. Billing & Monetization

---

**Total Features Identified:** 100+

**Repository Comparison:**
- **simple-soup (current):** Basic CRUD app with auth, sessions, users, themes
- **webedt (source):** Advanced containerized development environment platform with isolation, AI agents, real-time communication, and automated infrastructure

**Migration Strategy:**
Start with architectural foundations (containerization, WebSockets), then layer on user-facing features (GitHub OAuth, log streaming, code editor), and finally add advanced capabilities (AI agents, collaboration, analytics).
