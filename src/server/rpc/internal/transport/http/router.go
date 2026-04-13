package http

import (
	"argus-rpc/internal/core"
	"argus-rpc/internal/middleware"
	"argus-rpc/internal/service/notifier"
	"net/http"
	"os"

	"github.com/labstack/echo/v5"
	echomiddleware "github.com/labstack/echo/v5/middleware"
)

func NewRouter(notifierSvc *notifier.Service) *echo.Echo {
	e := echo.New()

	// 1. Standard Middleware
	e.Use(echomiddleware.RequestLogger())
	e.Use(echomiddleware.Recover())

	// CORS Configuration
	e.Use(echomiddleware.CORS("*"))

	// 2. Health Check (Public - No Auth Required)
	e.GET("/health", func(c *echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "alive"})
	})

	// ================================================================
	// 3. AUTHENTICATED API ROUTES
	// ================================================================

	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		// CRITICAL: Don't start server without JWT secret
		panic("JWT_SECRET environment variable is required")
	}

	// Create JWT middleware
	jwtMiddleware := middleware.NewJWTMiddleware(middleware.JWTConfig{
		Secret:     jwtSecret,
		ContextKey: "user",
	})

	// API V1 Group with JWT Authentication
	v1 := e.Group("/v1")
	v1.Use(jwtMiddleware) // ALL routes under /v1 now require authentication

	// Send Notification
	v1.POST("/notifications/dispatch", func(c *echo.Context) error {
		var req core.NotificationRequest

		// Parse request body
		if err := echo.BindBody(c, &req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON payload")
		}

		// Execute Logic
		if err := notifierSvc.Send(c.Request().Context(), req); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}

		return c.JSON(http.StatusOK, map[string]string{"status": "dispatched"})
	})

	return e
}
