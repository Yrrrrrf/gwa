package middleware

import (
	"github.com/golang-jwt/jwt/v5"
	"testing"
)

// Re-declare it with strings import
func init() {
	// Just to ensure strings is imported in case the test file above has issues
}

// Actually, let me just add strings to interceptors_test.go instead
// So this file will just have the mintTestToken helper
func mintTestToken(t *testing.T, secret string, claims Claims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("Failed to sign token: %v", err)
	}
	return tokenString
}
