# Claude Code Docker Integration Setup

This application uses [docker-claude-code](https://github.com/webedt/docker-claude-code) to provide AI-powered chat features with Claude Code running in Docker containers.

## How It Works

Instead of using API keys, this system uses OAuth authentication with Claude:

1. Users save their `credentials.json` file (containing OAuth tokens) in their account settings
2. The credentials are securely encrypted and stored in the database
3. When users chat with Claude, their credentials are used to authenticate with a Docker container running Claude Code
4. Claude Code runs with full agent capabilities in an isolated Docker environment

## Prerequisites

- Docker installed and running
- The `docker-claude-code` container running and accessible
- User credentials from Claude (obtained through OAuth login)

## Setup Instructions

### 1. Run the docker-claude-code Container

First, you need to have the docker-claude-code container running. You can use the image from the repository:

```bash
# Pull and run the docker-claude-code container
docker run -d \
  --name claude-code-api \
  -p 3002:3000 \
  -v /tmp:/workspace \
  ghcr.io/webedt/docker-claude-code:latest
```

**Note**: The container runs on port 3000 internally, but we map it to 3002 externally to avoid conflicts.

### 2. Configure Environment Variables

Add the following environment variable to your deployment:

```bash
DOCKER_CLAUDE_CODE_URL=http://host.docker.internal:3002
```

- For **local development**: Use `http://localhost:3002`
- For **Docker Compose**: Use `http://claude-code-api:3000` (container name)
- For **deployed environments**: Use the appropriate internal network URL

### 3. Get Your Claude Credentials

You need to obtain your Claude OAuth credentials. These are typically stored in:

```
~/.config/claude-code/credentials.json
```

The format should look like this:

```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "expiresAt": 1234567890,
    "scopes": ["user:inference", "user:profile"]
  }
}
```

### 4. Add Credentials in the Application

1. Log in to the application
2. Go to **Account Settings** (click your profile icon in the sidebar)
3. Scroll down to the **"Claude Code Credentials"** section
4. Paste your credentials.json content into the text area
5. Click **"Save Credentials"**
6. (Optional) Click **"Test Connection"** to verify the credentials are valid

### 5. Start Chatting!

Once your credentials are saved:

1. Navigate to the **"Claude Code"** page in the sidebar (🤖 icon)
2. Type your message and press Enter
3. Claude Code will respond with full agent capabilities running in the Docker container

## Architecture

```
User Browser
    ↓
Frontend (Chat UI)
    ↓
Backend API (/api/claude/chat)
    ↓ (with user credentials)
Docker Container (docker-claude-code)
    ↓
Claude API (via OAuth)
```

## Security Notes

- Credentials are stored encrypted in the PostgreSQL database
- Each user's credentials are isolated and only accessible by that user
- Docker containers provide process isolation for Claude Code execution
- The `/tmp` directory is used as workspace to prevent filesystem conflicts

## Troubleshooting

### "Failed to create session with Claude Code container"

- Ensure the docker-claude-code container is running: `docker ps | grep claude-code`
- Check the container logs: `docker logs claude-code-api`
- Verify the `DOCKER_CLAUDE_CODE_URL` environment variable is set correctly

### "No Claude credentials found"

- Make sure you've added your credentials in Account Settings
- Verify the JSON format is correct (should have `claudeAiOauth` key)
- Try the "Test Connection" button to validate the credentials

### "Credentials are expired"

- OAuth tokens expire after a certain time
- The refresh token should automatically refresh the access token
- If issues persist, you may need to re-authenticate and get new credentials

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DOCKER_CLAUDE_CODE_URL` | URL to the docker-claude-code container | `http://host.docker.internal:3002` | No |
| `DATABASE_URL` | PostgreSQL connection string for storing credentials | - | Yes (for persistence) |

## Docker Compose Example

If you want to run everything together:

```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      - DOCKER_CLAUDE_CODE_URL=http://claude-code-api:3000
      - DATABASE_URL=postgresql://user:pass@db:5432/dbname
    ports:
      - "3000:3000"
    depends_on:
      - claude-code-api
      - db

  claude-code-api:
    image: ghcr.io/webedt/docker-claude-code:latest
    ports:
      - "3002:3000"
    volumes:
      - /tmp:/workspace

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=dbname
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

## Benefits of This Approach

✅ **No API Keys**: Uses OAuth authentication (more secure, better UX)
✅ **Full Agent Capabilities**: Claude Code runs with access to tools and filesystem
✅ **Process Isolation**: Each session runs in a Docker container
✅ **Multi-User**: Each user can use their own credentials
✅ **Persistent Sessions**: Chat history is maintained across page refreshes

## Further Reading

- [docker-claude-code Repository](https://github.com/webedt/docker-claude-code)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Anthropic OAuth Documentation](https://docs.anthropic.com)
