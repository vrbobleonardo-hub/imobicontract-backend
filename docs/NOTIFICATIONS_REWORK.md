# Notificações – rework (08/12/2025)

## Arquivos alterados/criados
- Prisma: `prisma/schema.prisma`, `prisma/migrations/20251208_add_notification_relations/migration.sql`, `prisma/migrations/20251208_add_notification_relations/README.md`.
- Backend: `src/domain/types.ts`, `src/infra/repositories/notificationRepository.ts`, `src/api/routes/notifications.ts`, `src/domain/notifications/templates.ts`, `src/models.ts`.
- Frontend: `src/lib/api.ts`, `src/pages/Notifications.tsx`, `src/pages/Dashboard.tsx`, `src/components/layout/DashboardLayout.tsx`, `src/App.css`, `package.json`, `package-lock.json`.

## Migração Prisma (não executada aqui)
```bash
cd backend
npx prisma migrate dev --name add_notification_relations
```
Observação: o migration recria a tabela `Notification` com novos campos/relacionamentos; registros antigos não são migrados automaticamente.

## Subir os serviços
```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Como usar a nova tela de notificações
1. Acesse o app em `http://localhost:5173` e entre em “Notificações”.
2. Coluna esquerda: filtre por status/tipo/imóvel e selecione uma notificação existente.
3. Coluna central: escolha o tipo (templates preenchendo título/texto), selecione imóvel/locatário/locador, ajuste status e texto. Botão “Duplicar como nova” aparece ao editar.
4. Coluna direita: preview animado mostrando título, corpo formatado e canal recomendado do template.
5. Salve para criar/atualizar. A lista atualiza e o item fica selecionado.
6. Opcional: campo “Gerar rascunho com IA” preenche o corpo com sugestão a partir da descrição.

## API relevante
- GET `/api/notifications/templates` → catálogo de templates (tipo, rótulos, corpo padrão, canal recomendado).
- CRUD `/api/notifications` agora aceita `title`, `body`, `type`, `status`, `propertyId`, `tenantId`, `landlordId`; retorna registros já com `property`, `tenant`, `landlord`.
