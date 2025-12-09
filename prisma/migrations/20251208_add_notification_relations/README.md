# add_notification_relations

Run this after pulling the code to apply the new Notification model (relations + enums):

```
cd backend
npx prisma migrate dev --name add_notification_relations
```

This recreates the `Notification` table with richer fields (title/body/type/status + property/landlord/tenant relations). Legacy rows are not auto-migrated.
