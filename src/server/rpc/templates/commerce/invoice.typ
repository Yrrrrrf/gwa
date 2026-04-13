// Import shared design system
#import "../_lib/brand.typ": *

// 1. Get the Data from the JSON file Go generated
#let data = json(sys.inputs.data_file)

// 2. Render
#show: doc => letter_head(doc) // From brand.typ

= Invoice #{data.ref}
#text(fill: gray)[Date: #data.date]

== Customer
#data.customer

== Details
#table(
  columns: (2fr, 1fr, 1fr, 1fr),
  fill: (_, row) => if calc.odd(row) { luma(240) } else { white },
  [*Description*], [*Qty*], [*Price*], [*Total*],
  // Map the generic list
  ..data.lines.map(line => (
    line.desc,
    str(line.qty),
    "\$" + str(line.price),
    "\$" + str(line.total)
  )).flatten()
)

#align(right)[
  *Total:* #data.currency \$#data.total
]
