# Chimera SDK Architecture

**Layered Monorepo with Clean Separation of Concerns**

## 🎯 Core Principles

1. **Unidirectional Dependencies**: Dependencies flow in one direction only
2. **Framework Agnostic Core**: Business logic independent of UI frameworks
3. **Dependency Inversion**: High-level modules don't depend on low-level
   modules
4. **Single Responsibility**: Each package has one clear purpose

---

## 📦 Package Overview

| Package            | Purpose                       | Dependencies                   | Framework-Specific |
| ------------------ | ----------------------------- | ------------------------------ | ------------------ |
| **core**           | Domain logic & business rules | None (only pure TS libs)       | ❌ No              |
| **infrastructure** | External system adapters      | core                           | ❌ No              |
| **state**          | Application state management  | core, infrastructure, devtools | ✅ Yes (Svelte)    |
| **ui**             | User interface components     | core, state                    | ✅ Yes (Svelte)    |
| **devtools**       | Code generation & patterns    | None                           | ❌ No              |

---

## 🔄 Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│                      (@chimera/ui)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Components  │  Features  │  Layouts  │  Primitives │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ depends on
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       State Layer                            │
│                     (@chimera/state)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   Stores   │   Config   │  Queries  │   Actions    │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────┬───────────────────────────────┬────────────────┘
             │ depends on                    │ depends on
             ▼                               ▼
┌────────────────────────────┐    ┌─────────────────────────┐
│       Core Layer           │◄───│  Infrastructure Layer   │
│     (@chimera/core)        │    │ (@chimera/infrastructure)│
│ ┌────────────────────────┐ │    │ ┌──────────────────────┐│
│ │ Domains │ Use Cases    │ │    │ │ Supabase │ API      ││
│ │ Shared  │ Interfaces   │ │    │ │ Cache    │ Storage  ││
│ └────────────────────────┘ │    │ └──────────────────────┘│
└────────────▲───────────────┘    └─────────────────────────┘
             │
             │ uses patterns from
             │
┌────────────┴───────────────┐
│      Devtools Layer        │
│    (@chimera/devtools)     │
│ ┌────────────────────────┐ │
│ │ Generators │ Patterns  │ │
│ │ CLI        │ Templates │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

---

## 📐 Layer Responsibilities

### 🎯 Core (`sdk/core/`)

**What it does**: Contains pure business logic and domain models

**Key Characteristics**:

- ✅ Framework-agnostic (no Svelte, no Supabase)
- ✅ Only pure TypeScript libraries allowed (e.g., Zod)
- ✅ Defines interfaces, not implementations
- ✅ Contains domain entities, value objects, and use cases

**Structure**:

```
core/
├── domains/          # Domain models (Property, Order, User, Money)
│   ├── property/
│   │   ├── Property.ts           # Entity
│   │   ├── PropertyService.ts    # Business logic
│   │   ├── PropertyRepository.ts # Interface (not implementation!)
│   │   └── types.ts
│   └── money/
│       ├── Money.ts              # Value object
│       └── Currency.ts
├── shared/           # Shared utilities
│   ├── Result.ts                 # Result<T, E> pattern
│   ├── Entity.ts                 # Base entity class
│   └── errors/
└── use-cases/        # Application logic
    └── property/
        └── CreateProperty.ts
```

**Dependency Rules**:

- ❌ CANNOT import from: infrastructure, state, ui
- ✅ CAN import from: zod, other pure TS libraries
- ✅ CAN import from: other core modules

**Example**:

```typescript
// ✅ GOOD - Interface only
export interface PropertyRepository {
  findById(id: string): Promise<Result<Property, Error>>;
}

// ✅ GOOD - No framework dependencies
export class PropertyService {
  constructor(private repo: PropertyRepository) {}
}

// ❌ BAD - Direct framework usage
import { supabase } from '@supabase/supabase-js';
export class PropertyService {
  async getProperty() {
    return supabase.from('properties')... // ❌ NO!
  }
}
```

---

### 🔌 Infrastructure (`sdk/infrastructure/`)

**What it does**: Implements core interfaces with real external systems

**Key Characteristics**:

- ✅ Implements repository interfaces from core
- ✅ Handles Supabase, API clients, caching, storage
- ✅ Contains generated code (types, API clients)
- ✅ No business logic (just data access)

**Structure**:

```
infrastructure/
├── supabase/
│   ├── SupabaseClient.ts
│   ├── repositories/
│   │   └── SupabasePropertyRepository.ts  # Implements PropertyRepository
│   └── schema/
│       └── generated/                      # Auto-generated types
├── api/
│   ├── client/
│   └── generated/                          # Orval generated
├── cache/
└── factories/
    └── createRepositories.ts               # DI container
```

**Dependency Rules**:

- ❌ CANNOT import from: state, ui
- ✅ CAN import from: core (interfaces only)
- ✅ CAN import from: @supabase/supabase-js, openapi-fetch, etc.

**Example**:

```typescript
// ✅ GOOD - Implements core interface
import type { PropertyRepository } from '@chimera/core';

export class SupabasePropertyRepository implements PropertyRepository {
  async findById(id: string) {
    const { data } = await this.supabase.from('properties')...
    return Ok(data);
  }
}
```

---

### 📊 State (`sdk/state/`)

**What it does**: Manages application state using Svelte runes/stores

**Key Characteristics**:

- ✅ Wraps core use-cases with reactive state
- ✅ Svelte-specific ($state, $derived, $effect)
- ✅ Handles app configuration (theme, language, currency)
- ✅ Provides hooks for UI components

**Structure**:

```
state/
├── stores/           # Business entity stores
│   ├── property.svelte.ts
│   └── auth.svelte.ts
├── config/           # App configuration stores
│   ├── theme.svelte.ts
│   └── currency.svelte.ts
├── queries/          # Query patterns (TanStack Query style)
└── actions/          # Command patterns
```

**Dependency Rules**:

- ❌ CANNOT import from: ui
- ✅ CAN import from: core, infrastructure, devtools
- ✅ MUST use Svelte runes ($state, $derived, $effect)

**Example**:

```typescript
// ✅ GOOD - Wraps core service with Svelte reactivity
import { PropertyService } from "@chimera/core";
import { repositories } from "@chimera/infrastructure";

class PropertyStore {
  current: Property | null = $state(null);
  loading = $state(false);

  constructor(private service: PropertyService) {}

  async load(id: string) {
    this.loading = true;
    const result = await this.service.getProperty(id);
    if (result.isOk) this.current = result.value;
    this.loading = false;
  }
}

export const propertyStore = new PropertyStore(
  new PropertyService(repositories.property),
);
```

---

### 🎨 UI (`sdk/ui/`)

**What it does**: Provides reusable UI components

**Key Characteristics**:

- ✅ Svelte components only
- ✅ Uses state from @chimera/state
- ✅ Organized by abstraction level (primitives → features)
- ✅ No business logic (that's in core/state)

**Structure**:

```
ui/
├── primitives/       # Basic building blocks (Button, Input)
├── components/       # Business components (PropertyCard, MoneyDisplay)
├── features/         # Feature-complete modules (checkout, auth)
└── layouts/          # Page layouts (Container, NavBar)
```

**Dependency Rules**:

- ❌ CANNOT import from: infrastructure (must go through state)
- ✅ CAN import from: core (types only), state
- ✅ MUST be Svelte components

**Example**:

```svelte
<!-- ✅ GOOD - Uses state, no direct core/infrastructure imports -->
<script lang="ts">
  import { propertyStore } from '@chimera/state';
  import type { Property } from '@chimera/core';
  
  const { current, loading } = $props();
</script>

{#if loading}
  <Loading />
{:else if current}
  <PropertyCard property={current} />
{/if}
```

---

### 🛠️ Devtools (`sdk/devtools/`)

**What it does**: Code generation, patterns, and developer tooling

**Key Characteristics**:

- ✅ No runtime dependencies from other packages
- ✅ Provides reusable patterns (createConfigStore, createRepository)
- ✅ Generates code for infrastructure
- ✅ CLI for developer workflows

**Structure**:

```
devtools/
├── generators/       # Code generation (Orval, Supabase types)
├── patterns/         # Reusable abstractions
├── cli/              # Command-line interface
├── scripts/          # Build/watch scripts
└── templates/        # Code templates
```

**Dependency Rules**:

- ❌ CANNOT import from: core, infrastructure, state, ui
- ✅ CAN import from: cliffy, orval, zod (dev dependencies)
- ✅ Outputs code for other packages

**Example**:

```typescript
// ✅ GOOD - Reusable pattern
export function createConfigStore<T>(options: ConfigOptions<T>) {
  // Pattern implementation
}

// Used by state package:
import { createConfigStore } from '@chimera/devtools';
export const themeStore = createConfigStore({ ... });
```

---

## 🚦 Dependency Rules (Enforcement)

### ✅ Allowed Dependencies

```typescript
// core → Nothing except pure TS libraries
import { z } from "zod"; // ✅ Pure library

// infrastructure → core only
import { PropertyRepository } from "@chimera/core"; // ✅ Interface from core

// state → core, infrastructure, devtools
import { PropertyService } from "@chimera/core"; // ✅
import { repositories } from "@chimera/infrastructure"; // ✅
import { createConfigStore } from "@chimera/devtools"; // ✅

// ui → core (types), state
import type { Property } from "@chimera/core"; // ✅ Types only
import { propertyStore } from "@chimera/state"; // ✅

// devtools → Nothing from other packages
// (standalone tooling)
```

### ❌ Forbidden Dependencies

```typescript
// ❌ core importing from infrastructure
import { SupabaseClient } from "@chimera/infrastructure"; // ❌ WRONG!

// ❌ core importing from state
import { propertyStore } from "@chimera/state"; // ❌ WRONG!

// ❌ infrastructure importing from state
import { authStore } from "@chimera/state"; // ❌ WRONG!

// ❌ ui importing from infrastructure
import { supabase } from "@chimera/infrastructure"; // ❌ WRONG!
// (Must go through state layer)

// ❌ devtools importing from other packages
import { Property } from "@chimera/core"; // ❌ WRONG!
```

---

## 🎓 Design Patterns by Layer

### Core Layer Patterns

- **Entity Pattern**: Base class for domain entities
- **Value Object Pattern**: Immutable objects (Money, Currency)
- **Repository Pattern**: Data access interfaces
- **Service Pattern**: Business logic orchestration
- **Result Pattern**: Type-safe error handling

### Infrastructure Layer Patterns

- **Adapter Pattern**: Wraps external systems
- **Factory Pattern**: Creates repositories/clients
- **Singleton Pattern**: Shared client instances

### State Layer Patterns

- **Store Pattern**: Reactive state management
- **Observer Pattern**: Automatic updates via Svelte runes
- **Command Pattern**: Action handlers

### UI Layer Patterns

- **Composition Pattern**: Building UIs from smaller components
- **Container/Presenter**: Smart vs dumb components

### Devtools Patterns

- **Factory Pattern**: Generic creators (createConfigStore)
- **Builder Pattern**: Fluent APIs
- **Template Pattern**: Code generation templates

---

## 🔄 Data Flow Example

**User clicks "Load Property" button**:

```
1. UI Component (ui/PropertyDetail.svelte)
   ↓ calls method on
2. State Store (state/property.svelte.ts)
   ↓ calls use-case from
3. Core Service (core/PropertyService.ts)
   ↓ calls interface method on
4. Core Repository Interface (core/PropertyRepository.ts)
   ↓ implemented by
5. Infrastructure Repository (infrastructure/SupabasePropertyRepository.ts)
   ↓ queries
6. Supabase Database
   ↓ returns data to
7. Infrastructure Repository (transforms to domain entity)
   ↓ returns to
8. Core Service (applies business logic)
   ↓ returns to
9. State Store (updates reactive state)
   ↓ triggers reactivity in
10. UI Component (re-renders with new data)
```

---

## 🧪 Testing Strategy by Layer

### Core Tests

- **Unit tests**: Pure logic, no mocks needed
- **Test entities, value objects, services**
- **Mock repository interfaces**

```typescript
// ✅ Easy to test - no external dependencies
const service = new PropertyService(mockRepository);
const result = await service.getProperty("123");
assert(result.isOk);
```

### Infrastructure Tests

- **Integration tests**: Real database/API connections
- **Test repository implementations**
- **Mock external services if needed**

### State Tests

- **Unit tests**: Mock core services
- **Test reactive state updates**

### UI Tests

- **Component tests**: Mock state stores
- **Test rendering and user interactions**

---

## 📚 Migration Guide

### Step 1: Move Domain Entities

```bash
# From old SDK
sdk/src/core/types/entities.ts
# To new core
sdk/core/src/domains/property/Property.ts
```

### Step 2: Extract Interfaces

```typescript
// Create interface in core
export interface PropertyRepository { ... }

// Implement in infrastructure
export class SupabasePropertyRepository implements PropertyRepository { ... }
```

### Step 3: Wrap with State

```typescript
// Create reactive store in state
export const propertyStore = new PropertyStore(
  new PropertyService(repositories.property),
);
```

### Step 4: Update UI Components

```svelte
<!-- Change from direct SDK usage -->
<script>
  import { sdk } from '@chimera/sdk';  // ❌ Old
</script>

<!-- To state-based usage -->
<script>
  import { propertyStore } from '@chimera/state';  // ✅ New
</script>
```

---

## 🎯 Quick Reference

### "Where does X go?"

| What                      | Where                                                 | Package        |
| ------------------------- | ----------------------------------------------------- | -------------- |
| Domain entity (Property)  | `domains/property/Property.ts`                        | core           |
| Business logic            | `domains/property/PropertyService.ts`                 | core           |
| Repository interface      | `domains/property/PropertyRepository.ts`              | core           |
| Repository implementation | `supabase/repositories/SupabasePropertyRepository.ts` | infrastructure |
| Supabase client           | `supabase/SupabaseClient.ts`                          | infrastructure |
| Generated types           | `supabase/schema/generated/`                          | infrastructure |
| Reactive store            | `stores/property.svelte.ts`                           | state          |
| App settings (theme)      | `config/theme.svelte.ts`                              | state          |
| UI component              | `components/property/PropertyCard.svelte`             | ui             |
| Reusable pattern          | `patterns/createConfigStore.ts`                       | devtools       |
| Type generator            | `generators/supabase/types-generator.ts`              | devtools       |

---

## 🚀 Benefits of This Architecture

### ✅ Testability

- Core logic tests without mocking infrastructure
- Easy to test each layer in isolation

### ✅ Flexibility

- Swap Supabase for Prisma without touching core
- Switch from Svelte to React by replacing state/ui

### ✅ Scalability

- Clear boundaries prevent coupling
- New features follow established patterns

### ✅ Maintainability

- Each package has single responsibility
- Easy onboarding (start with core, work outward)

### ✅ Type Safety

- Interfaces enforced at compile time
- Generated types stay in infrastructure

---

## ⚠️ Common Mistakes to Avoid

### ❌ Importing Infrastructure from Core

```typescript
// ❌ WRONG
import { supabase } from '@chimera/infrastructure';
export class PropertyService {
  async get() { return supabase... }
}
```

### ❌ Business Logic in Infrastructure

```typescript
// ❌ WRONG - Business logic in repository
export class SupabasePropertyRepository {
  async create(data: any) {
    if (data.price < 0) throw new Error("Invalid"); // ❌ This is business logic!
    return supabase.from("properties").insert(data);
  }
}

// ✅ CORRECT - Business logic in service (core)
export class PropertyService {
  async create(data: CreatePropertyDTO) {
    if (data.price < 0) {
      return Err(new ValidationError("Price must be positive"));
    }
    return this.repo.create(data);
  }
}
```

### ❌ Skipping the State Layer

```typescript
// ❌ WRONG - UI directly using infrastructure
import { repositories } from "@chimera/infrastructure";
// Must go through state!
```

---

## 📖 Further Reading

- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)

---

**Remember**: Dependencies flow ONE WAY:

```
ui → state → core ← infrastructure
                ▲
                │
            devtools (standalone)
```

**When in doubt**: Ask "Does this belong in business logic (core) or
implementation details (infrastructure)?"
