const {MongoClient} = require('mongodb');
const fs = require('fs')
require('dotenv').config();

async function main() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('meta_store_ai');
        const productsCollection = db.collection('products');

        const data = fs.readFileSync(`${__dirname}/data.json`, 'utf8');

        const jsonData = JSON.parse(data);

        let result = await productsCollection.bulkWrite(
            jsonData.map(product => ({
                insertOne: {
                    document: product
                }
            }))
        );
        console.log(`${result.insertedCount} products inserted`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

main().catch(console.error);

