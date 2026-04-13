// Import shared design system
#import "../_lib/brand.typ": *

// 1. Get the Data from the JSON file Go generated
#let data = json(sys.inputs.data_file)

// 2. Render
#show: doc => letter_head(doc)

= Product Brochure

#v(1cm)

// Product Title
#align(center)[
  #text(size: 24pt, weight: "bold", fill: brand_color)[#data.title]
  #v(0.5em)
  #text(size: 14pt, fill: gray)[SKU: #data.sku]
]

#v(2cm)

// Specs Table
#align(center)[
  #table(
    columns: (1fr, 2fr),
    inset: 10pt,
    stroke: none,
    fill: (_, row) => if calc.odd(row) { luma(240) } else { white },
    [*Specification*], [*Value*],
    ..data.specs.pairs().map(((k, v)) => (
      text(weight: "bold")[#k], v
    )).flatten()
  )
]

#v(2fr)

// Price / Footer Area
#align(center)[
  #box(stroke: 2pt + brand_color, inset: 20pt, radius: 8pt)[
    #text(size: 18pt, weight: "bold")[Price: \$#data.price]
  ]
]
