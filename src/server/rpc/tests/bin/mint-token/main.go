package main

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

func main() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		fmt.Fprintln(os.Stderr, "Error: JWT_SECRET environment variable is not set")
		os.Exit(1)
	}

	claims := Claims{
		Sub:   "user:alice",
		Email: "alice@demo.com",
		Role:  "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "template-engine",
			Audience:  jwt.ClaimStrings{"template-rpc"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(2 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error signing token: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(tokenString)
}
