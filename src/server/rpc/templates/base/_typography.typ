// _typography.typ - Font hierarchy

// Font families (fallback chain for multi-OS support)
#let font-heading = ("Liberation Sans", "DejaVu Sans")
#let font-body = ("Liberation Sans", "DejaVu Sans")
#let font-mono = ("Liberation Mono", "DejaVu Sans Mono")

// Heading styles
#let h1(content) = {
  text(
    font: font-heading,
    size: 24pt,
    weight: "bold",
    fill: rgb("#1a1a1a")
  )[#content]
}

#let h2(content) = {
  text(
    font: font-heading,
    size: 18pt,
    weight: "semibold",
    fill: rgb("#2c2c2c")
  )[#content]
}

#let h3(content) = {
  text(
    font: font-heading,
    size: 14pt,
    weight: "semibold",
    fill: rgb("#404040")
  )[#content]
}

// Body text
#let body-text(content) = {
  text(
    font: font-body,
    size: 11pt,
    fill: rgb("#333333")
  )[#content]
}

// Fine print / disclaimers
#let fine-print(content) = {
  text(
    font: font-body,
    size: 8pt,
    fill: rgb("#666666"),
    style: "italic"
  )[#content]
}
