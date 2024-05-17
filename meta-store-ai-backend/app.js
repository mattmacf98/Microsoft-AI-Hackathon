require('dotenv').config();
const { AIMessage } = require("@langchain/core/messages");
const { BlobServiceClient } = require("@azure/storage-blob");
const express = require('express');
const cors = require('cors')
const swagger = require('./swagger');
const AiAgent = require("./aiAgent");

const connStr = process.env.STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
const containerName = "default";

const PORT = process.env.PORT || 4000;
const app = express();
app.use(express.json());
app.use(cors());

// values in a database rather than in-memory.
let agentInstancesMap = new Map();

/* Health probe endpoint. */
/**
 * @openapi
 * /:
 *   get:
 *     description: Health probe endpoint
 *     responses:
 *       200:
 *         description: Returns status=ready json
 */
app.get('/', (req, res) => {
    res.send({ "status": "ready" });
});

/**
 * @openapi
 * /ai:
 *   post:
 *     description: Run the Cosmic Works AI agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 default: ""
 *               productContext:
 *                  type: string
 *                  default: ""
 *               session_id:
 *                 type: string
 *                 default: "1234"
 *     responses:
 *       200:
 *         description: Returns the OpenAI response.
 */
app.post('/ai', async (req, res) => {
    let session_id = req.body.session_id;
    let agent = {};

    if (agentInstancesMap.has(session_id)) {
        agent = agentInstancesMap.get(session_id);
    } else {
        agent = new AiAgent();
        agentInstancesMap.set(session_id, agent);
    }

    if (req.body.productContext !== "") {
        agent.addMessage(new AIMessage(req.body.productContext));
    }

    const agentResponse = await agent.executeAgent(req.body.prompt);

    if (agentResponse.message === "ERROR") {
        res.status(500).send("Failed to generate completion");
    } else {
        res.status(200).send(agentResponse);
    }
});

/**
 * @openapi
 * /download/{assetId}:
 *   get:
 *     description: Download an asset file by ID
 *     parameters:
 *       - in: path
 *         name: assetId
 *         description: ID of the asset to download
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: File corresponding to the asset ID
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
app.get('/download/:assetId', async (req, res) => {
    const assetId = req.params['assetId'];

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(assetId);

    const downloadBlobResponse = await blobClient.download();

    res.setHeader("Cache-Control", "public, max-age=86400");
    downloadBlobResponse.readableStreamBody.pipe(res);
});

swagger(app);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
