require('dotenv').config();
const { AIMessage } = require("@langchain/core/messages");
const express = require('express');
const cors = require('cors')
const swagger = require('./swagger');
const AiAgent = require("./aiAgent");

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

    if (agentResponse === "ERROR") {
        res.status(500).send("Failed to generate completion");
    } else {
        res.status(200).send({message: agentResponse})
    }
});

swagger(app);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
