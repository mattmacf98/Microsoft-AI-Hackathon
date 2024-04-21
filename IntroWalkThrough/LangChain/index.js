require('dotenv').config();
const { MongoClient } = require('mongodb');
const { AzureCosmosDBVectorStore} = require("@langchain/community/vectorstores/azure_cosmosdb");
const {OpenAIClient, AzureKeyCredential} = require("@azure/openai");
const { AzureChatOpenAI} = require("@langchain/openai");
const { PromptTemplate }  = require("@langchain/core/prompts");
const { RunnableSequence, RunnablePassthrough } = require("@langchain/core/runnables");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { DynamicTool } = require("@langchain/core/tools");
const { AgentExecutor } = require("langchain/agents");
const { MessagesPlaceholder, ChatPromptTemplate } = require("@langchain/core/prompts");
const { convertToOpenAIFunction } = require("@langchain/core/utils/function_calling");
const { OpenAIFunctionsAgentOutputParser } = require("langchain/agents/openai/output_parser");
const { formatToOpenAIFunctionMessages } = require("langchain/agents/format_scratchpad");

// set up the MongoDB client
const dbClient = new MongoClient(process.env.AZURE_COSMOSDB_CONNECTION_STRING);
const azureCosmosDbConfig = {
    client: dbClient,
    databaseName: "cosmic_works",
    collectionName: "products",
    indexName: "VectorSearchIndex",
    embeddingKey: "contentVector",
    textKey: "_id"
};

const openAIClient = new OpenAIClient(process.env.AZURE_OPENAI_BASE_PATH, new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY));
class CustomOpenAIEmbedding {
    embedQuery(document){
        return openAIClient.getEmbeddings(process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME, document).then(result => {
            return result.data[0].embedding;
        });
    }
}


const vectorStore = new AzureCosmosDBVectorStore(new CustomOpenAIEmbedding(), azureCosmosDbConfig);
const chatModel = new AzureChatOpenAI(
    {
        openAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        openAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
        openAIBasePath: process.env.AZURE_OPENAI_BASE_PATH,
        deploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
    }
);

async function main() {
    try {
        await dbClient.connect();
        console.log("Connected to MongoDB");

        // 1.0 using langchain for similarity search
        // const results = await vectorStore.similaritySearch(
        //     "What yellow products do you have?",
        //     3
        // );
        // console.log(results);

        // 2.0  langchain for response generation
        // console.log(await ragLCELChain("What yellow products do you have?"));

        // 3.0 creating an agent with tools using langchain
        const agentExecutor = await buildAgentExecutor();
        console.log(await executeAgent(agentExecutor, "What is the name of the product that has the SKU TI-R982?"));

    } catch (err) {
        console.error(err);
    } finally {
        await dbClient.close();
        console.log('Disconnected from MongoDB');
    }
}

function formatDocuments(docs) {
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

async function ragLCELChain(question) {
    const systemPrompt = `
        You are a helpful, fun and friendly sales assistant for Cosmic Works, a bicycle and bicycle accessories store. 
        Your name is Cosmo.
        You are designed to answer questions about the products that Cosmic Works sells.

        Only answer questions related to the information provided in the list of products below that are represented
        in JSON format.

        If you are asked a question that is not in the list, respond with "I don't know."

        Only answer questions related to Cosmic Works products, customers, and sales orders.

        If a question is not related to Cosmic Works products, customers, or sales orders,
        respond with "I only answer questions about Cosmic Works"

        List of products:
        {products}

        Question:
        {question}
    `;

    const retriever = vectorStore.asRetriever();

    const prompt = PromptTemplate.fromTemplate(systemPrompt);

    const ragChain = RunnableSequence.from([
        {
            products: retriever.pipe(formatDocuments),
            question: new RunnablePassthrough()
        },
        prompt,
        chatModel,
        new StringOutputParser()
    ]);

    return await ragChain.invoke(question);
}

async function buildAgentExecutor() {
    const systemMessage = `
        You are a helpful, fun and friendly sales assistant for Cosmic Works, a bicycle and bicycle accessories store.

        Your name is Cosmo.

        You are designed to answer questions about the products that Cosmic Works sells, the customers that buy them, and the sales orders that are placed by customers.

        If you don't know the answer to a question, respond with "I don't know."
        
        Only answer questions related to Cosmic Works products, customers, and sales orders.
        
        If a question is not related to Cosmic Works products, customers, or sales orders,
        respond with "I only answer questions about Cosmic Works"          
    `;

    const retrieverChain = vectorStore.asRetriever().pipe(formatDocuments);

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
            const db = dbClient.db("cosmic_works");
            const products = db.collection("products");
            const doc = await products.findOne({"sku": input});
            if (doc) {
                delete doc.contentVector;
            }

            return doc ? JSON.stringify(doc, null, '\t') : null;
        }
    });

    const tools = [productsRetrieverTool, productsLookupTool];
    const modelWithFunctions = chatModel.bind({
        functions: tools.map((tool) => convertToOpenAIFunction(tool))
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemMessage],
        ["human", "{input}"],
        new MessagesPlaceholder(variable_name="agent_scratchpad")
    ]);

    const runnableAgent = RunnableSequence.from([
        {
            input: (i) => i.input,
            agent_scratchpad: (i) => formatToOpenAIFunctionMessages(i.steps)
        },
        prompt,
        modelWithFunctions,
        new OpenAIFunctionsAgentOutputParser()
    ]);

    return AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        tools,
        returnIntermediateSteps: true
    });
}

async function executeAgent(agentExecutor, input) {
    const result = await agentExecutor.invoke({input});

    if (agentExecutor.returnIntermediateSteps) {
        console.log(JSON.stringify(result.intermediateSteps, null, 2));
    }

    return result.output;
}

main().catch(console.error);
