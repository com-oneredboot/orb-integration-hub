// scripts/set-env.ts
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const fs = require('fs');

async function getSSMParameter(paramName: string): Promise<string> {
  const client = new SSMClient({ region: "us-east-1" });
  const command = new GetParameterCommand({ Name: paramName });
  const response = await client.send(command);
  return response.Parameter.Value;
}

async function generateEnvironmentFile() {
  try {
    const userPoolId = await getSSMParameter('orb-integration-hub-dev-cognito-user-pool-id');
    const userPoolClientId = await getSSMParameter('orb-integration-hub-dev-user-pool-client-id');

    const envContent = `export const environment = {
  production: false,
  cognito: {
    userPoolId: '${userPoolId}',
    userPoolClientId: '${userPoolClientId}',
    region: 'us-east-1'
  }
};`;

    fs.writeFileSync('./src/environments/environment.ts', envContent);
    console.log('Environment file generated successfully');
  } catch (error) {
    console.error('Error generating environment file:', error);
    process.exit(1);
  }
}

generateEnvironmentFile();
