# Use a Modular File Structure:

Use the /app directory for routing (App Router) with Next.js 16 or version provided.
Keep business logic separate from UI components.
Organize your project with clear directories: /components, /hooks, /services, /lib, /styles.

# App Router Best Practices:

Use file-based routing for cleaner code organization.
Utilize Next.js server components for improved performance where possible.
Keep client components focused on state management and UI interactions.

# Data Access Layer (DAL) and Services:

Avoid mixing data fetching logic directly in components.

# Directory Structure for DAL:

Use a consistent folder structure for data access and actions within each page module, for example:

- app/
  - dashboard/
    - /data-access # Data Access Layer (DAL) for cadastro page
    - /actions # Server actions for cadastro page

# Component Placement Guidelines

## 1. Page-Level Components

- **Always check** if there is a `_components` directory at the page or route level where you are working.
  - Example:
    ```
    /app
      /dashboard
        /_components
        page.tsx
    ```
  - What to do:
    If the component is only used within this specific page or route (e.g., only in `/dashboard`), place it inside the `/dashboard/_components` folder.

## 2. Global or Shared Components

- If the component will be reused in multiple pages or modules, place it in the global `/src/components` directory.
  - Only add components to `/src/components` when you're sure they will be reused broadly.
  - If in doubt, always ask first before placing it globally.

## 3. Server vs. Client Component

- Default to Server Components (no `"use client"` directive) whenever possible.
  - Use Client Components (`"use client"`) **only when strictly necessary** (state, effects, event handlers, etc.).
  - If you're not sure, start as a Server Component and refactor to Client only if required.

## 4. Other Best Practices

- Prefer colocating components near where they're used (feature or route-level scope) unless you have a clear case for global reuse.
- Keep component directories organized and use descriptive names.
- Review import paths after moving or adding components to avoid breaking references.
- **Always** name the folder as `_components` (with a leading underscore) to distinguish it from pages/routes.

# Reusable and Isolated Components:

Keep components small and focused on a single responsibility.
Use props effectively and avoid excessive prop drilling by leveraging context or hooks where needed.

# Separation of Concerns:

Avoid placing API calls or business logic inside components.
Use hooks for state management and side effects (e.g., useSWR, React Query, custom hooks).

# UI and State Separation:

Keep UI components presentational (no logic other than rendering).
Use containers for data management and complex state logic.
Code Quality

# UI and Styling

Component Libraries

- Use Shadcn UI for consistent, accessible component design.
- Integrate Radix UI primitives for customizable, accessible UI elements.
- Apply composition patterns to create modular, reusable components.

# TypeScript First:

Use TypeScript to ensure type safety across the application.
Define strict types for props, state, and API responses.

# Clean Code Principles:

Follow SOLID principles where applicable.
Use meaningful variable names and avoid magic numbers.
Prefer functional components and hooks over class components.

# Avoid Anti-Patterns:

No large, monolithic components.
Avoid inline styles in favor of TailwindCSS or modular CSS.
Performance Optimization

# Code Splitting and Lazy Loading:

Use dynamic imports for large components to improve load times.
Optimize for faster Time to Interactive (TTI).

# Server Components

- Default to Server Components
- Use URL query parameters for data fetching and server state management
- Use 'use client' directive only when necessary:
- Event listeners
- Browser APIs
- State management
- Client-side-only libraries

# Specific Naming Patterns

- Prefix event handlers with 'handle': handleClick, handleSubmit
- Prefix boolean variables with verbs: isLoading, hasError, canSubmit
- Prefix custom hooks with 'use': useAuth, useForm
- Use complete words over abbreviations except for:
- err (error)
- req (request)
- res (response)
- props (properties)
- ref (reference)

# Form - Required form template.

- All forms must use inputs following ShadcnUI with React hook form and data validation with ZOD.
- Required reference: https://ui.shadcn.com/docs/forms/react-hook-form

# Testing Strategy:

Use Jest and React Testing Library for unit and integration tests.
Aim for high test coverage on critical components and services.

# Documentation:

Use JSDoc or TypeScript comments to describe component props and functions.
Keep README files updated for each module or library used.
Security and Best Practices

# Environment Variables:

Use .env files for secrets and configuration.
Never expose sensitive keys in the frontend.

# Input Validation and Sanitization:

Use Zod for schema validation to prevent bad data.
Sanitize all inputs to prevent XSS and SQL injection.

# Authentication and Authorization:

Use Supabase for manage autentication.
Implement CSRF protection and secure cookies.
Deployment and Scalability

# Optimized Build Process:

Use the latest Next.js features for optimized builds.
Leverage Vercel or a VPS with good caching strategies.

# Logging and Error Handling:

Use tools like Sentry for error tracking and performance monitoring.
Implement graceful error handling with fallback components.

# Scaling Strategies:

Plan for horizontal scaling with serverless or containerized deployments.
Optimize database queries with Prisma or Drizzle for efficient data access.
Continuous Improvement

# Code Reviews and PR Guidelines:

Set clear code review guidelines to catch issues early.
Use pull request templates to ensure consistency.

# Performance Audits:

Regularly run Lighthouse and Web Vitals checks.
Use performance monitoring tools to track improvements.

# Estrutura de Páginas - Padrão do Projeto

Este documento define a estrutura padrão para organização de páginas no projeto, seguindo as melhores práticas do Next.js App Router.

## 📁 Estrutura Base

```
/nome-da-pagina/
├── page.tsx                    # Server Component (ponto de entrada)
├── _components/                # Componentes específicos da página
│   └── content.tsx            # Client Component principal
├── _actions/                   # Server Actions
│   └── action-name.ts
└── _data-access/              # Data Access Layer
    └── get-data.ts
```

## 📋 Descrição das Camadas

### 1. `page.tsx` - Server Component

- **Sempre** deve ser um Server Component
- Responsável por:
  - Buscar dados iniciais usando funções do `_data-access`
  - Validar autenticação/autorização
  - Passar dados para os componentes client
  - Manter a lógica de servidor

**Exemplo:**

```typescript
// page.tsx
import { ContentComponent } from "./_components/content";
import { getData } from "./_data-access/get-data";

export default async function Page() {
  const data = await getData();

  return <ContentComponent data={data} />;
}
```

### 2. `_components/` - Componentes da Página

- Contém componentes específicos desta página
- O prefixo `_` indica que é uma pasta privada (não gera rotas)
- Componentes podem ser Client ou Server Components conforme necessidade

#### `content.tsx` - Componente Principal

- Geralmente é um **Client Component** (`"use client"`)
- Usado quando precisa de:
  - Interatividade (onClick, onChange, etc)
  - Hooks do React (useState, useEffect, etc)
  - Formulários com validação
  - Animações e transições

**Exemplo:**

```typescript
// _components/content.tsx
"use client";

import { useState } from "react";
import { updateAction } from "../_actions/update-action";

export function ContentComponent({ data }) {
  const [state, setState] = useState();

  // Lógica do componente...

  return (
    <div>
      {/* UI do componente */}
    </div>
  );
}
```

### 3. `_actions/` - Server Actions

- Contém as Server Actions específicas da página
- Sempre marcadas com `"use server"`
- Responsável por:
  - Validações com Zod
  - Operações no banco de dados
  - Autenticação/Autorização
  - Retornar resultados tipados

**Exemplo:**

```typescript
// _actions/update-action.ts
"use server";

import { db } from "@/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  field: z.string().min(3),
});

export type UpdateInput = z.infer<typeof schema>;
export type UpdateResult = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function updateAction(input: UpdateInput): Promise<UpdateResult> {
  try {
    const session = await requireAuth();

    const validation = schema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        errors: validation.error.flatten().fieldErrors,
      };
    }

    // Operação no banco...

    return {
      success: true,
      message: "Atualizado com sucesso!",
    };
  } catch (error) {
    return {
      success: false,
      message: "Erro ao processar",
    };
  }
}
```

### 4. `_data-access/` - Data Access Layer

- Contém funções para buscar dados
- Sempre executadas no servidor
- Encapsula lógica de acesso ao banco
- Reutilizável em diferentes páginas

**Exemplo:**

```typescript
// _data-access/get-data.ts
import { db } from "@/db";
import { requireAuth } from "@/lib/session";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

export async function getUserData() {
  const session = await requireAuth();

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    // ... outros campos
  };
}
```

## 🔄 Fluxo de Dados

```
1. Usuário acessa a página
   ↓
2. page.tsx (Server Component)
   - Busca dados via _data-access
   - Valida autenticação
   ↓
3. content.tsx (Client Component)
   - Recebe dados via props
   - Renderiza UI interativa
   - Usuário interage (preenche form, clica botão)
   ↓
4. _actions (Server Action)
   - Valida dados
   - Atualiza banco
   - Retorna resultado
   ↓
5. content.tsx
   - Recebe resultado
   - Atualiza UI (toast, form errors, etc)
```

## ✅ Boas Práticas

### Server Components (page.tsx)

- ✅ Buscar dados diretamente
- ✅ Acessar recursos do servidor
- ✅ Manter informações sensíveis no servidor
- ❌ Não usar hooks do React
- ❌ Não usar event handlers

### Client Components (\_components/content.tsx)

- ✅ Usar interatividade
- ✅ Usar hooks do React
- ✅ Manter estado local
- ❌ Não buscar dados diretamente
- ❌ Não acessar banco de dados

### Server Actions (\_actions/)

- ✅ Validar todos os inputs
- ✅ Verificar autenticação
- ✅ Retornar tipos consistentes
- ✅ Tratar erros adequadamente
- ❌ Não retornar dados sensíveis

### Data Access (\_data-access/)

- ✅ Encapsular queries complexas
- ✅ Reutilizar lógica comum
- ✅ Verificar permissões
- ✅ Retornar dados tipados
- ❌ Não expor dados sensíveis

## 📝 Exemplo Completo: `/account`

```
/account/
├── page.tsx
│   └── Server Component
│       └── Chama getUserData()
│       └── Renderiza <AccountContent />
│
├── _components/
│   └── content.tsx
│       └── Client Component
│       └── Formulários interativos
│       └── Chama updateAccount()
│
├── _actions/
│   └── update-account.ts
│       └── Server Action
│       └── Valida com Zod
│       └── Atualiza banco de dados
│
└── _data-access/
    └── get-user-data.ts
        └── Busca dados do usuário
        └── Verifica autenticação
```

## 🎯 Quando Criar Cada Pasta?

### `_components/`

- **Sempre** que a página precisar de UI
- Componentes específicos da página
- Pode ter múltiplos componentes

### `_actions/`

- Quando precisa **modificar dados** (criar, atualizar, deletar)
- Operações que precisam de validação
- Lógica de negócio complexa

### `_data-access/`

- Quando precisa **buscar dados** do banco
- Queries complexas ou reutilizáveis
- Lógica de acesso a dados compartilhada

## 📌 Notas Importantes

1. **Prefixo `_`**: Pastas com `_` não geram rotas no Next.js
2. **Separação de Responsabilidades**: Cada camada tem uma função específica
3. **Tipagem**: Sempre tipar inputs e outputs das funções
4. **Validação**: Usar Zod para validar dados no servidor
5. **Segurança**: Sempre verificar autenticação nas actions e data-access
