const {MongoClient} = require('mongodb');
require('dotenv').config();

async function main() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('cosmic_works');
        const productsCollection = db.collection('products');

        const productRawDataUrl = "https://cosmosdbcosmicworks.blob.core.windows.net/cosmic-works-small/product.json";
        const productData = await (await fetch(productRawDataUrl)).json();

        console.log("Deleting existing products");
        await productsCollection.deleteMany({});

        let result = await productsCollection.bulkWrite(
            productData.map(product => ({
                insertOne: {
                    document: product
                }
            }))
        );
        console.log(`${result.insertedCount} products inserted`);

        console.log('Retrieving combined Customer/Sales data');
        const customerCollection = db.collection('customers');
        const salesCollection = db.collection('sales');
        const custSalesDataUrl = "https://cosmosdbcosmicworks.blob.core.windows.net/cosmic-works-small/customer.json";
        const custSalesData = await ((await fetch(custSalesDataUrl)).json());

        console.log("Split customer and sales data");
        const customerData = custSalesData.filter(data => data["type"] === "customer");
        const salesData = custSalesData.filter(data => data["type"] === "salesOrder");

        console.log("Loading Customer data");
        await customerCollection.deleteMany({});
        result = await customerCollection.insertMany(customerData);
        console.log(`${result.insertedCount} customer inserted`);

        console.log("Loading Sales data");
        await salesCollection.deleteMany({});
        result = await salesCollection.insertMany(salesData);
        console.log(`${result.insertedCount} sales inserted`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

main().catch(console.error);

