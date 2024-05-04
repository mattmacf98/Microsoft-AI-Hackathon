@description('Location where all resources will be deployed. This value defaults to the **East US** region.')
@allowed([
  'eastus'
  'francecentral'
  'southcentralus'
  'uksouth'
  'westeurope'
])
param location string = 'eastus'

@description('''
Unique name for the deployed services below. Max length 17 characters, alphanumeric only:
- Azure Cosmos DB for MongoDB vCore
- Azure OpenAI Service

The name defaults to a unique string generated from the resource group identifier. Prefixed with
**dg** 'developer guide' as the id may start with a number which is an invalid name for
many resources.
''')
@maxLength(17)
param name string = 'dg${uniqueString(resourceGroup().id)}'

@description('MongoDB vCore user Name. No dashes.')
param mongoDbUserName string

@description('MongoDB vCore password. 8-256 characters, 3 of the following: lower case, upper case, numeric, symbol.')
@minLength(8)
@maxLength(256)
@secure()
param mongoDbPassword string

var mongovCoreSettings = {
  mongoClusterName: '${name}-mongo'
  mongoClusterLogin: mongoDbUserName
  mongoClusterPassword: mongoDbPassword
}

resource mongoCluster 'Microsoft.DocumentDB/mongoClusters@2023-03-01-preview' = {
  name: mongovCoreSettings.mongoClusterName
  location: location
  properties: {
    administratorLogin: mongovCoreSettings.mongoClusterLogin
    administratorLoginPassword: mongovCoreSettings.mongoClusterPassword
    serverVersion: '5.0'
    nodeGroupSpecs: [
      {
        kind: 'Shard'
        sku: 'Free'
        diskSizeGB: 32
        enableHa: false
        nodeCount: 1
      }
    ]
  }
}

resource mongoFirewallRulesAllowAzure 'Microsoft.DocumentDB/mongoClusters/firewallRules@2023-03-01-preview' = {
  parent: mongoCluster
  name: 'allowAzure'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource mongoFirewallRulesAllowAll 'Microsoft.DocumentDB/mongoClusters/firewallRules@2023-03-01-preview' = {
  parent: mongoCluster
  name: 'allowAll'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}
