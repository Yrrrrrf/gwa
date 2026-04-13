// _page.typ - Master page configuration
#let base-page(
  title: "",
  paper: "us-letter", // "us-letter" or "a4"
  margin: (x: 0.75in, y: 1in),
  header-content: none,
  footer-content: none,
  body
) = {
  set page(
    paper: paper,
    margin: margin,
    header: header-content,
    footer: footer-content
  )
  
  set document(
    title: title,
    author: "Chimera Real Estate Platform"
  )
  
  body
}

// Page numbering component
#let page-numbers() = {
  context {
    let page-num = counter(page).get().first()
    // let total = counter(page).final().first() // 'final' requires context in newer Typst
    
    align(center)[
      #text(size: 9pt, fill: rgb("#666666"))[
        Page #page-num
      ]
    ]
  }
}
