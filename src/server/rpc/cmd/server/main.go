package main

import (
	v1 "argus-rpc/gen/template/v1"
	"argus-rpc/internal/config"
	"argus-rpc/internal/middleware"
	"argus-rpc/internal/platform/logger"
	"argus-rpc/internal/platform/providers"
	"argus-rpc/internal/service/notifier"
	argusGrpc "argus-rpc/internal/transport/grpc"
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
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

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
	// 1. Parse Flags
	cliPort := flag.String("port", "", "Port to listen on")
	cliHost := flag.String("host", "", "Host to bind")
	flag.Parse()

	// 2. Setup Config
	cfg := config.Load()

	host := "0.0.0.0"
	if *cliHost != "" {
		host = *cliHost
	}

	targetPort := "4000"
	if *cliPort != "" {
		targetPort = *cliPort
	} else if cfg.Port != "" {
		targetPort = cfg.Port
	}

	finalPort, err := findAvailablePort(targetPort)
	if err != nil {
		panic(err)
	}

	// 3. Setup Logger
	var handler slog.Handler
	if cfg.Debug {
		handler = logger.NewPrettyHandler(os.Stdout)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	}
	slogLogger := slog.New(handler)
	slog.SetDefault(slogLogger)

	// 4. Setup Infrastructure
	hermesEngine := setupHermes(cfg)

	// 5. Setup Services
	notifierService := notifier.New(hermesEngine, cfg.APIUrl, cfg.SupabaseKey)

	// 6. Setup gRPC Server
	lis, err := net.Listen("tcp", fmt.Sprintf("%s:%s", host, finalPort))
	if err != nil {
		slog.Error("Failed to listen", "error", err)
		os.Exit(1)
	}

	s := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			middleware.LoggingInterceptor(),
			middleware.AuthInterceptor(cfg.JWTSecret),
		),
	)
	
	// Register Handlers
	v1.RegisterNotifierServiceServer(s, argusGrpc.NewNotifierHandler(notifierService))
	v1.RegisterDocumentServiceServer(s, argusGrpc.NewDocumentHandler())
	
	// Health Check
	healthServer := health.NewServer()
	grpc_health_v1.RegisterHealthServer(s, healthServer)
	healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)
	
	// Reflection for grpcurl
	reflection.Register(s)

	// 7. Start Preparation
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	// --- 8. DYNAMIC BANNER ---
	printBanner(host, finalPort, "v0.4.0 (gRPC)")

	// 9. Start
	go func() {
		slog.Info("gRPC server starting", "address", lis.Addr().String())
		if err := s.Serve(lis); err != nil {
			slog.Error("gRPC server failed", "error", err)
		}
	}()

	// Wait for interrupt
	<-ctx.Done()

	slog.Info("Shutting down...")
	
	// Graceful stop gRPC
	s.GracefulStop()

	// Drain Notifier Queue
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := notifierService.Shutdown(shutdownCtx); err != nil {
		slog.Error("Notifier shutdown error", "error", err)
	}

	slog.Info("Server exited")
}

func setupHermes(cfg *config.Config) *hermes.Engine {
	var emailProv hermes.EmailProvider
	var smsProv hermes.SMSProvider

	if cfg.Debug {
		dbg := &DebugProvider{}
		emailProv, smsProv = dbg, dbg
		slog.Info("Hermes running in DEBUG mode")
	} else {
		if cfg.SMTPHost != "" {
			emailProv = providers.NewSMTP(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass)
		} else {
			emailProv = &DebugProvider{}
		}
		smsProv = &DebugProvider{}
	}

	return hermes.New(hermes.Config{
		Debug:         cfg.Debug,
		MaxRetries:    3,
		EmailProvider: emailProv,
		SMSProvider:   smsProv,
	})
}

func findAvailablePort(startPort string) (string, error) {
        // Force the configured port, don't hunt for one
        ln, err := net.Listen("tcp", ":"+startPort)
        if err != nil {
                return "", fmt.Errorf("port %s is already in use: %w", startPort, err)
        }
        ln.Close()
        return startPort, nil
}
func printBanner(host, port, version string) {
	colorBrand := lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Bold(true).PaddingLeft(2)
	fmt.Println()
	fmt.Printf("%s %s\n", colorBrand.Render("TEMPLATE RPC"), version)
	fmt.Printf("  Address: %s:%s\n", host, port)
	fmt.Println()
}
