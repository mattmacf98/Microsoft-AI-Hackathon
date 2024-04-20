const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const { MongoClient } = require('mongodb');
require('dotenv').config();

const openAIClient = new OpenAIClient(process.env.AZURE_OAI_ENDPOINT, new AzureKeyCredential(process.env.AZURE_OAI_KEY));
const dbClient = new MongoClient(process.env.MONGODB_URI);

async function main() {
    try {
        await dbClient.connect();
        console.log('Connected to MongoDB');
        const db = dbClient.db('cosmic_works');

        // 1.0 INDEXING do for products, customers and sales
        // await addCollectionContentVectorField(db, 'sales');

        // 2.0 SIMILARITY SEARCH
        const searchResults = await vectorSearch(db, 'products', 'What products do you have that are yellow?');
        searchResults.forEach(printProductSearchResult);

        // 3.0 RAG
        console.log(await ragWithVectorSearch(db, 'products', 'What are the names and skus of some of the bikes you have?', 3));
    } catch (err) {
        console.error(err);
    } finally {
        await dbClient.close();
        console.log('Disconnected from MongoDB');
    }
}

async function generateEmbeddings(text) {
    const embeddings = await openAIClient.getEmbeddings(process.env.AZURE_OAI_EMBEDDINGS_DEPLOYMENT, text);
    // Rate limit ourselves so we don't get throttled
    await new Promise(resolve => setTimeout(resolve, 500));
    return embeddings.data[0].embedding;
}

// 1.0 INDEXING
async function addCollectionContentVectorField(db, collectionName) {
    const collection = db.collection(collectionName);
    const docs = await collection.find({}).toArray();

    console.log(`Generating content vectors for ${docs.length} documents in ${collectionName} collection`);
    const bulkOperations = [];
    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        if ('contentVector' in doc) {
            delete doc['contentVector'];
        }
        const content = JSON.stringify(doc);
        const contentVector = await generateEmbeddings(content);
        bulkOperations.push({
            updateOne: {
                filter: {'_id': doc['_id']},
                update: {'$set': {'contentVector': contentVector}},
                upsert: true
            }
        });

        if ((i+1) % 25 === 0) {
            console.log(`Generated ${i+1} content vectors of ${docs.length} in the ${collectionName} collection`);
        }
    }

    if (bulkOperations.length > 0) {
        console.log(`Persisting the generated content vectors in the ${collectionName} collection using bulkWrite upserts`);
        await collection.bulkWrite(bulkOperations);
        console.log(`Finished persisting the content vectors to the ${collectionName} collection`);
    }

    //check to see if the vector index already exists on the collection
    console.log(`Checking if vector index exists in the ${collectionName} collection`);
    const vectorIndexExists = await collection.indexExists('VectorSearchIndex');
    if (!vectorIndexExists) {
        await db.command({
           "createIndexes": collectionName,
           "indexes": [
               {
                   "name": "VectorSearchIndex",
                   "key": {
                       "contentVector": "cosmosSearch"
                   },
                   "cosmosSearchOptions": {
                       "kind": "vector-ivf",
                       "numLists": 1,
                       "similarity": "COS",
                       "dimensions": 1536
                   }
               }
           ]
        });
        console.log(`Created vector index on contentVector field on ${collectionName} collection`);
    } else {
        console.log(`Vector index already exists on contentVector field in the ${collectionName} collection`);
    }
}

// 2.0 SIMILARITY SEARCH
async function vectorSearch(db, collectionName, query, numResults= 3) {
    const collection = db.collection(collectionName);
    const queryEmbedding = await generateEmbeddings(query);

    const pipeline = [
        {
            '$search': {
                "cosmosSearch": {
                    "vector": queryEmbedding,
                    "path": "contentVector",
                    "k": numResults
                },
                "returnStoredSource": true
            }
        },
        {
            '$project': {
                "similarityScore": {
                    '$meta': 'searchScore'
                },
                'document': '$$ROOT'
            }
        }
    ]

    return await collection.aggregate(pipeline).toArray();
}

function printProductSearchResult(result) {
    console.log(`Similarity Score: ${result['similarityScore']}`);
    console.log(`Name: ${result['document']['name']}`);
    console.log(`Category: ${result['document']['categoryName']}`);
    console.log(`SKU: ${result['document']['sku']}`);
    console.log(`_id: ${result['document']['_id']}\n`);
}

// 3.0 RAG
async function ragWithVectorSearch(db, collectionName, question, numResults=3) {
    const systemPrompt = `
        You are a helpful, fun and friendly sales assistant for Cosmic Works, a bicycle and bicycle accessories store.
        Your name is Cosmo.
        You are designed to answer questions about the products that Cosmic Works sells.
        
        Only answer questions related to the information provided in the list of products below that are represented
        in JSON format.
        
        If you are asked a question that is not in the list, respond with "I don't know."
        
        List of products:
    `;

    const results = await vectorSearch(db, collectionName, question, numResults);
    let productList = "";

    for (const result of results) {
        delete result['document']['contentVector'];
        productList += JSON.stringify(result['document']) + "\n\n";
    }

    const formattedPrompt = systemPrompt + productList;

    const messages = [
        {
            "role": "system",
            "content": formattedPrompt
        },
        {
            "role": "user",
            "content": question
        }
    ]

    const completion = await openAIClient.getChatCompletions(process.env.AZURE_OAI_DEPLOYMENT, messages);
    return completion.choices[0].message.content;
}

main().catch(console.error);
