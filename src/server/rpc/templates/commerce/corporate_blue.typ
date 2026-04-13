// commerce/corporate_blue.typ
#import "../_lib/brand.typ": *

// 1. Get the Data from the JSON file Go generated
#let data = json(sys.inputs.data_file)
#let config = data.at("template_config", default: (:))

// Override brand color if config specifies
#let primary_color = if "branding" in config and "primaryColor" in config.branding {
  rgb(config.branding.primaryColor)
} else {
  rgb("#2563eb") // Default Blue
}

#let layout_config = config.at("layout", default: (:))
#let page_paper = layout_config.at("pageSize", default: "us-letter")

#set page(
  paper: page_paper,
  margin: (x: 1.5cm, y: 2cm),
)

// Header
#grid(
  columns: (1fr, 1fr),
  [
    #if data.at("company", default: (:)).at("logo_url", default: "") != "" {
       // image(data.company.logo_url, width: 3cm)
       text(weight: "bold", size: 24pt, fill: primary_color)[#data.company.name]
    } else {
       text(weight: "bold", size: 24pt, fill: primary_color)[#data.company.name]
    }
  ],
  [
    #align(right)[
      #text(size: 20pt, weight: "bold", fill: gray.darken(50%))[INVOICE] 
      #v(0.5em)
      #text(weight: "bold")[#data.invoice.number] 
      Date: #data.invoice.issue_date 
      Due: #data.invoice.due_date
    ]
  ]
)

#v(2em)

// Billing Info
#grid(
  columns: (1fr, 1fr),
  gutter: 1cm,
  [
    #text(weight: "bold", fill: primary_color)[FROM] 
    #data.company.name 
    #data.company.address.street 
    #data.company.address.city, #data.company.address.country 
    #text(size: 9pt)[Tax ID: #data.company.tax_id]
  ],
  [
    #text(weight: "bold", fill: primary_color)[BILL TO] 
    #data.customer.name 
    #data.customer.billing_address.street 
    #data.customer.billing_address.city, #data.customer.billing_address.country 
    #data.customer.email
  ]
)

#v(2em)

// Items Table
#table(
  columns: (1fr, auto, auto, auto),
  fill: (col, row) => if row == 0 { primary_color } else if calc.odd(row) { luma(245) } else { white },
  stroke: (x, y) => if y == 0 { none } else { (bottom: 0.5pt + luma(200)) },
  inset: 10pt,
  align: (left, center, right, right),
  table.header(
    text(fill: white, weight: "bold")[Description],
    text(fill: white, weight: "bold")[Qty],
    text(fill: white, weight: "bold")[Unit Price],
    text(fill: white, weight: "bold")[Amount],
  ),
  ..data.line_items.map(item => (
    item.description,
    str(item.quantity),
    str(item.unit_price),
    str(item.amount)
  )).flatten()
)

#v(1em)

// Totals
#grid(
  columns: (1fr, auto),
  [],
  [
    #set align(right)
    #grid(
      columns: (auto, 100pt),
      gutter: 0.5em,
      [Subtotal:], [#data.invoice.currency #str(data.invoice.subtotal)],
      [Tax (10%):], [#data.invoice.currency #str(data.invoice.tax)],
      [#text(weight: "bold", size: 12pt)[TOTAL:]], [#text(weight: "bold", size: 12pt)[#data.invoice.currency #str(data.invoice.total)]]
    )
  ]
)

#v(1fr)

// Footer
#line(length: 100%, stroke: 1pt + primary_color)
#v(0.5em)
#grid(
  columns: (1fr, 1fr),
  [
    #text(size: 9pt, weight: "bold")[Payment Terms] 
    #text(size: 8pt)[#data.at("payment_terms", default: "Net 30 days")]
  ],
  [
    #align(right)[
      #text(size: 8pt, style: "italic")[#data.at("notes", default: "Thank you for your business!")]
    ]
  ]
)
