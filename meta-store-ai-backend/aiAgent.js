require('dotenv').config();
const {AzureKeyCredential, OpenAIClient} = require("@azure/openai");

class AIAgent {
    constructor() {
        this.openAIClient = new OpenAIClient(
            process.env.AZURE_OAI_ENDPOINT,
            new AzureKeyCredential(process.env.AZURE_OAI_KEY)
        );

        // initialize the chat history
        this.chatHistory = [];
        this.buildAgentExecutor();
    }

    buildAgentExecutor() {
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

        this.chatHistory.push({role: "system", content: systemMessage});
    }

    addMessage(chatHistoryMessage) {
        this.chatHistory.push(chatHistoryMessage);
    }

    async executeAgent(prompt) {
        this.addMessage({role: "user", content: prompt});
        try {
            const chatResponse = await this.openAIClient.getChatCompletions(
                process.env.AZURE_OAI_DEPLOYMENT,
                this.chatHistory
            );

            return chatResponse.choices[0].message.content;
        } catch (e) {
            console.error(e);
            return "ERROR"
        }
    }
}

module.exports = AIAgent;
