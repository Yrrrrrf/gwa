#import "../base/_page.typ": base-page, page-numbers
#import "../base/_typography.typ": h1, h2, body-text, fine-print
#import "../base/_colors.typ": colors
#import "../base/_components.typ": price-display, disclaimer-box

// Load data from Scribe
#let data = {
  let path = sys.inputs.at("data_file", default: none)
  if path != none { json(path) } else { none }
}

#let safe-data = if data == none {
  (
    property: (title: "Sample Property"),
    financials: (
      sales_price: (currency_symbol: "$", formatted_amount: "500,000.00"),
      mortgage_payoff: (currency_symbol: "$", formatted_amount: "100,000.00"),
      commission: (currency_symbol: "$", formatted_amount: "30,000.00"),
      closing_costs: (currency_symbol: "$", formatted_amount: "2,500.00"),
      taxes: (currency_symbol: "$", formatted_amount: "1,200.00"),
      repairs: (currency_symbol: "$", formatted_amount: "5,000.00"),
      estimated_net: (currency_symbol: "$", formatted_amount: "361,300.00")
    )
  )
} else { data }

#base-page(
  title: "Seller's Estimated Net Sheet",
  footer-content: page-numbers(),
  header-content: [
    #grid(
      columns: (1fr, auto),
      text(weight: "bold", size: 14pt, fill: colors.primary)[CHIMERA REAL ESTATE],
      text(fill: colors.gray-500)[Net Sheet Estimate]
    )
    #line(length: 100%, stroke: colors.gray-300)
  ]
)[
  #h1[Seller's Net Sheet]
  #v(12pt)
  #h2[#safe-data.at("property", default: (:)).at("title", default: "Property Listing")]
  
  #v(24pt)
  
  #rect(
    width: 100%,
    fill: colors.gray-100,
    radius: 4pt,
    inset: 20pt,
    stroke: none,
    
    grid(
      columns: (1fr, auto),
      [#text(size: 14pt, weight: "bold")[Estimated Sales Price]],
      [#price-display(safe-data.financials.at("sales_price", default: "0.00"), size: 18pt)]
    )
  )

  #v(24pt)

  #table(
    columns: (1fr, auto),
    inset: 12pt,
    stroke: none,
    fill: (col, row) => if calc.odd(row) { colors.gray-100 } else { white },
    
    [*Description*], [*Amount*],
    
    [Mortgage Payoff], [ (#safe-data.financials.at("mortgage_payoff", default: "0.00")) ],
    [Brokerage Commissions], [ (#safe-data.financials.at("commission", default: "0.00")) ],
    [Title / Escrow / Closing Fees], [ (#safe-data.financials.at("closing_costs", default: "0.00")) ],
    [Transfer Taxes], [ (#safe-data.financials.at("taxes", default: "0.00")) ],
    [Repairs / Credits], [ (#safe-data.financials.at("repairs", default: "0.00")) ],
  )

  #v(24pt)
  
  #align(right)[
    #box(
      width: 60%,
      fill: colors.primary,
      radius: 4pt,
      inset: 16pt,
      
      grid(
        columns: (1fr, auto),
        align: horizon,
        [#text(fill: white, weight: "bold", size: 14pt)[ESTIMATED NET PROCEEDS]],
        [#text(fill: white, weight: "bold", size: 20pt)[
          #let net = safe-data.financials.at("estimated_net", default: "0.00")
          #if type(net) == dictionary {
            [#net.at("currency_symbol", default: "$")#net.at("formatted_amount", default: "0.00")]
          } else {
            [#net]
          }
        ]]
      )
    )
  ]

  #v(1fr)

  #disclaimer-box[
    This is an estimate only, provided for informational purposes. Actual net proceeds will depend on the final sales price, actual payoff amounts, pro-rations of taxes/HOA, and other closing costs not known at this time. This does not constitute a legal or financial guarantee of proceeds.
  ]
]
