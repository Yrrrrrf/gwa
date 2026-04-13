#!/bin/bash
# test-enterprise-billing.sh

RPC_URL="http://localhost:4000"
# Replace with a real Order ID from your database if testing manually
ORDER_ID=${1:-"d429712c-0e2e-4f76-9289-408a28795906"} 

echo "--- TESTING ENTERPRISE PDF GENERATION ---"
curl -s -X POST "$RPC_URL/v1/documents/generate" 
  -H "Content-Type: application/json" 
  -H "Authorization: Bearer dev-token" 
  -d "{
    "record_id": "$ORDER_ID",
    "template": "commerce/corporate_blue",
    "options": { "force_regenerate": true }
  }" | jq -r '.pdf_base64' | head -c 100
echo "... [TRUNCATED]"

echo -e "
--- TESTING EMAIL NOTIFICATION DISPATCH ---"
curl -s -X POST "$RPC_URL/v1/notifications/dispatch" 
  -H "Content-Type: application/json" 
  -H "Authorization: Bearer dev-token" 
  -d "{
    "order_id": "$ORDER_ID",
    "channel": "email",
    "recipient": "customer@example.com",
    "template_key": "invoice_created",
    "locale": "en"
  }"
