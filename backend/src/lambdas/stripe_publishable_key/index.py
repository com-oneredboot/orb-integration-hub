import os
import json
import boto3


def lambda_handler(event, context):
    # Fetch the Stripe publishable key from AWS Systems Manager Parameter Store
    ssm = boto3.client('ssm')
    parameter = ssm.get_parameter(Name='/your-app/stripe/publishable-key', WithDecryption=True)
    publishable_key = parameter['Parameter']['Value']

    return {
        'statusCode': 200,
        'body': json.dumps({'publishableKey': publishable_key})
    }