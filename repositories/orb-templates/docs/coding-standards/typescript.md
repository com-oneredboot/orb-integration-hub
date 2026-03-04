# TypeScript Coding Standards

TypeScript conventions for orb projects, including naming, structure, and tooling configuration.

## Quick Reference

| Element | Convention | Example |
|---------|------------|---------|
| File | kebab-case | `user-service.ts` |
| Interface | PascalCase with I prefix | `IUserService` |
| Type | PascalCase | `UserResponse` |
| Class | PascalCase | `UserService` |
| Function | camelCase | `getUserById()` |
| Variable | camelCase | `userCount` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Enum | PascalCase | `UserStatus` |
| Enum member | PascalCase | `UserStatus.Active` |

## Naming Conventions

### Files and Directories

```typescript
// Good
user-service.ts
data-models.ts
api-client.ts
user-service.test.ts

// Directory structure
src/
├── services/
│   └── user-service.ts
├── models/
│   └── user.ts
└── utils/
    └── helpers.ts

// Bad
userService.ts      // camelCase
UserService.ts      // PascalCase
user_service.ts     // snake_case
```

### Interfaces and Types

```typescript
// Interfaces - PascalCase with I prefix for service interfaces
interface IUserService {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserInput): Promise<User>;
}

// Data interfaces - PascalCase without prefix
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Types - PascalCase
type UserResponse = {
  user: User;
  token: string;
};

type UserId = string;

// Generic types
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
```

### When to Use Interface vs Type

```typescript
// Use INTERFACE for:
// - Object shapes that may be extended
// - Service contracts
// - Props definitions

interface UserProps {
  name: string;
  email: string;
}

interface AdminProps extends UserProps {
  permissions: string[];
}

// Use TYPE for:
// - Union types
// - Mapped types
// - Utility types
// - Simple aliases

type Status = 'active' | 'inactive' | 'pending';
type Nullable<T> = T | null;
type UserKeys = keyof User;
```

### Classes

```typescript
// Good
class UserService implements IUserService {
  private readonly repository: IUserRepository;
  
  constructor(repository: IUserRepository) {
    this.repository = repository;
  }
  
  async getUser(id: string): Promise<User> {
    return this.repository.findById(id);
  }
}

// Bad
class userService {}     // Should be PascalCase
class User_Service {}    // No underscores
```

### Functions and Methods

```typescript
// Good
function getUserById(id: string): Promise<User> {}
function calculateTotalPrice(items: Item[]): number {}
function isValidEmail(email: string): boolean {}

// Arrow functions
const formatDate = (date: Date): string => {};
const handleClick = (event: MouseEvent): void => {};

// Bad
function GetUserById() {}    // PascalCase
function get_user_by_id() {} // snake_case
```

### Variables and Constants

```typescript
// Variables - camelCase
const userCount = 0;
let currentUser: User | null = null;
const isLoading = false;

// Constants - UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT_MS = 30000;

// Enum
enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}
```

## Project Structure

### Standard Layout

```
my-project/
├── src/
│   ├── index.ts              # Entry point, exports public API
│   ├── types/                # Type definitions
│   │   ├── index.ts
│   │   └── user.ts
│   ├── services/             # Business logic
│   │   ├── index.ts
│   │   └── user-service.ts
│   ├── models/               # Data models
│   │   ├── index.ts
│   │   └── user.ts
│   ├── utils/                # Utility functions
│   │   ├── index.ts
│   │   └── helpers.ts
│   └── constants/            # Constants
│       └── index.ts
├── tests/
│   ├── services/
│   │   └── user-service.test.ts
│   └── utils/
│       └── helpers.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Module Exports

```typescript
// src/types/index.ts - Barrel export
export type { User, UserResponse } from './user';
export type { Product, ProductResponse } from './product';

// src/index.ts - Public API
export { UserService } from './services/user-service';
export type { User, UserResponse } from './types';
```

## Tooling Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### ESLint Configuration (.eslintrc.json)

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "no-console": "warn"
  }
}
```

### Prettier Configuration (.prettierrc)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "typecheck": "tsc --noEmit"
  }
}
```

## Code Patterns

### Async/Await

```typescript
// Good - explicit return types
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  return response.json() as Promise<User>;
}

// Error handling
async function safeGetUser(id: string): Promise<Result<User>> {
  try {
    const user = await fetchUser(id);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Null Handling

```typescript
// Use nullish coalescing
const name = user.name ?? 'Anonymous';

// Use optional chaining
const city = user.address?.city;

// Type guards
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}
```

### Generics

```typescript
// Generic function
function first<T>(items: T[]): T | undefined {
  return items[0];
}

// Generic class
class Repository<T extends { id: string }> {
  private items: Map<string, T> = new Map();

  save(item: T): void {
    this.items.set(item.id, item);
  }

  findById(id: string): T | undefined {
    return this.items.get(id);
  }
}
```

## JSDoc Comments

```typescript
/**
 * Fetches a user by their unique identifier.
 *
 * @param id - The unique identifier of the user
 * @returns A promise that resolves to the user object
 * @throws {NotFoundError} When the user does not exist
 *
 * @example
 * ```typescript
 * const user = await getUserById('123');
 * console.log(user.email);
 * ```
 */
async function getUserById(id: string): Promise<User> {
  // implementation
}
```

## Anti-Patterns to Avoid

```typescript
// ❌ Using `any`
function process(data: any): any {
  return data;
}

// ✅ Use proper types or `unknown`
function process(data: unknown): ProcessedData {
  if (isValidData(data)) {
    return processData(data);
  }
  throw new Error('Invalid data');
}

// ❌ Non-null assertion abuse
const user = getUser()!;
const name = user!.name!;

// ✅ Proper null handling
const user = getUser();
if (!user) {
  throw new Error('User not found');
}
const name = user.name ?? 'Anonymous';

// ❌ Type assertions without validation
const user = response.data as User;

// ✅ Validate before asserting
if (isUser(response.data)) {
  const user = response.data;
}
```

## Angular-Specific Patterns

### Preventing NG0100 ExpressionChangedAfterItHasBeenCheckedError

When async operations in `ngOnInit` dispatch store actions or change bound values, Angular's dev-mode double-check can detect expression changes and throw NG0100.

**Problem**: Async operations (like `await store.select().pipe(take(1)).toPromise()`) resolve as microtasks between Angular's first and second change detection passes.

**Solution**: Inject `ChangeDetectorRef` and call `detectChanges()` after async initialization completes.

```typescript
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-my-component',
  template: `
    <div *ngIf="isLoading">Loading...</div>
  `
})
export class MyComponent implements OnInit {
  isLoading$ = this.store.select(selectIsLoading);
  
  constructor(
    private store: Store,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.initializeAsync();
  }
  
  private async initializeAsync(): Promise<void> {
    // Async operations that may dispatch store actions
    const user = await this.store.select(selectUser).pipe(take(1)).toPromise();
    
    if (user) {
      // This dispatch changes isLoading from false to true
      this.store.dispatch(loadUserData({ userId: user.id }));
    }
    
    // Trigger change detection to avoid NG0100
    this.cdr.detectChanges();
  }
}
```

**When to use**:
- Async initialization in `ngOnInit` that dispatches store actions
- Async operations that change component properties bound in the template
- Any time you see NG0100 errors in development mode

**Alternative approaches**:
- Wrap initialization in `setTimeout(() => {...}, 0)` to push to next event loop
- Use `queueMicrotask(() => {...})` for microtask queue
- Move initialization to `ngAfterViewInit` if appropriate

**Reference**: [Angular NG0100 Error Guide](https://angular.dev/errors/NG0100)
