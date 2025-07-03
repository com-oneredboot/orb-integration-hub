# Task Master AI - Claude Development Workflow

## Quick Start for New Projects

1. **Initialize**: `initialize_project` (MCP) or `task-master init`
2. **Parse PRD**: `parse_prd` with your PRD file path
3. **Expand Tasks**: `analyze_project_complexity` then `expand_task` on key tasks
4. **Start Working**: `next_task` to get started

## Daily Development Workflow

### Core MCP Commands (Primary Usage)

```javascript
// Essential daily commands
next_task;                    // Get next available task
get_task;                     // View task details: get_task(id)
set_task_status;              // Complete tasks: set_task_status(id, "done")
get_tasks;                    // List all tasks with status

// Task management
expand_task;                  // Break task into subtasks: expand_task(id)
update_subtask;               // Log implementation notes: update_subtask(id, "notes")
add_task;                     // Add new task: add_task("description")

// Analysis (as needed)
analyze_project_complexity;   // Analyze complexity before expanding tasks
```

### Typical Session Flow

1. **Start Session**: `next_task` - Find what to work on
2. **Review Details**: `get_task(id)` - Understand requirements  
3. **Plan Implementation**: Use Context7 for examples/docs, Perplexity for research
4. **Log Progress**: `update_subtask(id, "implementation approach...")` 
5. **Complete**: `set_task_status(id, "done")`
6. **Repeat**: `next_task` for next task

## MCP Server Configuration

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here"
      }
    },
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-perplexity"],
      "env": {
        "PERPLEXITY_API_KEY": "your_key_here"
      }
    },
    "context7": {
      "command": "context7-mcp-server",
      "env": {
        "CONTEXT7_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Project Structure

```
monorepo/
├── .taskmaster/
│   ├── tasks/tasks.json      # Main task database
│   ├── docs/prd.txt         # Your PRD files
│   └── config.json          # AI model config
├── .mcp.json               # MCP server config
├── CLAUDE.md              # This file
├── backend/               # Python backend
├── frontend/              # Angular frontend
└── .env                   # API keys
```

## Python/Angular Monorepo Patterns

### Task Organization
- **Infrastructure tasks**: Database, API setup, deployment
- **Backend tasks**: Python API endpoints, data models, business logic
- **Frontend tasks**: Angular components, services, routing
- **Integration tasks**: API integration, end-to-end testing

### Implementation Workflow
1. Start with backend API design and data models
2. Implement Python endpoints with proper testing
3. Create Angular services and components
4. Integration testing across the stack

### Using Research Tools
- **Perplexity**: For technical research, best practices, troubleshooting
- **Context7**: For accurate Python/Angular examples and documentation
- **Task Master**: Track progress across both frontend and backend work

## Task ID Reference

- Main tasks: `1`, `2`, `3` (high-level features)
- Subtasks: `1.1`, `1.2` (specific implementations)
- Status: `pending` → `in-progress` → `done`

## Essential API Keys

Required in `.env` and `.mcp.json`:
- `ANTHROPIC_API_KEY` - Claude models (required)
- `PERPLEXITY_API_KEY` - Research features (highly recommended)
- `CONTEXT7_API_KEY` - Documentation and examples

## Common Issues & Solutions

### Task Management
- **Stuck on complex task**: Use `expand_task(id)` to break it down
- **Need research**: Ask Perplexity for technical guidance
- **Need examples**: Use Context7 for Python/Angular patterns
- **Progress tracking**: Always use `update_subtask` to log your approach

### MCP Connection
- Check `.mcp.json` configuration matches your setup
- Verify all API keys are properly set
- Restart Claude Code if MCP servers aren't responding

### Monorepo Development
- Use task dependencies for backend → frontend workflows
- Log implementation details in subtasks for both Python and Angular code
- Track API contracts and data models in task descriptions

## Quick Reference

```javascript
// Start working
next_task;

// During implementation  
get_task(id);                              // Review requirements
update_subtask(id, "approach: ...");      // Log your plan
update_subtask(id, "progress: ...");      // Log what's working

// Complete work
set_task_status(id, "done");

// Need help
// Use Perplexity for research
// Use Context7 for code examples
// Use expand_task for complex tasks
```
