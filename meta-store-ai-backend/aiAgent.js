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
        this.functionToExecute = null;
        this.productToLoad = null;
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
           
           you can then ONLY use the function names in the execute_product_function to invoke a function try to execute a function if it is applicable to the query
           
           DO NOT include any links in your responses, Keep you answers short.
        `;

        const productsLookupTool = new DynamicTool({
            name: "load_product_information",
            description: `Searches product information for a single product by its ID.
                    Returns the product information`,
            func: async (productID) => {
                const filePath = `${__dirname}/info/${productID}.txt`;
                const data = fs.readFileSync(filePath);
                return data.toString();
            }
        });

        const executeFunctionTool = new DynamicTool({
            name: "execute_product_function",
            description: `Executes a FUNCTION found in the product's information. you may ONLY supply function names
            found within the FUNCTIONS array for the product`,
            func: (functionName) => {
                this.functionToExecute = functionName;
                return "Success"
            }
        });

        const getProductNamesTool = new DynamicTool({
            name: "get_products",
            description: `Retrieves a list of all the products the store has,
            returns the information in an array where there are two fields name and product ID`,
            func: (input) => {
                return JSON.stringify([
                    {name: "Squishable duck", productID: 'x-123-h12'},
                    {name: "Velvet Chair", productID: 's-378-jur'},
                    {name: "Adidas Shoe", productID: 'w-789-kjl'}
                ])
            }
        });

        const loadProductTool = new DynamicTool({
            name: "load_product",
            description: `Instructs the client to load a given productID to their interface`,
            func: (productID) => {
                console.log(productID);
                this.productToLoad = productID;
                return "Success"
            }
        })

        const tools = [productsLookupTool, executeFunctionTool, getProductNamesTool, loadProductTool];
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
            this.functionToExecute = null;
            this.productToLoad = null;
            const result = await this.agentExecutor.invoke({ input: prompt, chat_history: this.chatHistory});
            this.chatHistory.push(new HumanMessage(prompt));
            this.chatHistory.push(new AIMessage(result.output));
            if (this.agentExecutor.returnIntermediateSteps) {
                console.log(JSON.stringify(result.intermediateSteps, null, 2));
            }
            console.log({message: result.output, functionToExecute: this.functionToExecute, productToLoad: this.productToLoad});
            return {message: result.output, functionToExecute: this.functionToExecute, productToLoad: this.productToLoad};
        } catch (e) {
            console.error(e);
            return {message: "ERROR", functionToExecute: null, productToLoad: null};
        }
    }
}

module.exports = AIAgent;
