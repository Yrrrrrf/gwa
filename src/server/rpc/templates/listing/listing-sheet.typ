#import "../base/_page.typ": base-page, page-numbers
#import "../base/_typography.typ": body-text, fine-print, h1, h2, h3
#import "../base/_colors.typ": colors
#import "../base/_components.typ": agent-card, disclaimer-box, price-display, spec-grid

// Load data from Scribe (injected as "data_file" by the Go service)
#let data = {
  let path = sys.inputs.at("data_file", default: none)
  if path != none { json(path) } else { none }
}

// Fallback for empty data (dev mode)
#let safe-data = if data == none {
  (
    property: (
      title: "Sample Property",
      description: "No data provided.",
      address: (formatted: "123 Main St"),
      price: (currency_symbol: "$", formatted_amount: "0"),
      specifications: (bedrooms: 0, bathrooms: 0, sqft: 0, lot_size: 0),
      features: (),
      media: (hero: (url: "")),
    ),
    agent: (name: "Agent Name"),
    branding: (company_name: "Chimera", logo: "", tagline: ""),
    compliance: (legal_disclaimers: ("Sample Disclaimer",), mls_id: "000000", watermark_required: false),
  )
} else { data }

#base-page(
  title: safe-data.at("property", default: (:)).at("title", default: "Property Listing"),
  paper: "us-letter",

  // Header with branding
  header-content: [
    #let branding = safe-data.at("branding", default: (:))
    #grid(
      columns: (1fr, auto),
      align: (left, right),

      // Logo placeholder if no logo provided
      if branding.at("logo", default: "") != "" {
        image(branding.logo, width: 120pt)
      } else {
        text(size: 20pt, weight: "bold", fill: colors.primary)[#branding.at("company_name", default: "Chimera")]
      },

      stack(
        spacing: 2pt,
        align(right)[
          #text(size: 10pt, fill: colors.gray-700)[
            #branding.at("company_name", default: "")
          ]
        ],
        align(right)[
          #text(size: 8pt, fill: colors.gray-500)[
            #branding.at("tagline", default: "")
          ]
        ],
      ),
    )
    #line(length: 100%, stroke: colors.gray-300)
  ],

  // Footer with page numbers and disclaimers
  footer-content: [
    #let compliance = safe-data.at("compliance", default: (:))
    #line(length: 100%, stroke: colors.gray-300)
    #grid(
      columns: (1fr, auto, 1fr),
      align: (left, center, right),

      fine-print[#compliance.at("legal_disclaimers", default: ("",)).at(0, default: "")],
      page-numbers(),
      fine-print[MLS ID: #compliance.at("mls_id", default: "N/A")],
    )
  ],
)[
  #let property = safe-data.at("property", default: (:))
  // Hero image with property address overlay
  #let hero-media = property.at("media", default: (:)).at("hero", default: none)
  #let hero-url = if hero-media != none { hero-media.at("url", default: "") } else { "" }

  // Typst (via Scribe) often requires local paths or a configured fetcher.
  // For this test, we skip remote URLs to avoid "file not found" errors.
  #if hero-url != "" and not hero-url.starts-with("http") {
    box(
      width: 100%,
      height: 300pt,
      clip: true,
      fill: colors.gray-300,
      image(hero-url, width: 100%, height: 300pt, fit: "cover"),
    )
  } else {
    rect(width: 100%, height: 300pt, fill: colors.gray-300, stroke: none)[
      #align(center + horizon)[
        #if hero-url.starts-with("http") {
          [Remote Image (Not Loaded)]
        } else {
          [No Hero Image]
        }
      ]
    ]
  }

  // Address Overlay (Separate from box to avoid clipping issues if not positioned perfectly)
  #v(-60pt) // Move up to overlap
  #rect(
    width: 100%,
    fill: rgb(0, 0, 0, 150), // Semi-transparent black
    inset: 12pt,
    stroke: none,
    stack(
      spacing: 4pt,
      text(size: 24pt, fill: white, weight: "bold")[#property.at("title", default: "Unknown Property")],
      text(size: 12pt, fill: white)[#property.at("address", default: (:)).at("formatted", default: "No Address Provided")],
    ),
  )

  #v(24pt)

  // Price and key specs
  #let specs = property.at("specifications", default: (:))
  #grid(
    columns: (auto, 1fr),
    gutter: 32pt,

    price-display(property.at("price", default: "0.00")),

    spec-grid((
      bedrooms: str(specs.at("bedrooms", default: 0)) + " BD",
      bathrooms: str(specs.at("bathrooms", default: 0)) + " BA",
      sqft: str(specs.at("sqft", default: 0)) + " Sq Ft",
      lot_size: {
        let lot = specs.at("lot_size", default: none)
        if lot != none { str(lot) + " Sq Ft Lot" } else { "N/A" }
      },
    )),
  )

  #v(32pt)

  // Property description
  #h2[About This Property]
  #v(12pt)
  #body-text[
    #property.at("description", default: "No description available.")
  ]

  #v(32pt)

  // Additional features
  #h3[Features & Amenities]
  #v(12pt)
  #let feats = property.at("features", default: ())
  #if type(feats) == array and feats.len() > 0 {
    grid(
      columns: (1fr, 1fr),
      gutter: 16pt,
      ..feats.map(feature => {
        [• #feature]
      })
    )
  } else if type(feats) == dictionary {
    // Handle the boolean dictionary format from the DB
    grid(
      columns: (1fr, 1fr),
      gutter: 16pt,
      ..feats.pairs().filter(((k, v)) => v == true).map(((k, v)) => {
        [• #upper(k.replace("_", " "))]
      })
    )
  } else {
    [No specific features listed.]
  }

  #v(32pt)

  // Agent contact
  #agent-card(safe-data.at("agent", default: (:)))

  #v(24pt)

  // Disclaimers
  #let compliance = safe-data.at("compliance", default: (:))
  #disclaimer-box[
    #compliance.at("legal_disclaimers", default: ()).join(" ")
  ]

  // Watermark for MLS compliance
  #if compliance.at("watermark_required", default: false) {
    place(
      center + horizon,
      rotate(
        -45deg,
        text(
          size: 72pt,
          fill: colors.watermark,
          weight: "bold",
        )[
          ACTIVE LISTING
        ],
      ),
    )
  }
]
