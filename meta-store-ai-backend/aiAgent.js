require('dotenv').config();
const fs = require('fs');
const { AgentExecutor } = require("langchain/agents");
const { OpenAIFunctionsAgentOutputParser } = require("langchain/agents/openai/output_parser");
const { AzureChatOpenAI} = require("@langchain/openai");
const { DynamicTool } = require("@langchain/core/tools");
const { RunnableSequence } = require("@langchain/core/runnables");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { MessagesPlaceholder, ChatPromptTemplate } = require("@langchain/core/prompts");
const { convertToOpenAIFunction } = require("@langchain/core/utils/function_calling");
const { formatToOpenAIFunctionMessages } = require("langchain/agents/format_scratchpad");

class AIAgent {
    constructor() {
        this.chatModel = new AzureChatOpenAI(
            {
                openAIApiKey: process.env.AZURE_OPENAI_API_KEY,
                openAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
                openAIBasePath: process.env.AZURE_OPENAI_BASE_PATH,
                deploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
            }
        );

        // initialize the chat history
        this.chatHistory = [];
        this.agentExecutor = this.buildAgentExecutor();
    }

    buildAgentExecutor() {
        const systemMessage = `
            You are a helpful, fun and friendly sales assistant for Cosmic Works, an online store.
    
            Your name is Cosmo.
    
            You are designed to answer questions about the products that Cosmic Works sells, the customers that buy them, and the sales orders that are placed by customers.
    
            If you don't know the answer to a question, respond with "I don't know."
            
            You will receive follow up messages about a product a user is looking at. The information will also contain a FUNCTIONS section which you can invoke to demonstrate some product feature
            
            For example, a loaded product info might look like below
            
            
            User has loaded our blue velvet chair, it has hand crafted wooden legs made by artisan woodworkers
            FUNCTIONS: [show_red_variant, show_chair_legs] 
            
            The user may then ask: "does this come in any other colors?"       
            
            and your message response could look like: "Yes! we have a red variant! INVOKE: show_red_variant"
            
            the invocation of a function MUST match the pattern 
            
            INVOKE: function name 
            
            And it MUST be at the end of your response
        `;

        const productsLookupTool = new DynamicTool({
            name: "load_product_information",
            description: `Searches product information for a single product by its ID.
                    Returns the product information`,
            func: async (input) => {
                const data = fs.readFileSync("./info.txt");
                return data.toString();
            }
        });

        const tools = [productsLookupTool];
        const modelWithFunctions = this.chatModel.bind({
            functions: tools.map((tool) => convertToOpenAIFunction(tool))
        });

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemMessage],
            new MessagesPlaceholder("chat_history"),
            ["human", "{input}"],
            new MessagesPlaceholder("agent_scratchpad")
        ]);

        const runnableAgent = RunnableSequence.from([
            {
                input: (i) => i.input,
                agent_scratchpad: (i) => formatToOpenAIFunctionMessages(i.steps),
                chat_history: (i) => i.chat_history
            },
            prompt,
            modelWithFunctions,
            new OpenAIFunctionsAgentOutputParser()
        ]);

        return AgentExecutor.fromAgentAndTools({
            agent: runnableAgent,
            tools,
            // returnIntermediateSteps: true
        });
    }

    addMessage(chatHistoryMessage) {
        this.chatHistory.push(chatHistoryMessage);
    }

    async executeAgent(prompt) {
        try {
            const result = await this.agentExecutor.invoke({ input: prompt, chat_history: this.chatHistory });
            this.chatHistory.push(new HumanMessage(prompt));
            this.chatHistory.push(new AIMessage(result.output));
            if (this.agentExecutor.returnIntermediateSteps) {
                console.log(JSON.stringify(result.intermediateSteps, null, 2));
            }
            return result.output;
        } catch (e) {
            console.error(e);
            return "ERROR"
        }
    }
}

module.exports = AIAgent;
