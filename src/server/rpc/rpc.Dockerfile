# ========================================== 
# 1. BUILDER (Go 1.25 Required for Echo v5) 
# ========================================== 
FROM golang:1.25-alpine AS builder

WORKDIR /app

# 1. Copy go.mod and go.sum
COPY go.mod go.sum ./ 

# 2. Download dependencies from the internet (GitHub)
RUN go mod download

# 3. Copy source code
COPY cmd/ ./cmd/ 
COPY internal/ ./internal/ 
COPY docs/ ./docs/

# 4. Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/server ./cmd/server

# ========================================== 
# 2. RUNNER 
# ========================================== 
FROM alpine:latest

WORKDIR /app

# Install dependencies (Typst)
RUN apk add --no-cache fontconfig ttf-opensans wget tar xz
RUN wget -qO- https://github.com/typst/typst/releases/download/v0.12.0/typst-x86_64-unknown-linux-musl.tar.xz | tar -xJ \
    && mv typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst \
    && rm -rf typst-x86_64-unknown-linux-musl

COPY --from=builder /bin/server /usr/local/bin/server
COPY templates/ ./templates/ 
COPY docs/ ./docs/

RUN mkdir -p /app/tmp && chmod 777 /app/tmp

EXPOSE 4000

CMD ["server"]