// _agent-signature.typ
#import "../base/_colors.typ": colors

#let agent-signature-block(agent, date) = {
  stack(
    spacing: 12pt,
    line(length: 200pt, stroke: 1pt + colors.gray-300),
    text(weight: "bold")[#agent.name],
    text(size: 10pt, fill: colors.gray-500)[#agent.title],
    text(size: 10pt, style: "italic")[Date: #date]
  )
}
