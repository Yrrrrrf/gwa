// _components.typ - Common UI components
#import "_colors.typ": colors
#import "_typography.typ": font-heading

// Property specification grid
#let spec-grid(specs) = {
  grid(
    columns: (1fr, 1fr, 1fr, 1fr),
    gutter: 12pt,
    ..specs.pairs().map(((key, value)) => {
      stack(
        spacing: 4pt,
        text(size: 9pt, fill: colors.gray-500, weight: "semibold")[
          #upper(key.replace("_", " "))
        ],
        text(size: 14pt, fill: colors.gray-900, weight: "bold")[
          #value
        ]
      )
    }).flatten()
  )
}

// Agent contact card
#let agent-card(agent) = {
  rect(
    width: 100%,
    fill: colors.gray-100,
    radius: 6pt,
    inset: 16pt,
    stroke: none,
    
    grid(
      columns: (auto, 1fr),
      gutter: 16pt,
      
      // Photo placeholder logic
      // In real implementation, check if agent.photo exists
      rect(width: 80pt, height: 80pt, fill: colors.gray-300, radius: 40pt),
      
      // Contact info
      stack(
        spacing: 6pt,
        text(size: 16pt, weight: "bold")[#agent.at("name", default: "Agent Name")],
        text(size: 10pt, fill: colors.gray-700)[#agent.at("title", default: "Real Estate Agent")],
        text(size: 10pt)[#agent.at("phone", default: "")],
        text(size: 10pt)[#agent.at("email", default: "")],
        if "license" in agent {
          text(size: 8pt, fill: colors.gray-500)[License: #agent.license]
        }
      )
    )
  )
}

// Price display with formatting
#let price-display(price, size: 32pt) = {
  text(
    size: size,
    weight: "bold",
    fill: colors.primary,
    font: font-heading
  )[
    // Handle both object with format components or simple string/number
    #if type(price) == dictionary {
      [#price.at("currency_symbol", default: "$")#price.at("formatted_amount", default: "0.00")]
    } else {
      [#price]
    }
  ]
}

// Legal disclaimer box
#let disclaimer-box(content) = {
  rect(
    width: 100%,
    fill: colors.gray-100,
    stroke: colors.gray-300,
    radius: 4pt,
    inset: 12pt,
    
    text(size: 8pt, fill: colors.gray-700)[
      *DISCLAIMER:* #content
    ]
  )
}
