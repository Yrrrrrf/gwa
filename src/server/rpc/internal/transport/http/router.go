package http

import (
	_ "argus-rpc/docs" // Import generated docs
	"argus-rpc/internal/core"
	"argus-rpc/internal/middleware"
	"argus-rpc/internal/service/notifier"
	"argus-rpc/internal/service/printer"
	"net/http"
	"os"

	"github.com/labstack/echo/v5"
	echomiddleware "github.com/labstack/echo/v5/middleware"
)

func NewRouter(printerSvc *printer.Service, notifierSvc *notifier.Service) *echo.Echo {
	e := echo.New()

	// 1. Standard Middleware
	e.Use(echomiddleware.RequestLogger())
	e.Use(echomiddleware.Recover())

	// CORS Configuration
	// Development: Allow all origins
	// Production: Specify exact origins
	e.Use(echomiddleware.CORS("*"))

	// 2. Serve swagger.json at ROOT level (for external Swagger UI)
	e.GET("/swagger.json", func(c *echo.Context) error {
		return c.File("docs/swagger.json")
	})

	// 3. Native Swagger UI (no external dependencies!)
	e.GET("/swagger/index.html", func(c *echo.Context) error {
		html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Argus RPC - Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; padding:0; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
        window.ui = SwaggerUIBundle({
            url: "/swagger.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
			theme: "dark"
        });
    };
    </script>
</body>
</html>`
		return c.HTML(http.StatusOK, html)
	})

	// Redirect /swagger/* to /swagger/index.html
	e.GET("/swagger/*", func(c *echo.Context) error {
		return c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})

	// 4. Health Check (Public - No Auth Required)
	e.GET("/health", func(c *echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "alive"})
	})

	// ================================================================
	// 5. AUTHENTICATED API ROUTES
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

	// ================================================================
	// PROTECTED ENDPOINTS
	// ================================================================

	// Generate Document (Universal Endpoint)
	v1.POST("/documents/generate", func(c *echo.Context) error {
		var req core.GenerateRequest

		// Parse request body
		if err := echo.BindBody(c, &req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON payload")
		}

		// Get authenticated user info
		userID, err := middleware.GetUserID(c)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "Could not identify user")
		}

		// Execute Logic
		result, err := printerSvc.Generate(c.Request().Context(), req)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}

		return c.JSON(http.StatusOK, core.GenerateResponse{
			PDFBase64:   result.PDFBase64,
			CacheStatus: result.CacheStatus,
			FileSize:    result.FileSize,
			GeneratedBy: userID,
		})
	})

	// Send Notification (New Endpoint)
	// @Summary Dispatch a notification
	// @Description Sends an email, SMS, or webhook via Hermes
	// @Tags notifications
	// @Accept json
	// @Produce json
	// @Param request body core.NotificationRequest true "Notification Payload"
	// @Success 200 {object} map[string]string
	// @Failure 400 {object} echo.HTTPError
	// @Failure 500 {object} echo.HTTPError
	// @Router /v1/notifications/dispatch [post]
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

	// ================================================================
	// OPTIONAL: Admin-Only Routes Example
	// ================================================================

	// Create an admin group
	admin := e.Group("/admin")
	admin.Use(jwtMiddleware)                                // Require authentication
	admin.Use(middleware.RequireRole("admin", "superuser")) // Require specific roles

	// Example: Admin-only endpoint
	admin.GET("/stats", func(c *echo.Context) error {
		claims, _ := middleware.GetUserClaims(c)
		return c.JSON(http.StatusOK, map[string]interface{}{
			"message":     "Admin stats endpoint",
			"accessed_by": claims.Email,
			"role":        claims.Role,
		})
	})

	// ================================================================
	// OPTIONAL: Public Routes (No Auth Required)
	// ================================================================

	// Create a public group
	public := e.Group("/public")

	// Example: Public endpoint (no auth needed)
	public.GET("/info", func(c *echo.Context) error {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"service": "Argus RPC",
			"version": "1.0.0",
		})
	})

	return e
}
