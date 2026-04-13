package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v5"
)

// JWTClaims represents the expected structure of your JWT token
type JWTClaims struct {
	UserID string `json:"user_id"` // or "sub" depending on your auth setup
	Role   string `json:"role"`
	Email  string `json:"email,omitempty"`
	jwt.RegisteredClaims
}

// JWTConfig holds the configuration for JWT validation
type JWTConfig struct {
	Secret     string
	ContextKey string // Key to store claims in Echo context (default: "user")
}

// NewJWTMiddleware creates a new JWT authentication middleware
func NewJWTMiddleware(config JWTConfig) echo.MiddlewareFunc {
	// Set default context key if not provided
	if config.ContextKey == "" {
		config.ContextKey = "user"
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			// 1. Extract token from Authorization header
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing authorization header")
			}

			// 2. Check for "Bearer " prefix
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid authorization header format")
			}

			tokenString := parts[1]

			// --- DEVELOPMENT MOCK FALLBACK ---
			// Allows "mock-token-" prefix for local testing without valid Supabase JWTs
			if strings.HasPrefix(tokenString, "mock-token-") {
				mockID := strings.TrimPrefix(tokenString, "mock-token-")
				c.Set(config.ContextKey, &JWTClaims{
					UserID: mockID,
					Role:   "agent",
					Email:  mockID + "@mock.local",
				})
				c.Set("user_id", mockID)
				c.Set("user_role", "agent")
				c.Set("user_email", mockID+"@mock.local")
				return next(c)
			}

			// 3. Parse and validate the token
			token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
				// Verify the signing method
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(config.Secret), nil
			})

			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid token: "+err.Error())
			}

			// 4. Extract claims
			if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
				// Store claims in context for use in handlers
				c.Set(config.ContextKey, claims)
				c.Set("user_id", claims.UserID)
				c.Set("user_role", claims.Role)
				c.Set("user_email", claims.Email)

				// Continue to next handler
				return next(c)
			}

			return echo.NewHTTPError(http.StatusUnauthorized, "invalid token claims")
		}
	}
}

// OptionalJWT is a middleware that validates JWT if present, but allows requests without it
// Useful for endpoints that have different behavior for authenticated vs anonymous users
func OptionalJWT(config JWTConfig) echo.MiddlewareFunc {
	if config.ContextKey == "" {
		config.ContextKey = "user"
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")

			// No token? That's okay, continue without user context
			if authHeader == "" {
				return next(c)
			}

			// Token present? Validate it
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				// Invalid format but we're optional, so continue
				return next(c)
			}

			tokenString := parts[1]

			// --- DEVELOPMENT MOCK FALLBACK ---
			if strings.HasPrefix(tokenString, "mock-token-") {
				mockID := strings.TrimPrefix(tokenString, "mock-token-")
				c.Set(config.ContextKey, &JWTClaims{
					UserID: mockID,
					Role:   "agent",
					Email:  mockID + "@mock.local",
				})
				c.Set("user_id", mockID)
				c.Set("user_role", "agent")
				c.Set("user_email", mockID+"@mock.local")
				return next(c)
			}

			token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(config.Secret), nil
			})

			// If valid, store claims
			if err == nil {
				if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
					c.Set(config.ContextKey, claims)
					c.Set("user_id", claims.UserID)
					c.Set("user_role", claims.Role)
					c.Set("user_email", claims.Email)
				}
			}

			return next(c)
		}
	}
}

// RequireRole is a middleware that checks if the authenticated user has a specific role
// Must be used AFTER JWTMiddleware
func RequireRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			userRole := c.Get("user_role")
			if userRole == nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "no user role found in context")
			}

			roleStr, ok := userRole.(string)
			if !ok {
				return echo.NewHTTPError(http.StatusInternalServerError, "invalid role type")
			}

			// Check if user has any of the required roles
			for _, role := range roles {
				if roleStr == role {
					return next(c)
				}
			}

			return echo.NewHTTPError(http.StatusForbidden, "insufficient permissions")
		}
	}
}

// GetUserID is a helper function to extract user ID from context
func GetUserID(c *echo.Context) (string, error) {
	userID := c.Get("user_id")
	if userID == nil {
		return "", fmt.Errorf("user_id not found in context")
	}

	id, ok := userID.(string)
	if !ok {
		return "", fmt.Errorf("user_id is not a string")
	}

	return id, nil
}

// GetUserClaims is a helper function to extract full claims from context
func GetUserClaims(c *echo.Context) (*JWTClaims, error) {
	user := c.Get("user")
	if user == nil {
		return nil, fmt.Errorf("user claims not found in context")
	}

	claims, ok := user.(*JWTClaims)
	if !ok {
		return nil, fmt.Errorf("invalid user claims type")
	}

	return claims, nil
}
