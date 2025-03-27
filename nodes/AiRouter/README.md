# AI Router Node for n8n

The AI Router node uses artificial intelligence to automatically analyze incoming data and route it to different paths in your workflow based on the content.

## Setup

1. Add the AI Router node to your workflow
2. Connect a Language Model to the node's Language Model input
3. Define routes by clicking "Add Route" button
4. For each route, provide:
   - **Name**: A unique name for the route (will be displayed on the output)
   - **Description**: A clear description of when this route should be used (this will help the AI understand when to route to this path)
5. Set the **Analysis Field** to specify which field in your input data should be analyzed
6. Optionally configure advanced settings

## Settings

- **Analysis Field**: The JSON field from your input data that contains the content to analyze (e.g., `message` or `data.content`)
- **Response Format**: 
  - **Route Index**: The AI will respond with just the route number (more efficient)
  - **Structured Response**: The AI will provide the route number and reasoning in JSON format
- **Debug Mode**: When enabled, adds AI analysis details to the output data

## How it Works

1. For each item that enters the node, the AI Router extracts content from the specified field
2. The AI model analyzes the content and compares it against the route descriptions
3. Based on the analysis, the item is sent to the matching output path
4. If no route matches or if the AI can't determine a route, the item is sent to the default output

## Example Use Cases

- **Support Ticket Routing**: Automatically route tickets to different departments based on content
- **Email Classification**: Sort emails into different categories
- **Content Moderation**: Direct content to approval or rejection paths based on AI analysis
- **Data Processing Workflows**: Route data to different processing paths based on content type

## Tips

- Provide clear, distinct descriptions for each route
- For best results, use a capable language model that handles routing well
- Enable Debug Mode when testing to see how the AI is making decisions
- The more different your routes are from each other, the more accurate the routing will be 