const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
require('dotenv').config();

const client = new OpenAIClient(
    process.env.AZURE_OAI_ENDPOINT,
    new AzureKeyCredential(process.env.AZURE_OAI_KEY)
)

const messages_array = [
    {role: "system", content: "You are a helpful, fun and friendly sales assistant for Cosmic Works, a bicycle and bicycle accessories store."},
    {role: "user", content: "Do you sell bicycles?"},
    {role: "assistant", content: "Yes, we do sell bicycles. What kind of bicycle are you looking for?"},
    {role: "user", content: "I'm not sure what I'm looking for. Could you help me decide?"}
];

const chatResponse = client.getChatCompletions(
    process.env.AZURE_OAI_DEPLOYMENT,
    messages_array
);

chatResponse.then((result) => {
    for (const choice of result.choices) {
        console.log(choice.message.content);
    }
}).catch((err) => console.log(`Error ${err}`));
