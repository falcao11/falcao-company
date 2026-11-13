# PADRÃO TÉCNICO: NestJS + Better Auth (@thallesp/nestjs-better-auth)

- **Data de consagração:** 2026-11-12
- **Âmbito:** Todos os projetos de software da Falcão Company que combinem NestJS e Better Auth.

---

## Regra Universal
NUNCA criar guards manuais, middleware caseiro ou decorators próprios de autenticação ao integrar Better Auth com NestJS. Utilizar SEMPRE a biblioteca padrão da comunidade: **`@thallesp/nestjs-better-auth`**.

---

## Estrutura Canónica Obrigatória

### 1. `main.ts`
```typescript
const app = await NestFactory.create(AppModule, {
  bodyParser: false, // Obrigatório para o Better Auth gerir o body parser
});
```

### 2. `app.module.ts`
```typescript
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./auth";

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
    }),
  ],
})
export class AppModule {}
```

### 3. Nos Controllers
- `@AllowAnonymous()`: Para endpoints públicos.
- `@RequireActiveOrg()`: Para endpoints com contexto multi-tenant de organização/farmácia.
- `@OrgRoles(['admin', 'member', 'owner'])`: Para autorização dentro da organização ativa.
- `@Roles(['admin'])`: Para Super Administrador global.
- `@Session() session: UserSession`: Para injeção da sessão tipada e segura.
