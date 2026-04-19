package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	JWTSecret   string
	APIUrl      string
	SupabaseKey string
	Debug       bool

	// Notification Providers
	SMTPHost    string
	SMTPPort    int
	SMTPUser    string
	SMTPPass    string
	TwilioSID   string
	TwilioToken string
	TwilioFrom  string
}

func Load() *Config {
	// Attempt to load .env, but don't panic if missing (Docker passes envs differently)
	_ = godotenv.Load()

	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))

	return &Config{
		Port:      getEnv("PORT_RPC", "4000"),
		JWTSecret: getEnv("JWT_SECRET", "super-secret-template-key-change-me-in-production"),
		// Default to Supabase local API if not set
		APIUrl: getEnv("API_URL", "http://127.0.0.1:54321/rest/v1"), SupabaseKey: getEnv("SUPABASE_ANON_KEY", "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"), // Local Dev Default
		Debug: getEnv("DEBUG", "false") == "true",

		SMTPHost:    getEnv("SMTP_HOST", ""),
		SMTPPort:    smtpPort,
		SMTPUser:    getEnv("SMTP_USER", ""),
		SMTPPass:    getEnv("SMTP_PASS", ""),
		TwilioSID:   getEnv("TWILIO_SID", ""),
		TwilioToken: getEnv("TWILIO_TOKEN", ""),
		TwilioFrom:  getEnv("TWILIO_FROM", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
