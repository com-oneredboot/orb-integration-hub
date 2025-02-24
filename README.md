# orb-integration-hub
This is an integration hub for OneRedBoot.com(ORB). It is a platform that allows users to make payments 
using their credit card. The integration hub is built using Angular and AWS services. The integration hub is integrated 
with Stripe to process payments, with PayPal integration in progress.

The integration hub is also integrated with AWS services to send notifications to users after a successful payment.

## Setup

### Setup Angular Project
1. cd orb-integration-hub/frontend
2. npm install
3. ng serve

### Development Commands
- Build: `ng build`
- Test: `ng test`
- Lint: `ng lint`






## Stripe flow
![img.png](assets/stripe-payment-flow.png)

curl https://api.stripe.com/v1/balance \
  -u "{{SECRET_KEY}}" \
  -H "Stripe-Account: {{CONNECTED_ACCOUNT_ID}}" \
  -d "expand[]"="instant_available.net_available"


## Amplify Configuration
cd frontend
npx ampx generate outputs --stack orb-integration-hub-api-cognito
