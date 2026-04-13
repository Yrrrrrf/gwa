package main

import (
	"argus-rpc/internal/config"
	"argus-rpc/internal/platform/logger"
	"argus-rpc/internal/platform/providers"
	"argus-rpc/internal/service/notifier"
	argusHttp "argus-rpc/internal/transport/http"
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"strconv"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/labstack/echo/v5"

	hermes "github.com/yrrrrrf/hermes/src"
)

// DebugProvider implements Hermes interfaces for development
type DebugProvider struct{}

func (d *DebugProvider) SendEmail(ctx context.Context, to, subject, htmlBody string) error {
	fmt.Printf("\n[DEBUG-EMAIL] To: %s\nSubject: %s\n%s\n", to, subject, htmlBody)
	return nil
}

func (d *DebugProvider) SendSMS(ctx context.Context, to, body string) error {
	fmt.Printf("\n[DEBUG-SMS] To: %s\nBody: %s\n", to, body)
	return nil
}

func main() {
	// 1. Parse Flags (CLI Arguments)
	cliPort := flag.String("port", "", "Port to listen on")
	cliHost := flag.String("host", "", "Host to bind (e.g. 0.0.0.0 or 127.0.0.1)")
	flag.Parse()

	// 2. Setup Config
	cfg := config.Load()

	// Logic: CLI args > .env > Default
	host := "0.0.0.0" // Default to Exposed (Docker friendly)
	if *cliHost != "" {
		host = *cliHost
	}

	targetPort := "4000" // Default fallback

	// Priority: CLI flag > Config > Environment > Default
	if *cliPort != "" {
		targetPort = *cliPort
	} else if cfg.Port != "" {
		targetPort = cfg.Port
	} else if envPort := os.Getenv("PORT_RPC"); envPort != "" {
		targetPort = envPort
	}

	// --- AUTO-PORT FEATURE ---
	finalPort, err := findAvailablePort(targetPort)
	if err != nil {
		slog.Error("Port resolution failed",
			"attempted_port", targetPort,
			"error", err,
			"suggestion", "Check if PORT_RPC is set correctly or use --port flag")
		panic(fmt.Sprintf("Could not find an available port starting from %s", targetPort))
	}

	// 3. Setup Logger
	var handler slog.Handler
	if cfg.Debug {
		// Pretty colors for Local Dev
		handler = logger.NewPrettyHandler(os.Stdout)
	} else {
		// JSON for Production (Fast, Machine Readable)
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})
	}
	slogLogger := slog.New(handler)
	slog.SetDefault(slogLogger)

	// 4. Setup Infrastructure (Hermes)
	hermesEngine := setupHermes(cfg)

	// 5. Setup Services
	notifierService := notifier.New(hermesEngine, cfg.APIUrl, cfg.SupabaseKey)

	// 6. Setup Router
	e := argusHttp.NewRouter(notifierService)
	e.Logger = slogLogger

	// 7. Start Preparation
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	address := fmt.Sprintf("%s:%s", host, finalPort)

	sc := echo.StartConfig{
		Address:         address,
		GracefulTimeout: 10 * time.Second,
		HideBanner:      true,
	}

	// --- 8. DYNAMIC BANNER ---
	printBanner(host, finalPort, "v0.3.0")

	// 9. Start
	go func() {
		if err := sc.Start(ctx, e); err != nil {
			slogLogger.Error("Server shutdown", "error", err)
		}
	}()

	// Wait for interrupt signal (handled by NotifyContext above)
	<-ctx.Done()

	slog.Info("Shutting down...")

	// Create a timeout for graceful shutdown (e.g., 5 seconds to finish emails)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 2. Drain Notifier Queue (finish pending emails)
	slog.Info("Draining notification queue...")
	if err := notifierService.Shutdown(shutdownCtx); err != nil {
		slog.Error("Notifier shutdown error", "error", err)
	} else {
		slog.Info("Notification queue drained")
	}

	slog.Info("Server exited")
}

// setupHermes initializes the notification engine based on environment
func setupHermes(cfg *config.Config) *hermes.Engine {
	var emailProv hermes.EmailProvider
	var smsProv hermes.SMSProvider

	if cfg.Debug {
		// Use DebugProvider for local dev
		dbg := &DebugProvider{}
		emailProv, smsProv = dbg, dbg
		slog.Info("Hermes running in DEBUG mode (Stdout only)")
	} else {
		// Production: Use real providers
		// 1. SMTP Provider
		if cfg.SMTPHost != "" {
			emailProv = providers.NewSMTP(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass)
			slog.Info("Hermes: SMTP Provider loaded", "host", cfg.SMTPHost)
		} else {
			slog.Warn("Hermes: No SMTP config found, falling back to Debug Email")
			emailProv = &DebugProvider{}
		}

		// 2. SMS Provider (Stub for now, or use Twilio if implemented)
		// smsProv = providers.NewTwilio(...)
		slog.Info("Hermes: SMS Provider not configured (using Debug)")
		smsProv = &DebugProvider{}
	}

	return hermes.New(hermes.Config{
		Debug:         cfg.Debug,
		MaxRetries:    3,
		EmailProvider: emailProv,
		SMSProvider:   smsProv,
	})
}

// --- HELPER FUNCTIONS ---

func findAvailablePort(startPort string) (string, error) {
	if startPort == "" {
		return "", fmt.Errorf("startPort cannot be empty")
	}

	port, err := strconv.Atoi(startPort)
	if err != nil {
		return "", fmt.Errorf("invalid port number '%s': %w", startPort, err)
	}

	if port < 1 || port > 65535 {
		return "", fmt.Errorf("port %d out of valid range (1-65535)", port)
	}

	for i := 0; i < 100; i++ {
		current := strconv.Itoa(port + i)
		ln, err := net.Listen("tcp", ":"+current)
		if err == nil {
			ln.Close()
			return current, nil
		}
	}
	return "", fmt.Errorf("no available ports found in range %d-%d", port, port+99)
}

func getOutboundIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "?"
	}
	defer conn.Close()
	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

func printBanner(host, port, version string) {
	var (
		colorBrand   = lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Bold(true).PaddingLeft(2)
		colorVersion = lipgloss.NewStyle().Foreground(lipgloss.Color("240"))
		colorArrow   = lipgloss.NewStyle().Foreground(lipgloss.Color("46")).Bold(true).PaddingLeft(2)
		colorLink    = lipgloss.NewStyle().Foreground(lipgloss.Color("86")).Underline(true)
		colorNetwork = lipgloss.NewStyle().Foreground(lipgloss.Color("240"))
	)

	fmt.Println()
	fmt.Printf("%s %s\n", colorBrand.Render("TEMPLATE RPC"), colorVersion.Render(version))
	fmt.Println()

	localHost := "localhost"
	if host != "0.0.0.0" && host != "" {
		localHost = host
	}
	fmt.Printf("%s  Local:   %s\n", colorArrow.Render("➜"), colorLink.Render(fmt.Sprintf("http://%s:%s", localHost, port)))

	if host == "0.0.0.0" {
		ip := getOutboundIP()
		fmt.Printf("%s  Network: %s\n", colorArrow.Render("➜"), colorLink.Render(fmt.Sprintf("http://%s:%s", ip, port)))
	} else {
		fmt.Printf("%s  Network: %s\n", colorArrow.Render("➜"), colorNetwork.Render("use --host 0.0.0.0 to expose"))
	}

	fmt.Println()
}
