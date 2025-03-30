# AI Router Node

This node analyzes input content and routes it to different outputs based on content analysis. It can use both keyword matching and AI Language Models to make intelligent routing decisions.

## Configuration

### Basic Configuration

- **Analysis Field**: Specify which field from the input to analyze. Leave empty to auto-detect content from common fields (text, content, message).

### Routes

- **Routes**: Define up to 3 routes with a name and description for each.
  - **Name**: A unique identifier for the route (will appear on the output)
  - **Description**: Detailed explanation of when to use this route (used by AI for classification)

### Advanced Options

- **Debug Mode**: Enable to see detailed logs of the routing process
- **Use AI for Analysis**: Use the connected Language Model for routing decisions
- **AI Model Prompt**: Custom prompt for the AI model (advanced)

## Inputs

- **Main Input**: The data to be analyzed and routed
- **LM Input**: (Optional) Connect to a Language Model for AI-powered routing

## Outputs

- **Default**: Used when no matching route is found
- **Route 1-3**: One output for each route defined in the configuration

## Example Usage

### Customer Support Router

Define routes for:
1. Technical Issues
2. Billing Questions
3. General Inquiries

The AI Router will analyze incoming messages and direct them to the appropriate department for handling.

### Content Moderation

Define routes for:
1. Approved Content
2. Content Needing Review
3. Rejected Content

Connect an AI model to analyze submissions and automatically sort them based on content policies.

## Notes

- For best results with AI routing, provide clear and distinct descriptions for each route
- Test with Debug Mode enabled to see how routing decisions are made
- The node can work without an AI model by using keyword matching only 