# orb-integration-hub
This is a payment gateway for OneRedBoot.com(ORB). It is a simple payment gateway that allows users to make payments 
using their credit card. The payment gateway is built using Node.js and Express.js. The payment gateway is integrated 
with Stripe to process payments.

The payment gateway is also integrated with SendGrid to send email notifications to users after a successful payment.

## Setup

### Create the React app
1. cd org-integration-hub/frontend
2. npx create-react-app .
3. Clean up the default files:
  - Remove logo.svg and App.test.js
  - Simplify App.js and index.js
4. npm install react-router-dom axios @aws-amplify/ui-react aws-amplify
5. create directories for the components: components, pages, and services
6. create the following components:
  - components: Header.js, Footer.js
  - pages: Home.js, Payment.js, Success.js
  - services: api.js
7. npm start
8. npm install --save-dev @testing-library/react @testing-library/jest-dom
9. npm install --save-dev identity-obj-proxy
10. npm test
11. npm install @stripe/react-stripe-js @stripe/stripe-js
12. npm install aws-amplify@latest
13. npm install aws-amplify @aws-amplify/ui-react






## Stripe flow
![img.png](assets/stripe-payment-flow.png)

curl https://api.stripe.com/v1/balance \
  -u "{{SECRET_KEY}}" \
  -H "Stripe-Account: {{CONNECTED_ACCOUNT_ID}}" \
  -d "expand[]"="instant_available.net_available"


## Creating the ui (React)
cd frontend
npm create amplify@latest
npx ampx generate outputs --stack orb-integration-hub-api-cognito
