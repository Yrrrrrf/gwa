// _property-card.typ
#import "../base/_colors.typ": colors
#import "../base/_typography.typ": h3

#let property-header(title, address, price) = {
  grid(
    columns: (1fr, auto),
    gutter: 10pt,
    stack(
      spacing: 5pt,
      text(size: 18pt, weight: "bold", fill: colors.primary)[#title],
      text(size: 12pt, fill: colors.gray-700)[#address]
    ),
    align(right + top)[
      #text(size: 20pt, weight: "bold", fill: colors.secondary)[#price]
    ]
  )
}
