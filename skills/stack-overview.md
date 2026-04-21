# GWA Template · Stack Overview

Una capa, un propósito. El flujo completo de datos, de la base hasta el pixel.

---

## 1. SurrealDB — La base como única fuente de verdad del dato en reposo

**Qué define:** una entidad de usuario (`User`) y una entidad de dominio (`Item`), unidas por tres aristas (`created`, `liked`, `commented`). Nada más. Con ese mínimo, la base ejercita sus siete capacidades distintivas:

| Capacidad | Dónde vive en el esquema |
|---|---|
| Schema-full con aserciones | Enums en `User.role`, `Item.status`; regex en `email`; rango en `Comment.rating` |
| Índices únicos | `User.email`, `Item.slug` |
| Grafo como ciudadano de primera clase | Las tres aristas, con traversals bidireccionales y collaborative filtering en dos saltos |
| Full-text search | Analizador BM25 sobre `Item.title` + `description`, expuesto vía `fn::search_items` |
| Geospatial | `Item.coordinates` como `geometry<point>` con índice MTREE, expuesto vía `fn::items_near` |
| Eventos (triggers atómicos) | `on_comment_created` recalcula `rating` y `comment_count`; `on_item_liked` registra actividad |
| Live queries | `LIVE SELECT FROM item WHERE id = $id` — el motor de subscriptions del GraphQL |

**Cómo está testeado:** la suite de Hurl contra la base (quince archivos) verifica una capacidad por test. `schema-email.hurl` prueba el regex. `unique-slug.hurl` prueba la restricción de unicidad. `graph-forward-reverse.hurl` prueba ambos sentidos de traversal. `fn-items-near.hurl` prueba el resultado geoespacial. `computed-item-stats.hurl` prueba que el evento efectivamente actualiza el conteo después de crear un comentario. Esta es la prueba más barata y más veloz del stack — habla directo con la base en SurrealQL, sin pasar por ningún otro servicio, 356 milisegundos para las quince pruebas.

---

## 2. El motor Rust — Convierte capacidades de base en un contrato de API

La base expone capacidades en su propio lenguaje (SurrealQL). El motor las traduce a un lenguaje que los clientes entienden (GraphQL para lectura/escritura, gRPC para operaciones internas). En el medio, arquitectura hexagonal: un crate `domain` con cero dependencias externas que define entidades con invariantes (newtypes validados), un crate `store` que implementa repositorios contra SurrealDB, un crate `application` que orquesta casos de uso, y un crate `gateway` que adapta todo a los protocolos de salida.

**Cómo está testeado:** tests unitarios de cargo sobre la lógica de dominio, tests de integración sobre los repositorios contra una base viva, y la suite de Vitest que habla con el gateway por HTTP/GraphQL verificando que el resultado llegó correcto hasta la capa de API.

---

## 3. El pipeline de derivación — Una definición, cuatro lenguajes consumiéndola

Este es el corazón del template y lo que evita que el stack se vuelva una colección de piezas sueltas. Cuatro categorías de información, cuatro fuentes autoritativas, consumo mecánico en todo lo demás.

**Protobuf como forma de cable.** `proto/template/v1/entities.proto` define `User`, `Item`, `Comment`, `Coordinates` una sola vez. De ahí salen structs de Rust (vía `tonic-prost`), structs de Go (vía `buf generate`), e interfaces de TypeScript (vía `protoc-gen-es`). Si agregas un campo al `.proto` y regeneras, los tres lenguajes ven el cambio; los que no lo acomoden fallan al compilar, no en producción.

**WASM como lógica compartida.** El crate `engine/services/wasm` contiene funciones puras que deben producir resultados idénticos en servidor y navegador: `validate_email`, `normalize_slug`, `validate_coordinates`, `compute_engagement_score`. Ese crate compila a dos destinos — binario nativo (consumido por el gateway como librería Rust normal) y WebAssembly (consumido por el navegador vía `wasm-pack`). Misma fuente, dos runtimes, cero drift.

**GraphQL schema como contrato del cliente.** `async-graphql` deriva el schema desde las anotaciones en los resolvers de Rust; un binario exporta el SDL a `gateway/schema.graphql`, que se commitea. Cualquier cambio al schema aparece como diff en el PR — revisable, no invisible.

**SurrealDB schema.** La excepción honesta: se mantiene a mano. Los tests de Hurl son el enforcement de que no se salga de sintonía con el resto del stack.

**Cómo se enforza:** una sola orden (`just sync-check`) regenera los tres artefactos derivables y hace diff contra lo commiteado. Cualquier desalineación rompe CI. El pipeline no es una convención, es una pared.

---

## 4. El sidecar Go — Concerns operacionales aislados

Notificaciones (vía Hermes) y generación de documentos (PDFs de reportes o tickets). Viven fuera del gateway porque tienen modos de falla distintos (el proveedor de email puede caerse sin afectar las queries) y porque Go tiene mejor ecosistema para estas tareas específicas. El gateway los llama por gRPC cuando una mutación lo requiere — por ejemplo, RSVPear a un evento dispara la generación del ticket y el envío del correo, ambos vía sidecar, mientras la mutación en la base completa atómicamente y la suscripción notifica a otros clientes en vivo.

---

## 5. El cliente — Consumidor mecánico, sin definiciones propias

El SDK del cliente es cinco paquetes con dependencias estrictamente jerárquicas. `pkgs` es la hoja y es puramente generado: recibe los tipos de TypeScript del protobuf, los tipos del GraphQL (vía `graphql-codegen` leyendo `schema.graphql`), y el módulo WASM compilado. Nada en `pkgs` se escribe a mano. `core` re-exporta con nombres cómodos y agrega schemas de Zod para validar respuestas del servidor en el límite de red. `api` envuelve los clientes de GraphQL (URQL para queries/mutations/subscriptions) y Connect-TS (para el sidecar), exponiendo funciones nombradas por operación. `state` contiene cuatro stores de runes de Svelte — `authStore` (hardcoded con marcadores `TODO(auth):` hasta integrar auth real), `itemStore`, `commentStore`, `uiStore` — que son contenedores reactivos tontos; nunca llaman red. `ui` contiene los componentes visuales compartidos, consume stores reactivamente.

La regla que hace que esto funcione: una sola dirección de datos. `api` llama red, valida contra Zod, escribe en stores. Los stores notifican a los componentes vía runes. Los componentes nunca llaman red, nunca llaman `api` directamente. Cuando el usuario hace clic en "like", el componente invoca una función de `api`, `api` ejecuta la mutation contra GraphQL, GraphQL dispara el evento atómico en SurrealDB, el evento actualiza el conteo de comentarios, la live query del GraphQL notifica al cliente original (y a cualquier otro suscrito), la subscription llega a `api`, `api` actualiza `commentStore`, Svelte re-renderiza. Un clic, todas las capas ejercitadas, ninguna línea de acoplamiento entre capas.

---

## 6. Las dos apps — Dos audiencias, dos formas, un SDK

**Vision** es el lab del administrador: desktop-first, rune-lab como base de layout, command palette, stores mirror, persistence inspector, showcase de componentes. Su propósito es exponer los internos del cliente para desarrollo y operación. La mayoría de forks la dejan como herramienta interna o la eliminan.

**Explorer** es el showroom del usuario final: mobile-first, cinco rutas exactas. `/` descubrimiento público (exercita lectura sin auth). `/auth` transición Guest→Consumer. `/items/:id` detalle con mutaciones autenticadas y live subscription (la pantalla crítica, toca todo el stack en un clic). `/items/new` y `/items/:id/edit` comparten formulario, guardadas por capacidad `produce`. `/me` dashboard que se adapta al perspective toggle del navbar cuando el usuario tiene ambas capacidades (`consume` y `produce`). Las tres perspectivas — Guest, Consumer, Producer — son estados acumulativos de capacidad, no apps separadas. El toggle de perspectiva es lo que materializa esa idea: el mismo usuario, las mismas URLs, distintos affordances según lo que puede hacer en este momento.

---

## 7. Cómo está testeado el stack completo

Cuatro anillos concéntricos, cada uno probando algo que los otros no:

**Anillo interno (Hurl contra la base).** Habla SurrealQL directo. Verifica las siete capacidades aisladas de cualquier lógica de aplicación. Es el único lugar donde se prueba que las aserciones, los índices y los eventos de la base efectivamente funcionan como se declaran.

**Tests de cargo en el workspace de Rust.** Prueban dominio y repositorios. El dominio se testea sin base (lógica pura, newtypes, invariantes). Los repositorios se testean contra una base viva para verificar que la traducción SurrealQL↔dominio es correcta.

**Tests de Go en el sidecar.** Prueban middleware, interceptors, handlers de gRPC. Cubren la capa operacional sin depender del gateway principal.

**Anillo externo (Vitest).** Habla por HTTP/GraphQL al gateway, por gRPC-web al sidecar, por WebSocket a las subscriptions. Verifica flujos completos extremo-a-extremo. Un pre-flight check confirma que los tres servicios están arriba antes de correr cualquier test — si alguno se cayó, los tests no fingen éxito, fallan honestamente.

**Fitness functions en CI.** `just sync-check` agrega cuatro verificaciones automáticas: que la regeneración de proto no produce diff contra lo commiteado, que el crate WASM compila a ambos targets, que el schema de GraphQL exportado coincide con el commiteado, y que las dependencias entre crates respetan la dirección hexagonal. No son tests de comportamiento, son tests de arquitectura — verifican que las reglas del template siguen siendo reglas y no aspiraciones.

Del lado del cliente, equivalentes: `client:lint-boundaries` verifica que `sdk/api` no importa de `sdk/ui`, que `sdk/core` no importa de `sdk/state`, etc. `client:codegen-check` verifica que los artefactos generados en `sdk/pkgs` están sincronizados con las fuentes del servidor. `client:no-hardcoded-data` verifica que ningún componente tiene arrays de demo hardcodeados.

---

## 8. El flujo completo en un clic

Para cerrar con un ejemplo concreto que muestra todo conectado — un usuario hace tap en el botón de "like" de un item en Explorer:

El componente invoca `likeItem(itemId)` de `sdk/api`. La función ejecuta una mutation GraphQL contra el gateway usando un documento generado por `graphql-codegen` (el tipo de entrada y salida son generados, no escritos a mano). El gateway de Rust recibe la mutation, el guard de autenticación valida el JWT, el resolver convierte el ID del proto-struct generado al newtype de dominio, el caso de uso llama al `ItemRepository`, el repositorio ejecuta `RELATE $user->liked->$item` contra SurrealDB. La arista se crea atómicamente. El evento `on_item_liked` dispara dentro de la misma transacción y escribe un registro al log de actividad. La live query que está observando este item detecta el cambio. La subscription del GraphQL empuja el evento al cliente original (y a cualquier otro cliente suscrito al mismo item desde otra pestaña). `sdk/api` recibe el evento por WebSocket, lo valida contra el schema de Zod de `sdk/core`, llama al setter de `itemStore.upsertItem`. Svelte detecta el cambio en el rune, re-renderiza el contador de likes sin refresh.

Un clic. Tres lenguajes (TypeScript → Rust → SurrealQL → Rust → TypeScript). Cuatro protocolos (WebSocket GraphQL, HTTP GraphQL, SurrealQL binario, WebSocket subscription). Cinco capas del SDK del cliente (`ui` → `api` → `core` → `state` → `ui` de nuevo). Cero duplicación de definiciones en todo el camino — porque el tipo `Item` fue definido una sola vez en el `.proto`, el schema SurrealDB fue definido una sola vez, el resolver GraphQL fue derivado por `async-graphql`, y el cliente lo consumió generado.

Esa es la prueba de que el template funciona: si puedes describir el flujo completo sin mencionar ningún lugar donde algo se escribió dos veces, el template cumplió su propósito. :D