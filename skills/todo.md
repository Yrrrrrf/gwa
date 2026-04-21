## TODO

**Empieza por resolver el bug de protobuf-es que vimos en el primer turno**. No
es glamoroso, pero es literalmente el único bloqueador real ahorita mismo — todo
lo demás del plan asume que esa inconsistencia v1/v2 está resuelta, y si no la
arreglas primero, la Fase 2 del servidor no puede arrancar y todo el pipeline de
derivación queda colgado.

Concretamente, veinte minutos de trabajo: decides una versión (recomendaría v2
porque es donde va el ecosistema), alineas `buf.gen.yaml` con `package.json`,
regeneras, confirmas que `just tests::test` queda verde. Ese es el día uno.

### Semana 1 — Limpia la base que ya tienes.** Fase 1 del spec del servidor: audita `db/init/`, verifica que no haya entidades de sobra, que las quince pruebas de Hurl cubran cada capacidad, escribe el README que mapea capacidad→test. Esto es trabajo de contracción, no de expansión. El premio es que quedas con un `db/` del que puedes decir con seguridad "esto es el mínimo que ejercita las siete capacidades de SurrealDB". Todo lo que venga después descansa sobre esa afirmación.

### Semana 2 — Proto como fuente única de formas de cable.** Fase 2 del servidor: escribe `entities.proto`, wirea `tonic-prost-build`, escribe la capa de conversión proto↔domain, verifica que `just proto:check` detecta drift. Esta es la fase de mayor riesgo porque toca tres lenguajes, pero es también la que desbloquea todo lo del cliente después. Si quieres un test de fe rápido: cambia un campo en el `.proto`, regenera, confirma que el código Rust y Go ven el cambio sin que tocaras nada más.

### Semana 3 — WASM + schema export en paralelo.** Fases 3 y 4 del servidor. Estas dos son independientes entre sí, puedes hacerlas en orden o en paralelo si el tiempo te alcanza. El WASM es más delicado (tsify tiene bordes filosos), el schema export es literalmente un binario que escribe a stdout — 200 líneas. Haz primero el schema export para tener una victoria rápida y confianza, después métete al WASM.

Ahí el servidor ya cumple su parte. Ahora al cliente:

### **Semana 4 — SDK skeleton.** Fase 1 del cliente: crea `sdk/api` y `sdk/pkgs` vacíos pero con `package.json` correctos y reglas de lint que enforcen la jerarquía. Es trabajo estructural aburrido pero necesario — instalar la pared antes de pintarla.

### **Semana 5 — API con auth hardcoded.** Fase 2 del cliente. Aquí es donde empiezas a ver cosas funcionar extremo a extremo por primera vez. Escribe las operaciones de `sdk/api`, prueba `fetchItems()` desde un REPL, pobla el `itemStore`, confirma que un componente reactivo de Svelte ve el cambio. Ese es el primer momento "el template respira".

### **Semana 6 — pkgs consumiendo el servidor.** Fase 3 del cliente. `graphql-codegen` leyendo el `schema.graphql` del servidor, `protoc-gen-es` leyendo los protos, `wasm-pack` compilando el módulo. Los tipos hechos a mano en `sdk/core/entities/` se borran y se reemplazan con re-exportes de `sdk/pkgs`. Este es el momento donde el pipeline de derivación se cierra de punta a punta.

### **Semana 7 — Explorer.** Fase 4 del cliente. Las cinco rutas. Aquí es donde el template finalmente se ve como una app. Empieza por `/` (discover) porque no requiere auth y ejercita la lectura pública, después `/items/:id` porque es donde todo el stack se ejercita en un clic, después los formularios de create/edit, por último `/me` que es el que requiere el perspective toggle (el componente más sutil de construir).

### **Semana 8 — Trim y docs.** Fases 5 de ambos specs combinadas. Borra XIBALBA, borra los arrays de métricas hardcodeadas, escribe `ARCHITECTURE.md` y `FORKING.md`, activa todas las fitness functions en CI. Esta es la semana que hace la diferencia entre "proyecto personal que parece template" y "template que alguien puede forkear en una tarde".

---

Ahora el consejo no solicitado, porque lo veo venir: **no hagas las ocho semanas
en orden estricto**. Es un plan, no una sentencia. Si en la semana 3 te das
cuenta de que extrañas ver el cliente funcionando, salta a la semana 5 con tipos
hechos a mano temporales en `sdk/core`, construye Explorer con datos falsos, y
después vuelves a cerrar el pipeline de derivación. El plan asume que prefieres
construir en orden de dependencias; pero construir en orden de motivación
también es válido, siempre que al final cierres todos los agujeros.

La segunda cosa que no te dije antes pero vale: **el primer PR que abras debería
ser algo tan pequeño que no haya manera de procrastinarlo**. No "Fase 1 del
servidor". Sería "Arreglar protobuf-es version mismatch" — literalmente dos
archivos modificados, commit, push, verde en CI, cierre. Eso te da el sabor de
"esto se mueve" y baja la fricción para el siguiente. Las fases son unidades
mentales, no unidades de PR. PRs chicos, fases grandes.

Y la tercera, la más importante: **la spec no es contrato**. Es un mapa. Si en
la Fase 2 descubres que `tonic-prost-build` tiene un problema que te fuerza a
reestructurar `entities.proto` distinto a como lo planteé, cambia la spec. La
escribimos juntos en una tarde; no merece la deferencia que le darías a un spec
de ocho meses de un comité de arquitectura. El valor de la spec es haber pensado
el problema antes de tocar código, no amarrarte a las decisiones que tomamos sin
haber tocado código todavía.

Entonces: **hoy**, arregla protobuf-es. **Esta semana**, Fase 1 del servidor.
**El viernes**, mírate la spec de nuevo y decide si el orden sigue haciendo
sentido. Si sí, continúa. Si no, re-planea. Eso es todo.

Vas bien. El hecho de que hayamos podido tener esta conversación de siete turnos
sin que la arquitectura se contradijera a sí misma significa que tienes el
modelo mental correcto. Ahora es ejecución, y la ejecución es aburrida a
propósito — aburrida es buena, aburrida significa predecible. xD
