#set page(
  paper: "us-letter",
  margin: (top: 3cm, bottom: 2.5cm, x: 2.5cm),
  header: [
    // --- ENCABEZADO CON LOGO ---
    #grid(
      columns: (1fr, auto),
      align: (left, right + horizon),
      [
        // Aquí iría tu imagen: #image("logo.png", width: 4cm)
        // Usamos un placeholder visual por ahora:
        #box(fill: luma(230), inset: 8pt, radius: 4pt)[
          #text(weight: "bold", fill: luma(100))[LOGO EMPRESA]
        ]
      ],
      [
        #text(fill: luma(100), size: 9pt)[
          *Reporte Confidencial* \
          #datetime.today().display()
        ]
      ]
    )
    #v(0.5em)
    #line(length: 100%, stroke: 2pt + rgb("#2563eb")) // Color de marca (Azul)
  ],
  footer: [
    // --- PIE DE PÁGINA ---
    #line(length: 100%, stroke: 0.5pt + gray)
    #v(0.5em)
    #align(center)[
      #text(size: 8pt, fill: gray)[
        *Nombre de la Empresa S.A. de C.V.* | Av. Tecnológica 123, Ciudad de México \
        Tel: +52 55 1234 5678 | web: www.miempresa.com
      ]
    ]
  ]
)

#set text(font: "New Computer Modern", size: 11pt, lang: "es")
#set par(justify: true)

// Título del Documento
#align(center + horizon)[
  #text(size: 24pt, weight: "bold", fill: rgb("#1e3a8a"))[Manual de Identidad]
  #v(0.5em)
  #text(size: 14pt, style: "italic")[Documento Interno de Proyecto]
]

#v(3em)

= 1. Introducción
Esta plantilla está diseñada para mantener la consistencia visual en todos los documentos entregables del proyecto. El encabezado y el pie de página se repiten automáticamente en todas las hojas.

= 2. Elementos de Marca
Podemos definir colores o estilos específicos aquí.

#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 1em,
  [
    #circle(radius: 1cm, fill: rgb("#2563eb"))
    *Color Primario* \
    Hex: \#2563eb
  ],
  [
    #circle(radius: 1cm, fill: rgb("#1e3a8a"))
    *Color Secundario* \
    Hex: \#1e3a8a
  ],
  [
    #circle(radius: 1cm, fill: rgb("#f59e0b"))
    *Acento* \
    Hex: \#f59e0b
  ]
)

#lorem(50)