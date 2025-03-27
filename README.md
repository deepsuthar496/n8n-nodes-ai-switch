# n8n-nodes-airouter

This is an n8n node that provides AI-powered routing capabilities. It automatically analyzes content and routes workflow execution based on the analysis, supporting both AI-based and keyword-based routing strategies.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow these steps to install this node:

### Community Nodes (Recommended)

For users on n8n v0.187+:

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-airouter` in **Enter npm package name**
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes
5. Select **Install**

### Manual Installation

To get started install the package in your n8n root directory:

```bash
# Using npm
npm install n8n-nodes-airouter

# Using pnpm
pnpm install n8n-nodes-airouter
```

For Docker-based installations, add the following line to your `Dockerfile`:

```dockerfile
RUN cd /usr/local/lib/node_modules/n8n && npm install n8n-nodes-airouter
```

## Operations

The AI Router node supports the following operations:

- **AI-Based Routing**: Automatically analyzes content using AI models and routes based on the analysis
- **Keyword-Based Routing**: Falls back to keyword matching when AI analysis is not available
- **Debug Mode**: Provides detailed logging of the routing process
- **Custom Routes**: Supports multiple custom routing paths with descriptions
- **Default Route**: Handles cases when no matching route is found

## Compatibility

This node has been tested with n8n version 1.0+ and should work with any newer version. It requires Node.js version 18.10.0 or newer.

## Usage

1. Add the AI Router node to your workflow
2. Configure the Analysis Field (e.g., 'message', 'content', etc.)
3. Add custom routes with descriptions
4. (Optional) Enable Debug Mode for detailed logging
5. Connect the node to your workflow paths

### Example Workflow

Here's a basic example of using the AI Router node:

1. Chat Trigger node → AI Router node
2. Configure AI Router:
   - Set Analysis Field to "message"
   - Add routes:
     - "Fruit" → "Handle fruit-related queries"
     - "Weather" → "Handle weather-related queries"
   - Set default route for unmatched content

The node will automatically analyze incoming messages and route them to the appropriate path based on content analysis.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Example workflows](https://n8n.io/workflows)

## License

[MIT](LICENSE.md)
