require('dotenv').config();
const { MongoClient } = require('mongodb');
const { AgentExecutor } = require("langchain/agents");
const { OpenAIFunctionsAgentOutputParser } = require("langchain/agents/openai/output_parser");
const { formatToOpenAIFunctionMessages } = require("langchain/agents/format_scratchpad");
const { DynamicTool } = require("@langchain/core/tools");
const { RunnableSequence } = require("@langchain/core/runnables");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { MessagesPlaceholder, ChatPromptTemplate } = require("@langchain/core/prompts");
const { convertToOpenAIFunction } = require("@langchain/core/utils/function_calling");
const { AzureChatOpenAI} = require("@langchain/openai");
const { AzureCosmosDBVectorStore } = require("@langchain/community/vectorstores/azure_cosmosdb");
const {AzureKeyCredential, OpenAIClient} = require("@azure/openai");

class CosmicWorksAIAgent {
    constructor() {
        this.dbClient = new MongoClient(process.env.AZURE_COSMOSDB_CONNECTION_STRING);
        const azureCosmosDBConfig = {
            client: this.dbClient,
            databaseName: "cosmic_works",
            collectionName: "products",
            indexName: "VectorSearchIndex",
            embeddingKey: "contentVector",
            textKey: "_id"
        }

        const openAIClient = new OpenAIClient(process.env.AZURE_OPENAI_BASE_PATH, new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY));
        class CustomOpenAIEmbedding {
            embedQuery(document){
                return openAIClient.getEmbeddings(process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME, document).then(result => {
                    return result.data[0].embedding;
                });
            }
        }

        this.vectorStore = new AzureCosmosDBVectorStore(new CustomOpenAIEmbedding(), azureCosmosDBConfig);

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

        // initialize the agent executor
        (async () => {
            this.agentExecutor = await this.buildAgentExecutor();
        })();
    }

    formatDocuments(docs) {
        let strDocs = "";
        for (let index = 0; index < docs.length; index++) {
            const doc = docs[index];
            const docFormatted = {"_id": doc.pageContent};
            Object.assign(docFormatted, doc.metadata);

            if ("contentVector" in docFormatted) {
                delete docFormatted["contentVector"];
            }
            if ("tags" in docFormatted) {
                delete docFormatted["tags"];
            }

            strDocs += JSON.stringify(docFormatted, null, '\t');

            if (index <= docs.length -1) {
                strDocs += "\n";
            }
        }

        strDocs += "\n\n";
        return strDocs;
    }

    async buildAgentExecutor() {
        const systemMessage = `
        You are a helpful, fun and friendly sales assistant for Cosmic Works, a bicycle and bicycle accessories store.

        Your name is Cosmo.

        You are designed to answer questions about the products that Cosmic Works sells, the customers that buy them, and the sales orders that are placed by customers.

        If you don't know the answer to a question, respond with "I don't know."
        
        Only answer questions related to Cosmic Works products, customers, and sales orders.
        
        If a question is not related to Cosmic Works products, customers, or sales orders,
        respond with "I only answer questions about Cosmic Works"          
    `;

        const retrieverChain = this.vectorStore.asRetriever().pipe(this.formatDocuments);

        const productsRetrieverTool = new DynamicTool({
            name: "products_retriever_tool",
            description: `Searches Cosmic Works product information for similar products based on the question. 
                    Returns the product information in JSON format.`,
            func: async (input) => await retrieverChain.invoke(input)
        })

        const productsLookupTool = new DynamicTool({
            name: "product_sku_lookup_tool",
            description: `Searches Cosmic Works product information for a single product by its SKU.
                    Returns the product information in JSON format.
                    If the product is not found, returns null.`,
            func: async (input) => {
                const db = this.dbClient.db("cosmic_works");
                const products = db.collection("products");
                const doc = await products.findOne({"sku": input});
                if (doc) {
                    delete doc.contentVector;
                }

                return doc ? JSON.stringify(doc, null, '\t') : null;
            }
        });

        const tools = [productsRetrieverTool, productsLookupTool];
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

    async executeAgent(input) {
        let returnValue = "";
        try {
            await this.dbClient.connect();
            // Invoke the agent with the user input
            const result = await this.agentExecutor.invoke({ input: input, chat_history: this.chatHistory });

            this.chatHistory.push(new HumanMessage(input));
            this.chatHistory.push(new AIMessage(result.output));

            // Output the intermediate steps of the agent if returnIntermediateSteps is set to true
            if (this.agentExecutor.returnIntermediateSteps) {
                console.log(JSON.stringify(result.intermediateSteps, null, 2));
            }
            // Return the final response from the agent
            returnValue = result.output;
        } finally {
            await this.dbClient.close();
        }
        return returnValue;
    }
}

module.exports = CosmicWorksAIAgent;
