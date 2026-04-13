#set page(
  paper: "a5", // Tamaño media carta (común para recibos)
  margin: 1.5cm,
  fill: rgb("#fdfdfd") // Un fondo muy sutilmente grisáceo para diferenciarlo
)

#set text(font: "New Computer Modern", lang: "es")

// --- ENCABEZADO DEL RECIBO ---
#grid(
  columns: (1fr, auto),
  gutter: 1em,
  [
    #text(size: 18pt, weight: "bold", fill: rgb("#0f172a"))[RECIBO DE HONORARIOS] \
    #v(0.2em)
    #text(size: 10pt, fill: gray)[Servicios Profesionales de Desarrollo de Software]
  ],
  [
    #align(right)[
      #box(stroke: 1pt + red, inset: 8pt, radius: 4pt)[
        #text(weight: "bold", fill: red)[FOLIO: A-001]
      ] \
      #v(0.5em)
      *Fecha:* 27/Nov/2025
    ]
  ]
)

#line(length: 100%, stroke: 1pt + black)
#v(1em)

// --- DATOS DEL CLIENTE Y EMISOR ---
#grid(
  columns: (1fr, 1fr),
  gutter: 2em,
  [
    *De:* \
    [Tu Nombre Completo] \
    RFC: XXXX000000XXX \
    Ciudad de México, México
  ],
  [
    *Para:* \
    [Nombre del Cliente] \
    RFC: CLIENTE000000 \
    Dirección del Cliente
  ]
)

#v(2em)

// --- TABLA DE CONCEPTOS ---
#table(
  columns: (auto, 3fr, 1fr),
  inset: 10pt,
  stroke: (x, y) => if y == 0 { (bottom: 1pt + black) } else { (bottom: 0.5pt + gray) },
  align: (x, y) => if x == 2 { right } else { left },
  
  // Encabezados
  [*Cant.*], [*Descripción*], [*Importe*],
  
  // Fila 1
  [1], 
  [
    *Desarrollo de Software - Fase 1* \
    Configuración de entorno, despliegue de MVP y diseño de base de datos inicial.
  ], 
  [\$20,000.00],
  
)

#v(1em)

// --- TOTALES ---
#align(right)[
  #grid(
    columns: (auto, auto),
    gutter: 1em,
    align: (right, right),
    [Subtotal:], [\$20,000.00],
    [IVA (16%):], [\$3,200.00],
    [Retenciones ISR (10%):], [\$-2,000.00], // Opcional según régimen
    // #line(length: 100%, stroke: 0.5pt), #line(length: 100%, stroke: 0.5pt),
    [*TOTAL NETO:*], [#text(size: 14pt, weight: "bold")[\$21,200.00 MXN]]
  )
]

#v(2fr) // Empuja lo siguiente al final

// --- PIE DE RECIBO ---
#align(center)[
  #text(size: 9pt, style: "italic")[
    Gracias por su confianza. \
    Este documento es un comprobante de servicios profesionales.
  ]
]