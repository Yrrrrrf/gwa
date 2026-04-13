#import "../base/_page.typ": base-page, page-numbers
#import "../base/_typography.typ": body-text, h1, h2, h3, fine-print
#import "../base/_colors.typ": colors
#import "../base/_components.typ": agent-card, price-display, spec-grid, disclaimer-box

// Load data from Scribe
#let data = {
  let path = sys.inputs.at("data_file", default: none)
  if path != none { json(path) } else { none }
}

// Fallback Data
#let safe-data = if data == none {
  (
    subject_property: (
      address: "123 Subject St",
      owner_name: "Owner",
      bedrooms: 0,
      bathrooms: 0,
      sqft: 0,
      year_built: 2000,
      description: "Desc",
      image: "", 
    ),
    generated_by: (name: "Agent"),
    generated_at: "2026-01-01",
    comparables: (),
    market_stats: (median_price: "$0", avg_days_on_market: 0, price_trend_percent: 0),
    valuation: (estimated_value: "$0", confidence_range: ("$0", "$0"), methodology: "None"),
  )
} else { data }

// Cover page
#base-page(title: "Comparative Market Analysis")[
  #v(1in)
  
  #align(right)[
    #text(weight: "bold", size: 18pt, fill: colors.primary)[CHIMERA REAL ESTATE]
  ]
  
  #v(1in)

  #align(center)[
    #h1[Comparative Market Analysis]
    #v(24pt)
    #let sub_prop = safe-data.at("subject_property", default: (:))
    #text(size: 18pt)[#sub_prop.at("address", default: "Unknown Address")]
    #v(48pt)
    #text(size: 14pt, fill: colors.gray-700)[
      Prepared for: #sub_prop.at("owner_name", default: "Valued Client")
    ]
    #v(12pt)
    #text(size: 12pt, fill: colors.gray-500)[
      #safe-data.at("generated_at", default: datetime.today().display())
    ]
  ]

  #v(1fr)

  #align(center)[
    #agent-card(safe-data.at("generated_by", default: (:)))
  ]

  #pagebreak()
]

// Subject property page
#base-page(
  title: "Subject Property",
  footer-content: page-numbers(),
)[
  #let sub_prop = safe-data.at("subject_property", default: (:))
  #h1[Subject Property]
  #v(24pt)

  #grid(
    columns: (1fr, 1fr),
    gutter: 24pt,

    // Property image
    if sub_prop.at("image", default: "") != "" and not sub_prop.image.starts-with("http") {
      image(sub_prop.image, width: 100%)
    } else {
      rect(width: 100%, height: 200pt, fill: colors.gray-300, stroke: none)[
        #align(center + horizon)[
           #if sub_prop.at("image", default: "").starts-with("http") { [Remote Image] } else { [No Image] }
        ]
      ]
    },

    // Property details
    stack(
      spacing: 16pt,

      h2[#sub_prop.at("address", default: "Address")],

      spec-grid((
        bedrooms: str(sub_prop.at("bedrooms", default: 0)),
        bathrooms: str(sub_prop.at("bathrooms", default: 0)),
        sqft: str(sub_prop.at("sqft", default: 0)),
        year_built: str(sub_prop.at("year_built", default: 0)),
      )),

      v(12pt),

      body-text[
        #sub_prop.at("description", default: "No description provided.")
      ],
    ),
  )

  #pagebreak()
]

// Comparables page
#base-page(
  title: "Comparable Properties",
  footer-content: page-numbers(),
)[
  #h1[Comparable Properties]
  #v(24pt)

  #let comps = safe-data.at("comparables", default: ())
  #if type(comps) == array and comps.len() > 0 {
    for comp in comps {
      rect(
        width: 100%,
        fill: colors.gray-100,
        radius: 8pt,
        inset: 16pt,
        stroke: none,

        grid(
          columns: (180pt, 1fr),
          gutter: 16pt,

          // Comp image
          if comp.at("image", default: "") != "" and not comp.image.starts-with("http") {
            image(comp.image, width: 100%, height: 120pt, fit: "cover")
          } else {
            rect(width: 100%, height: 120pt, fill: colors.gray-300, stroke: none)
          },

          // Comp details
          stack(
            spacing: 8pt,

            h3[#comp.at("address", default: "Comp Address")],

            grid(
              columns: (1fr, 1fr, 1fr),
              gutter: 8pt,

              [*Sold:* #comp.at("sold_date", default: "N/A")],
              [*Price:* #comp.at("sold_price", default: "N/A")],
              [*Beds:* #comp.at("bedrooms", default: 0)],
              [*Baths:* #comp.at("bathrooms", default: 0)],
              [*Sq Ft:* #comp.at("sqft", default: 0)],
            ),

            {
              let sqft = comp.at("sqft", default: 0)
              let price = comp.at("sold_price", default: 0)
              if (type(price) == int or type(price) == float) and sqft > 0 {
                text(size: 9pt)[*Price/Sq Ft:* \$#calc.round(price / sqft, digits: 2)]
              }
            },
            
            text(size: 9pt)[*Distance:* #comp.at("distance_miles", default: 0) miles from subject],
          ),
        ),
      )
      v(12pt)
    }
  } else {
    body-text[No comparable properties found in the selected range.]
  }

  #pagebreak()
]

// Market analysis page
#base-page(
  title: "Market Analysis",
  footer-content: page-numbers(),
)[
  #h1[Market Analysis]
  #v(24pt)

  #let stats = safe-data.at("market_stats", default: (:))
  // Market statistics
  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 20pt,

    rect(
      fill: colors.gray-100,
      radius: 8pt,
      inset: 16pt,
      stroke: none,

      stack(
        spacing: 8pt,
        text(size: 10pt, fill: colors.gray-500)[MEDIAN PRICE],
        price-display(stats.at("median_price", default: "0.00"), size: 20pt),
      ),
    ),

    rect(
      fill: colors.gray-100,
      radius: 8pt,
      inset: 16pt,
      stroke: none,

      stack(
        spacing: 8pt,
        text(size: 10pt, fill: colors.gray-500)[AVG DAYS ON MARKET],
        text(size: 20pt, weight: "bold", fill: colors.primary)[
          #stats.at("avg_days_on_market", default: 0)
        ],
      ),
    ),

    rect(
      fill: colors.gray-100,
      radius: 8pt,
      inset: 16pt,
      stroke: none,

      stack(
        spacing: 8pt,
        text(size: 10pt, fill: colors.gray-500)[PRICE TREND],
        text(size: 20pt, weight: "bold", fill: colors.success)[
          ↑ #stats.at("price_trend_percent", default: 0)%
        ],
      ),
    ),
  )

  #v(48pt)

  #h2[Price Per Square Foot Trend]
  #v(12pt)
  #rect(
    width: 100%,
    height: 250pt,
    fill: colors.gray-100,
    stroke: none,

    align(center + horizon)[
      #text(fill: colors.gray-500)[
        [Market Trend Analysis Chart]
      ]
    ],
  )

  #pagebreak()
]

// Valuation page
#base-page(
  title: "Valuation Estimate",
  footer-content: page-numbers(),
)[
  #h1[Estimated Market Value]
  #v(32pt)

  #let val = safe-data.at("valuation", default: (:))
  #align(center)[
    #rect(
      width: 80%,
      fill: gradient.linear(colors.primary-light, colors.primary),
      radius: 12pt,
      inset: 32pt,
      stroke: none,

      stack(
        spacing: 16pt,

        text(size: 14pt, fill: white)[ESTIMATED VALUE],

        price-display(
          val.at("estimated_value", default: "0.00"),
          size: 48pt,
        ),

        {
          let range = val.at("confidence_range", default: ("0.00", "0.00"))
          text(size: 12pt, fill: white)[
            Confidence Range: #range.at(0) - #range.at(1)
          ]
        },
      ),
    )
  ]

  #v(48pt)

  #h2[Valuation Methodology]
  #v(12pt)
  #body-text[
    #val.at("methodology", default: "A comparative analysis of recent sales in the area was used to estimate the value of the subject property, adjusting for differences in features, condition, and location.")
  ]

  #v(1fr)

  #disclaimer-box[
    This CMA is provided as an estimate only and does not constitute an official appraisal. Actual market value may vary based on property condition, market timing, and other factors. For lending purposes, a licensed appraisal is typically required.
  ]
]