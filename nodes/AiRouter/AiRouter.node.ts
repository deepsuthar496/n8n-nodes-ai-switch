import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

// Function to generate outputs based on the defined routes
const configuredOutputs = (parameters: INodeParameters) => {
	// Safely access the routes values with proper typing
	const routesParameter = parameters.routes as { values?: Array<{ name: string }> } | undefined;
	const routes = routesParameter?.values || [];
	
	// Create an array of outputs starting with the default output
	const outputsList = [
		{
			type: NodeConnectionType.Main,
			displayName: 'Default',
		},
	];
	
	// Add outputs for each defined route
	routes.forEach((route) => {
		outputsList.push({
			type: NodeConnectionType.Main,
			displayName: route.name || `Route ${outputsList.length}`,
		});
	});
	
	return outputsList;
};

export class AiRouter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Router',
		name: 'aiRouter',
		icon: 'file:AiRouter.svg',
		group: ['routing'],
		version: 1,
		description: 'Automatically routes workflow based on AI analysis',
		defaults: {
			name: 'AI Router',
			color: '#00AAFF',
		},
		inputs: [
			{
				type: NodeConnectionType.Main,
				displayName: 'Input',
			},
			{
				type: 'ai_languageModel' as NodeConnectionType,
				displayName: 'Language Model',
				required: true,
				maxConnections: 1,
			},
		],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		properties: [
			{
				displayName: 'Routes',
				name: 'routes',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				placeholder: 'Add Route',
				options: [
					{
						name: 'values',
						displayName: 'Routes',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of this route for identification',
								required: true,
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'Description of when this route should be taken (for AI understanding)',
								typeOptions: {
									rows: 3,
								},
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Analysis Field',
				name: 'analysisField',
				type: 'string',
				default: '',
				description: 'The JSON field from input data to analyze for routing decisions',
				required: true,
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{
						name: 'Route Index (Default)',
						value: 'index',
						description: 'Return only the route index',
					},
					{
						name: 'Structured Response',
						value: 'structured',
						description: 'Return index and reasoning in JSON format',
					},
				],
				default: 'index',
				description: 'How the AI should format its routing decision',
			},
			{
				displayName: 'Debug Mode',
				name: 'debugMode',
				type: 'boolean',
				default: false,
				description: 'If enabled, adds analysis info to output data',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const routes = this.getNodeParameter('routes.values', 0, []) as Array<{
			name: string;
			description: string;
		}>;
		const analysisField = this.getNodeParameter('analysisField', 0, '') as string;
		const responseFormat = this.getNodeParameter('responseFormat', 0, 'index') as string;
		const debugMode = this.getNodeParameter('debugMode', 0, false) as boolean;

		// Initialize output arrays (Default + routes)
		const returnData: INodeExecutionData[][] = Array(routes.length + 1)
			.fill(0)
			.map(() => []);

		if (debugMode) {
			this.logger.info(`AI Router processing ${items.length} items with ${routes.length} routes`);
		}

		// Process each item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const item = items[itemIndex];
				
				// Get the content to analyze from the specified field
				let contentToAnalyze = '';
				if (analysisField) {
					// Access nested properties using dot notation
					const keys = analysisField.split('.');
					let current: any = item.json;
					
					for (const key of keys) {
						if (current && current[key] !== undefined) {
							current = current[key];
						} else {
							current = null;
							break;
						}
					}
					
					contentToAnalyze = current ? current.toString() : '';
					
					if (debugMode) {
						this.logger.info(`Field ${analysisField}: ${JSON.stringify(current)}`);
						this.logger.info(`Item data: ${JSON.stringify(item.json)}`);
					}
					
					// If content is empty, check if there are direct properties we can use
					if (!contentToAnalyze && item.json) {
						// Try common field names for chat/message content
						const possibleFields = ['chatInput', 'message', 'text', 'content', 'input'];
						for (const field of possibleFields) {
							if (item.json[field]) {
								contentToAnalyze = item.json[field].toString();
								if (debugMode) {
									this.logger.info(`Found content in alternative field '${field}': ${contentToAnalyze}`);
								}
								break;
							}
						}
						
						// Check for AI agent output format which can be nested
						if (!contentToAnalyze && item.json.output) {
							const output = item.json.output as any;
							if (typeof output === 'string') {
								contentToAnalyze = output;
							} else if (output && typeof output === 'object' && 'text' in output) {
								contentToAnalyze = output.text.toString();
							} else if (output && typeof output === 'object' && 'content' in output) {
								contentToAnalyze = output.content.toString();
							}
							
							if (contentToAnalyze && debugMode) {
								this.logger.info(`Found content in AI agent output field: ${contentToAnalyze}`);
							}
						}
						
						// Check for more AI-specific output formats
						if (!contentToAnalyze) {
							// Handle Agents output format (may include additional metadata)
							if (item.json.result) {
								const result = item.json.result as any;
								if (typeof result === 'string') {
									contentToAnalyze = result;
								} else if (typeof result === 'object') {
									// Try common response properties
									const possibleResultFields = ['output', 'response', 'text', 'content', 'message'];
									for (const field of possibleResultFields) {
										if (result[field]) {
											contentToAnalyze = result[field].toString();
											break;
										}
									}
								}
								
								if (contentToAnalyze && debugMode) {
									this.logger.info(`Found content in result field: ${contentToAnalyze}`);
								}
							}
						}
						
						// Look for classic AI response formats
						if (!contentToAnalyze && item.json.response) {
							const response = item.json.response as any;
							if (typeof response === 'string') {
								contentToAnalyze = response;
							} else if (response && typeof response === 'object' && 'text' in response) {
								contentToAnalyze = response.text.toString();
							}
							
							if (contentToAnalyze && debugMode) {
								this.logger.info(`Found content in response field: ${contentToAnalyze}`);
							}
						}
					}
				}
				
				if (debugMode) {
					this.logger.info(`Final content to analyze: "${contentToAnalyze}"`);
				}
				
				if (!contentToAnalyze) {
					// If no content to analyze, route to default
					if (debugMode) {
						this.logger.info('No content to analyze, routing to default output');
					}
					returnData[0].push(item);
					continue;
				}

				// Check for direct matching without calling the LM
				// If text contains route name or certain keywords, route directly
				let directMatchFound = false;
				
				// Only perform direct keyword matching if explicitly specified in the description
				for (let i = 0; i < routes.length; i++) {
					const route = routes[i];
					const routeIndex = i + 1;
					
					// Extract keyword from "has word X" pattern in description
					const moreKeywords = route.description.toLowerCase().match(/has\s+word\s+(['"]?)([a-z0-9_]+)(\1)/i);
					
					if (moreKeywords && moreKeywords[2]) {
						const keyword = moreKeywords[2].toLowerCase();
						const contentLower = contentToAnalyze.toLowerCase();
						
						// Only match if the word appears as a whole word
						const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
						const hasMatch = wordRegex.test(contentLower);
						
						if (hasMatch) {
							if (debugMode) {
								this.logger.info(`Direct keyword match found: "${keyword}" for route ${routeIndex}`);
								item.json.aiRouterAnalysis = {
									matchType: 'direct_keyword',
									matchedKeyword: keyword,
									routeIndex,
									routeName: route.name,
									content: contentToAnalyze,
								};
							}
							returnData[routeIndex].push(item);
							directMatchFound = true;
							break;
						}
					}
				}
				
				if (directMatchFound) {
					continue;
				}

				// If no direct match found, proceed with AI model
				
				// Prepare prompt for the AI model
				let prompt = 'You are a content router that analyzes text and routes it to the most appropriate destination.\n\n';
				prompt += `Content to analyze: "${contentToAnalyze}"\n\n`;
				prompt += 'Available routes:\n';
				
				routes.forEach((route, index) => {
					prompt += `${index + 1}. ${route.name}: ${route.description}\n`;
				});
				
				if (responseFormat === 'index') {
					prompt += '\nRespond with ONLY the number of the most appropriate route, or 0 if none apply.';
				} else {
					prompt += '\nRespond with a JSON object containing: { "routeIndex": (number), "reasoning": "explanation" }';
				}

				// Get the connected AI model
				const aiModel = await this.getInputConnectionData('ai_languageModel', itemIndex);

				// Print debug information
				if (debugMode) {
					this.logger.info(`AI Model obtained: ${aiModel ? 'Yes' : 'No'}`);
					this.logger.info(`AI Model type: ${aiModel ? typeof aiModel : 'N/A'}`);
					if (aiModel) {
						this.logger.info(`AI Model methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(aiModel)).join(', ')}`);
					}
				}

				if (!aiModel) {
					if (debugMode) {
						this.logger.info('No AI model connected, routing to default');
					}
					returnData[0].push({
						...item,
						json: {
							...item.json,
							aiRouterError: 'No AI language model connected',
						},
					});
					continue;
				}

				// Query the AI model
				let result;
				try {
					if (debugMode) {
						this.logger.info('Invoking AI model with prompt: ' + prompt);
					}
					
					// For LangChain AI models in n8n
					const anyModel = aiModel as any;
					
					// Based on the error logs, we can see this is a LangChain model
					// Let's try to call it correctly using the model's specific methods
					try {
						// Create a proper chat message format for LangChain models
						const chatMessage = {
							role: 'user',
							content: prompt,
						};
						
						// Try calling the model with the appropriate method
						if (typeof anyModel._generate === 'function') {
							// This is the internal LangChain method
							this.logger.info('Using _generate method directly');
							result = await anyModel._generate([chatMessage]);
							
							// Extract the response from the typical LangChain response format
							if (result && result.generations && result.generations[0] && result.generations[0][0]) {
								result = result.generations[0][0].text;
							}
						}
						// If the model has invocationParams it's likely a LangChain model
						else if (typeof anyModel.invocationParams === 'function') {
							// Create a properly formatted messages array
							const messages = [chatMessage];
							
							// Use langchain's call method which should handle chat messages
							this.logger.info('Using LangChain call with messages format');
							
							if (typeof anyModel.call === 'function') {
								result = await anyModel.call(messages);
							} else if (typeof anyModel.invoke === 'function') {
								// For newer LangChain models
								result = await anyModel.invoke({
									messages: messages
								});
							}
						} 
						// For n8n's standard language model interface
						else if (typeof anyModel.sendMessages === 'function') {
							this.logger.info('Using sendMessages method');
							result = await anyModel.sendMessages([{
								role: 'user',
								content: prompt,
							}]);
						}
						// For older n8n language model interface
						else if (typeof anyModel.generate === 'function') {
							this.logger.info('Using generate method');
							result = await anyModel.generate(prompt);
						}
						// Last resort - try typical LLM methods
						else if (typeof anyModel.call === 'function') {
							this.logger.info('Using call method');
							result = await anyModel.call(prompt);
						} else {
							throw new Error('Could not find a compatible method to call the AI model');
						}
					} catch (methodError) {
						if (debugMode) {
							this.logger.error(`Method call error: ${methodError.message}`);
							
							// Try to get more information about the model
							this.logger.info(`AI Model keys: ${Object.keys(anyModel).join(', ')}`);
							
							// Check if there's a specific way to create chat messages
							if (typeof anyModel.createChatMessages === 'function') {
								this.logger.info('Model has createChatMessages method');
							}
						}
						
						// Try a simpler approach - some models just work with strings
						if (typeof anyModel.predict === 'function') {
							this.logger.info('Using predict method');
							result = await anyModel.predict(prompt);
						} else {
							// If all attempts fail, throw the original error
							throw methodError;
						}
					}
					
					if (debugMode) {
						this.logger.info(`AI model response type: ${typeof result}`);
						this.logger.info('AI model response: ' + JSON.stringify(result));
					}
				} catch (error) {
					if (debugMode) {
						this.logger.error('AI model error: ' + error.message);
					}
					
					// If AI model fails, fall back to rule-based decision
					// Look for simple keyword matches without "has word" syntax requirement
					if (debugMode) {
						this.logger.info('AI model failed, trying simple keyword matching as fallback');
					}
					
					let fallbackRouteIndex = 0;
					
					for (let i = 0; i < routes.length; i++) {
						const route = routes[i];
						const routeIndex = i + 1;
						
						// Extract keywords from route name and description
						const routeWords = route.name.toLowerCase().split(/\s+/)
							.concat(route.description.toLowerCase().split(/\s+/))
							.filter(word => word.length > 3) // Only consider words with 4+ chars
							.filter(word => !['with', 'this', 'that', 'when', 'word', 'has', 'the', 'and', 'for', 'any'].includes(word));
						
						const contentLower = contentToAnalyze.toLowerCase();
						
						// Check if content contains any meaningful words from route
						for (const word of routeWords) {
							if (contentLower.includes(word)) {
								if (debugMode) {
									this.logger.info(`Fallback match found: "${word}" in route ${routeIndex}`);
								}
								fallbackRouteIndex = routeIndex;
								break;
							}
						}
						
						if (fallbackRouteIndex > 0) break;
					}
					
					if (fallbackRouteIndex > 0) {
						// Add fallback routing info if debug is enabled
						if (debugMode) {
							item.json.aiRouterAnalysis = {
								matchType: 'fallback_keyword',
								aiError: error.message,
								fallbackRoute: fallbackRouteIndex,
								routeName: routes[fallbackRouteIndex - 1].name,
							};
						}
						returnData[fallbackRouteIndex].push(item);
						continue;
					}
					
					// If no fallback match, route to default
					if (debugMode) {
						item.json.aiRouterAnalysis = {
							matchType: 'error',
							aiError: error.message,
							routedTo: 'default',
						};
					}
					returnData[0].push(item);
					continue;
				}

				// Parse the AI response
				let routeIndex = 0; // Default route
				let reasoning = '';
				let responseText = '';
				
				// Handle the response based on its structure
				if (typeof result === 'string') {
					responseText = result;
				} else if (result && result.text) {
					responseText = result.text;
				} else if (result && result.response) {
					responseText = result.response;
				} else if (result && result.output) {
					responseText = result.output;
				} else {
					responseText = JSON.stringify(result);
				}
				
				if (debugMode) {
					this.logger.info('Processed response text: ' + responseText);
				}
				
				if (responseFormat === 'structured') {
					try {
						// Try to parse JSON response
						let jsonResponse = null;
						
						try {
							jsonResponse = JSON.parse(responseText.trim());
						} catch (e) {
							// If direct parsing fails, try to extract JSON from the response
							const jsonMatch = responseText.match(/\{[\s\S]*\}/);
							if (jsonMatch) {
								try {
									jsonResponse = JSON.parse(jsonMatch[0]);
								} catch (innerError) {
									// Failed to parse extracted JSON
								}
							}
						}
						
						if (jsonResponse && typeof jsonResponse.routeIndex === 'number') {
							routeIndex = jsonResponse.routeIndex;
							reasoning = jsonResponse.reasoning || '';
						}
					} catch (error) {
						// If parsing fails, try to extract number
						const match = /(\d+)/.exec(responseText);
						if (match) {
							routeIndex = parseInt(match[1], 10);
						}
					}
				} else {
					// For index format, extract the first number
					const match = /(\d+)/.exec(responseText);
					if (match) {
						routeIndex = parseInt(match[1], 10);
					}
				}

				// Ensure route index is valid
				if (routeIndex < 0 || routeIndex > routes.length) {
					routeIndex = 0; // Default route if invalid
				}

				// Add debugging info if enabled
				if (debugMode) {
					item.json.aiRouterAnalysis = {
						prompt,
						rawResponse: result,
						selectedRoute: routeIndex === 0 ? 'Default' : routes[routeIndex - 1].name,
						reasoning,
					};
				}

				// Add item to appropriate output
				if (routeIndex === 0) {
					// For default route, pass through the original item
					returnData[routeIndex].push(item);
				} else {
					// For custom routes, we need to EXACTLY match the default route's behavior
					// The key is to pass the item through with minimal modification
					const routeItem = item; // Use the exact same item
					
					// Only add the routing metadata
					if (!routeItem.json.aiRouterInfo) {
						routeItem.json = {
							...routeItem.json,
							aiRouterInfo: {
								routeName: routes[routeIndex - 1].name,
								routeIndex,
								reasoning,
							},
						};
					}
					
					if (debugMode) {
						this.logger.info(`Routing item to ${routes[routeIndex - 1].name}`);
						this.logger.info(`Item structure: ${JSON.stringify(Object.keys(routeItem.json))}`);
						this.logger.info(`Output content: ${routeItem.json.output}`);
					}
					
					returnData[routeIndex].push(routeItem);
				}
				
			} catch (error) {
				if (this.continueOnFail()) {
					returnData[0].push({
						json: {
							...items[itemIndex].json,
							error: error.message,
						},
						pairedItem: itemIndex,
					});
				} else {
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return returnData;
	}
} 