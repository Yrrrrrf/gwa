package printer

import (
	"argus-rpc/internal/core"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	scribe "github.com/yrrrrrf/scribe/src"
)

type Service struct {
	engine     *scribe.Engine
	apiURL     string
	apiKey     string
	timeout    time.Duration
	httpClient *http.Client
}

func New(engine *scribe.Engine, apiURL, apiKey string) *Service {
	return &Service{
		engine:  engine,
		apiURL:  apiURL,
		apiKey:  apiKey,
		timeout: 10 * time.Second,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:       10,
				IdleConnTimeout:    30 * time.Second,
				DisableCompression: false,
			},
		},
	}
}

// GenerateResponse is returned by Generate
type GenerateResult struct {
	PDFBase64   string
	CacheStatus string
	FileSize    int64
}

// Generate is completely agnostic. It doesn't know what a "price" or "sku" is.
func (s *Service) Generate(ctx context.Context, req core.GenerateRequest) (*GenerateResult, error) {
	// 1. Validate Input
	if req.RecordID == "" || req.Template == "" {
		return nil, fmt.Errorf("record_id and template are required")
	}

	// 2. Resolve SQL View Name
	safeTemplate := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '/' || r == '-' {
			return r
		}
		return -1
	}, req.Template)
	safeTemplate = strings.Trim(safeTemplate, "/")

	// Convert path separators and hyphens to underscores for the SQL View
	// e.g. "listing/listing-sheet" -> "rpc_docs_listing_listing_sheet"
	normalizedName := strings.ReplaceAll(safeTemplate, "/", "_")
	normalizedName = strings.ReplaceAll(normalizedName, "-", "_")

	viewName := fmt.Sprintf("rpc_docs_%s", normalizedName)

	// 3. Construct URL
	url := fmt.Sprintf("%s/%s?record_id=eq.%s", s.apiURL, viewName, req.RecordID)

	// 4. Fetch Data
	dbCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	// --- 4a. Fetch Payload Data ---
	payload, err := s.fetchRow(dbCtx, url)
	if err != nil {
		return nil, fmt.Errorf("fetch payload failed: %w", err)
	}

	// --- 4b. Fetch Template Configuration ---
	// If the template path looks like "commerce/corporate_blue", we assume "Corporate Blue" or based on seed logic
	// For now, we query the `commerce.invoice_templates` view if applicable.
	// As a simplification for Typst, we will just use defaults if not found.
	// In a real impl, we would hit `/api/invoice_templates?is_default=is.true` or based on `req.Template`

	// 5. Data Normalization
	renderData := payload
	if val, ok := payload["json_data"]; ok {
		if m, ok := val.(map[string]interface{}); ok {
			renderData = m
		}
	}

	// 6. Invoke Typst (The Renderer via Scribe)
	pdfBytes, err := s.engine.Render(ctx, safeTemplate+".typ", renderData)
	if err != nil {
		return nil, fmt.Errorf("render error: %w", err)
	}

	return &GenerateResult{
		PDFBase64:   base64.StdEncoding.EncodeToString(pdfBytes),
		CacheStatus: "miss", // Cache implementation would go here (checking commerce.pdf_render_cache)
		FileSize:    int64(len(pdfBytes)),
	}, nil
}

func (s *Service) fetchRow(ctx context.Context, url string) (map[string]interface{}, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Add Supabase Headers
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Accept-Profile", "api")

	// Debug Logging
	// fmt.Printf("Fetching: %s\nHeaders: %v\n", url, req.Header)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		// Read body for error details
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var rows []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("no rows found for url: %s", url)
	}
	return rows[0], nil
}
