const {MongoClient} = require('mongodb');
require('dotenv').config();

async function main() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('cosmic_works');
        const products = db.collection('products');

        // 1.0 SINGLE ACTIONS

        // 1.1 INSERT
        // const product = {
        //     _id: '2BA4A26C-A8DB-4645-BEB9-F7D42F50262E',
        //     categoryId: '56400CF3-446D-4C3F-B9B2-68286DA3BB99',
        //     categoryName: 'Bikes, Mountain Bikes',
        //     sku: 'BK-M18S-42',
        //     name: 'Mountain-100 Silver, 42',
        //     description: 'The product called "Mountain-500 Silver, 42"',
        //     price: 742.42
        // };
        // const result = await products.insertOne(product);
        // console.log(`A product was inserted with _id: ${result.insertedId}`);

        // 1.2 DELETE
        // const result = await products.deleteOne({_id: '2BA4A26C-A8DB-4645-BEB9-F7D42F50262E'});
        // console.log(`Number of documents deleted: ${result.deletedCount}`);

        // 1.3 GET
        // const product = await products.findOne({_id: '2BA4A26C-A8DB-4645-BEB9-F7D42F50262E'});
        // console.log("Found the product:", product);

        // 1.4 UPDATE
        // const options = {returnDocument: 'after'};
        // const updated = await products.findOneAndUpdate({_id: '2BA4A26C-A8DB-4645-BEB9-F7D42F50262E'}, {$set: {price:14242.42}}, options);
        // console.log("Updated the product:", updated);

        // 2.0 BULK ACTIONS

        // 2.1 BULK INSERT
        // const productsToInsert = [
        //     {
        //         _id: "2BA4A26C-A8DB-4645-BEB9-F7D42F50262E",
        //         categoryId: "56400CF3-446D-4C3F-B9B2-68286DA3BB99",
        //         categoryName: "Bikes, Mountain Bikes",
        //         sku:"BK-M18S-42",
        //         name: "Mountain-100 Silver, 42",
        //         description: 'The product called "Mountain-500 Silver, 42"',
        //         price: 742.42
        //     },
        //     {
        //         _id: "027D0B9A-F9D9-4C96-8213-C8546C4AAE71",
        //         categoryId: "26C74104-40BC-4541-8EF5-9892F7F03D72",
        //         categoryName: "Components, Saddles",
        //         sku: "SE-R581",
        //         name: "LL Road Seat/Saddle",
        //         description: 'The product called "LL Road Seat/Saddle"',
        //         price: 27.12
        //     },
        //     {
        //         _id: "4E4B38CB-0D82-43E5-89AF-20270CD28A04",
        //         categoryId: "75BF1ACB-168D-469C-9AA3-1FD26BB4EA4C",
        //         categoryName:  "Bikes, Touring Bikes",
        //         sku: "BK-T44U-60",
        //         name: "Touring-2000 Blue, 60",
        //         description: 'The product called Touring-2000 Blue, 60"',
        //         price: 1214.85
        //     },
        //     {
        //         _id: "5B5E90B8-FEA2-4D6C-B728-EC586656FA6D",
        //         categoryId: "75BF1ACB-168D-469C-9AA3-1FD26BB4EA4C",
        //         categoryName: "Bikes, Touring Bikes",
        //         sku: "BK-T79Y-60",
        //         name: "Touring-1000 Yellow, 60",
        //         description: 'The product called Touring-1000 Yellow, 60"',
        //         price: 2384.07
        //     },
        //     {
        //         _id: "7BAA49C9-21B5-4EEF-9F6B-BCD6DA7C2239",
        //         categoryId: "26C74104-40BC-4541-8EF5-9892F7F03D72",
        //         categoryName: "Components, Saddles",
        //         sku: "SE-R995",
        //         name: "HL Road Seat/Saddle",
        //         description: 'The product called "HL Road Seat/Saddle"',
        //         price: 52.64,
        //     }
        // ];
        //
        // const result =  await products.bulkWrite(
        //     productsToInsert.map((product) => ({
        //         insertOne: {
        //             document: product
        //         }
        //     }))
        // );
        // console.log("Bulk write operation result:", result);
        //
        // 2.2 BULK FIND
        // const allProducts = await products.find({}).toArray();
        // console.log("Found the following products:", allProducts);

        // 3 DELETE DATABASE
        // await db.dropDatabase();

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

main().catch(console.error);

