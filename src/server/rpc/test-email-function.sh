#!/bin/bash

# Configuration
SUPABASE_URL="http://localhost:54321"
ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

echo "Testing send-email function..."

curl -i -X POST "$SUPABASE_URL/functions/v1/send-email" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "fer.rezac@outlook.com",
    "subject": "CLI Test",
    "content": "Testing from shell script"
  }'