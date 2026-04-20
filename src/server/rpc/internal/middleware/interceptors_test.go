package middleware

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func TestAuthInterceptor(t *testing.T) {
	secret := "test-secret"
	interceptor := AuthInterceptor(secret)

	// Valid token setup
	validToken := mintTestToken(t, secret, Claims{
		Sub:   "user:alice",
		Email: "alice@demo.com",
		Role:  "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "template-engine",
			Audience:  jwt.ClaimStrings{"template-rpc"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(2 * time.Hour)),
		},
	})

	// Expired token setup
	expiredToken := mintTestToken(t, secret, Claims{
		Sub:   "user:alice",
		Email: "alice@demo.com",
		Role:  "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "template-engine",
			Audience:  jwt.ClaimStrings{"template-rpc"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)), // Past
		},
	})

	// Wrong secret
	wrongSecretToken := mintTestToken(t, "wrong-secret", Claims{
		Sub:   "user:alice",
		Email: "alice@demo.com",
		Role:  "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "template-engine",
			Audience:  jwt.ClaimStrings{"template-rpc"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(2 * time.Hour)),
		},
	})

	dummyHandler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return "success", nil
	}

	tests := []struct {
		name       string
		method     string
		md         metadata.MD
		wantErr    bool
		errCode    codes.Code
		errMessage string
	}{
		{
			name:    "health_check_skips_auth",
			method:  "/grpc.health.v1.Health/Check",
			md:      nil, // No metadata needed
			wantErr: false,
		},
		{
			name:       "missing_metadata_rejected",
			method:     "/template.v1.NotifierService/Dispatch",
			md:         nil, // Context without metadata
			wantErr:    true,
			errCode:    codes.Unauthenticated,
			errMessage: "metadata is not provided",
		},
		{
			name:       "empty_auth_header_rejected",
			method:     "/template.v1.NotifierService/Dispatch",
			md:         metadata.Pairs("other-header", "value"), // No authorization
			wantErr:    true,
			errCode:    codes.Unauthenticated,
			errMessage: "authorization token is not provided",
		},
		{
			name:       "invalid_token_rejected",
			method:     "/template.v1.NotifierService/Dispatch",
			md:         metadata.Pairs("authorization", "Bearer garbage"),
			wantErr:    true,
			errCode:    codes.Unauthenticated,
			errMessage: "invalid token",
		},
		{
			name:       "expired_token_rejected",
			method:     "/template.v1.NotifierService/Dispatch",
			md:         metadata.Pairs("authorization", "Bearer "+expiredToken),
			wantErr:    true,
			errCode:    codes.Unauthenticated,
			errMessage: "invalid token",
		},
		{
			name:       "wrong_secret_rejected",
			method:     "/template.v1.NotifierService/Dispatch",
			md:         metadata.Pairs("authorization", "Bearer "+wrongSecretToken),
			wantErr:    true,
			errCode:    codes.Unauthenticated,
			errMessage: "invalid token",
		},
		{
			name:    "valid_token_accepted",
			method:  "/template.v1.NotifierService/Dispatch",
			md:      metadata.Pairs("authorization", "Bearer "+validToken),
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			if tt.md != nil {
				ctx = metadata.NewIncomingContext(ctx, tt.md)
			}

			info := &grpc.UnaryServerInfo{FullMethod: tt.method}

			_, err := interceptor(ctx, nil, info, dummyHandler)

			if (err != nil) != tt.wantErr {
				t.Errorf("AuthInterceptor() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				st, ok := status.FromError(err)
				if !ok {
					t.Fatalf("Expected gRPC status error, got %v", err)
				}
				if st.Code() != tt.errCode {
					t.Errorf("Expected status code %v, got %v", tt.errCode, st.Code())
				}
				if !strings.Contains(st.Message(), tt.errMessage) {
					t.Errorf("Expected error message to contain %q, got %q", tt.errMessage, st.Message())
				}
			}
		})
	}
}
