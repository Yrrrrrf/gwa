package main

import (
	"argus-rpc/internal/config"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	cfg := config.Load()
	if cfg.JWTSecret == "" {
		// Fallback for when .env isn't loaded by the app, try manual env var or default
		// But config.Load() should handle it if .env is in root.
		// However, we are running from src/server/rpc, .env is likely in ../../.. (chimera root)
		// We might need to handle that or assume the user runs this with env vars set.
		if cfg.JWTSecret == "" {
			// Try to read hardcoded default for dev if appropriate or fail
			panic("JWT_SECRET is empty")
		}
	}

	claims := jwt.MapClaims{
		"sub":   "test-user-id",
		"email": "test@example.com",
		"role":  "authenticated", // Standard Supabase role
		"exp":   time.Now().Add(time.Hour * 1).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		panic(err)
	}

	fmt.Print(signedToken)
}
