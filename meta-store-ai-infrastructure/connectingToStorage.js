const { BlobServiceClient } = require("@azure/storage-blob");
const fs = require("fs");
require('dotenv').config();

const connStr = process.env.STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);

const containerName = "default";


async function list() {
    const containerClient = blobServiceClient.getContainerClient(containerName);

    let i = 0;
    let blobs = containerClient.listBlobsFlat();
    for await (const blob of blobs) {
        console.log(`Blob ${i++}: ${blob.name}`);
    }
}



async function download(name) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(name);

    const downloadBlobResponse = await blobClient.download();

    const downloaded = (await streamToBuffer(downloadBlobResponse.readableStreamBody));

    fs.writeFileSync(name, downloaded);

}

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });

        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });

        readableStream.on("error", reject);
    });
}


list();

download("s-378-jur.glb");
