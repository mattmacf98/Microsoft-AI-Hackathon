const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
require('dotenv').config();
const express = require('express');
const cors = require('cors')
const swagger = require('./swagger');

const PORT = process.env.PORT || 4000;
const app = express();
app.use(express.json());
app.use(cors());

// values in a database rather than in-memory.
let agentInstancesMap = new Map();

const client = new OpenAIClient(
    process.env.AZURE_OAI_ENDPOINT,
    new AzureKeyCredential(process.env.AZURE_OAI_KEY)
);

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
    const systemMessage = `
        You are a helpful, fun and friendly sales assistant for Cosmic Works, an online store.

        Your name is Cosmo.

        You are designed to answer questions about the products that Cosmic Works sells, the customers that buy them, and the sales orders that are placed by customers.

        If you don't know the answer to a question, respond with "I don't know."
        
        You will receive follow up messages about a product a user is looking at. The information will also contain a FUNCTIONS section which you can invoke to demonstrate some product feature
        
        For example, a loaded product info might look like below
        
        
        User has loaded our blue velvet chair, it has hand crafted wooden legs made by artisan woodworkers
        FUNCTIONS: [show_red_variant, show_chair_legs] 
        
        The user may then ask: "does this come in any other colors?"       
        
        and your message response could look like: "Yes! we have a red variant! INVOKE: show_red_variant"
        
        the invocation of a function MUST match the pattern INVOKE: {function} and it MUST be at the end of your response
    `;
    const messages_array = [
        {role: "system", content: systemMessage},
    ];
    if (req.body.productContext !== "") {
        messages_array.push({role: "system", content: req.body.productContext});
    }
    messages_array.push({role: "user", content: req.body.prompt});

    try {
        const chatResponse = await client.getChatCompletions(
            process.env.AZURE_OAI_DEPLOYMENT,
            messages_array
        );
        res.status(200).send({message: chatResponse.choices[0].message.content})
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to generate completion");
    }
});

swagger(app);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
