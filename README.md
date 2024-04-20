# Introduction
This Repo will serve as my exploration and source code for generating a submission for https://azurecosmosdb.devpost.com/. I will be documenting my experience in my upcoming Medium article series

## Phase 1: Calling Azure OpenAI
Using the endpoint, key and deployed models that the hackathon provides to its users, we were able to very easily throw together a simple node script to call an LLM for chat completion. This was shockingly easy!


## Phase 2: Deploying some demo code
We are just deploying some demo code here, the hackathon provided us an example front-end to build on. I used azure cli instead of the weird powershell stuff they did

az login
az group create --name mongo-devguide-rg --location eastus

before I actually deployed the template they gave me, Azure has not made OpenAI generally available and I don't have an edu email to request access. The hackathon organizers provided an open AI endpoint to use so I just commented out the OpenAI parts

az deployment group create --resource-group mongo-devguide-rg --template-file azuredeploy.bicep --parameters azuredeploy.parameters.json

## PHASE 3: Playing with Cosmos DB
In this section we just explored some common API calls to make to Cosmos DB using the azure SDK, if you are familiar with any noSQL cloud database (like firebase or DDB) you could probably just skip this


## PHASE 4: Bulk loading
In this section we updated our Cosmos db app to do all bulk operations


## PHASE 5: Building a RAG
In this section we combine our database inserting skills and OpenAI calling to generate a text embedding vector for our collections, then we demonstrate how we can use that index to do simple cosine similarity search but also use the vector indexes to plug into an OpenAi chat completion to give our chat app better context when answering the questions
