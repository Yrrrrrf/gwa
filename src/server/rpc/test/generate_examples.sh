#!/bin/bash

# Configuration
RPC_URL="http://localhost:4000"
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" # Local Anon Key
OUTPUT_DIR="src/server/rpc/temp"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Chimera Document Generation Test ===${NC}"
echo -e "RPC Server: $RPC_URL"
echo -e "Output Dir: $OUTPUT_DIR"

# 1. Setup Output Directory
mkdir -p "$OUTPUT_DIR"
echo -e "\n${BLUE}[1/4] Created temp directory...${NC}"

# 1.5 Generate JWT Token
echo -e "\n${BLUE}[1.5/4] Generating JWT Token...${NC}"

# Try to load JWT_SECRET from .env in the current (root) directory
if [ -f ".env" ]; then
    echo "Loading JWT_SECRET from .env..."
    export JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}Warning: JWT_SECRET not found in .env or environment. Token generation may fail or use default.${NC}"
fi

# We need to run this from the rpc directory to use the go.mod context
current_dir=$(pwd)
cd src/server/rpc
RPC_TOKEN=$(go run test/get_token.go)
cd "$current_dir"

if [ -z "$RPC_TOKEN" ]; then
    echo -e "${RED}Error: Failed to generate JWT token.${NC}"
    exit 1
fi
echo -e "${GREEN}Token generated.${NC}"

# 2. Fetch a valid Property ID
echo -e "\n${BLUE}[2/4] Fetching a valid Property ID from Database...${NC}"
# We query the view directly or the table. The view 'api.properties' might not exist or be accessible, 
# but 'api.rpc_docs_listing_listing_sheet' is definitely there and has data.
PROPERTY_ID=$(curl -s -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Accept-Profile: api" \
    "$SUPABASE_URL/rest/v1/rpc_docs_listing_listing_sheet?select=record_id&limit=1" \
    | grep -o '"record_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$PROPERTY_ID" ]; then
    echo -e "${RED}Error: Could not find any properties in 'rpc_docs_listing_listing_sheet'. Did you seed the DB?${NC}"
    exit 1
fi

echo -e "${GREEN}Found Property ID: $PROPERTY_ID${NC}"

# Function to generate document
generate_doc() {
    local TEMPLATE=$1
    local OUT_FILE="$OUTPUT_DIR/$(basename $TEMPLATE).pdf"
    
    echo -e "\n${BLUE}[3/4] Generating $TEMPLATE...${NC}"
    
    # Needs a valid JWT for the RPC server usually, but if it's open or using same secret...
    # The RPC server verifies JWT in 'v1' group usually. 
    # We will assume we can pass the same Supabase Anon Key as Authorization if the server accepts it,
    # OR if the user turned off auth for testing. 
    # Let's try passing the Supabase Anon Token.
    
    RESPONSE=$(curl -s -X POST "$RPC_URL/v1/documents/generate" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $RPC_TOKEN" \
        -d "{
            \"record_id\": \"$PROPERTY_ID\",
            \"template\": \"$TEMPLATE\"
        }")

    # Check for error in response
    if echo "$RESPONSE" | grep -q "error"; then
        echo -e "${RED}Failed to generate $TEMPLATE (Server Error)${NC}"
        echo "$RESPONSE" | jq .
        return
    fi
    
    # Extract Base64
    PDF_B64=$(echo "$RESPONSE" | jq -r .pdf_base64)
    
    if [ "$PDF_B64" == "null" ] || [ -z "$PDF_B64" ]; then
         echo -e "${RED}Failed to generate $TEMPLATE (No PDF data)${NC}"
         echo "Full Response:"
         echo "$RESPONSE" | jq .
         return
    fi
    
    # Decode
    echo "$PDF_B64" | base64 -d > "$OUT_FILE"
    
    if [ -s "$OUT_FILE" ]; then
        echo -e "${GREEN}Success! Saved to $OUT_FILE${NC}"
    else
        echo -e "${RED}Error: Output file is empty.${NC}"
    fi
}

# 3. Test Generations
TEMPLATES=(
    "listing/listing-sheet"
    "listing/cma"
    "listing/sellers-net"
)

for T in "${TEMPLATES[@]}"; do
    generate_doc "$T"
done

echo -e "\n${BLUE}[4/4] Done! Check the $OUTPUT_DIR directory.${NC}"
