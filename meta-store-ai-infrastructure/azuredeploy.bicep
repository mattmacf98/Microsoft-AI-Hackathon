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

@description('Azure Container Registry SKU. Defaults to **Basic**')
param acrSku string = 'Basic'

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

param storageAccountName string = 'metastoreaistorage'
param skuName string = 'Standard_LRS'

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: skuName
  }
  kind: 'StorageV2'
  properties: {}
}


resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  name: '${storageAccount.name}/default'
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: replace('${name}registry','-', '')
  location: location
  sku: {
    name: acrSku
  }
  properties: {
    adminUserEnabled: true
  }
}

/* *************************************************************** */
/* Logging and instrumentation */
/* *************************************************************** */

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
  name: '${name}-loganalytics'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

/* *************************************************************** */
/* Container environment - Azure Container App Environment  */
/* *************************************************************** */
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${name}-containerappenv'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    workloadProfiles: []
    infrastructureResourceGroup: 'ME_${resourceGroup().name}'
  }
}

/* *************************************************************** */
/* Back-end API App Application - Azure Container App */
/* deploys default hello world */
/* *************************************************************** */
resource backendApiContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${name}-api'
  location: location
  properties: {
    environmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4000
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        corsPolicy: {
          allowCredentials: false
          allowedHeaders: [
            '*'
          ]
          allowedOrigins: [
            '*'
          ]
        }
      }
      registries: [
        {
          server: containerRegistry.name
          username: containerRegistry.properties.loginServer
          passwordSecretRef: 'container-registry-password'
        }
      ]
      secrets: [
        {
          name: 'container-registry-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'hello-world'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: 1
            memory: '2Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}
