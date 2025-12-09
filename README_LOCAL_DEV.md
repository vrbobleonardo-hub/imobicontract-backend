## Como rodar localmente

Backend:
```
cd backend
npm install
npm run dev
# servidor em http://localhost:4000
```

Frontend:
```
cd frontend
npm install
npm run dev
# app em http://localhost:5173
```

Variáveis necessárias (.env do backend):
- GOOGLE_API_KEY
- MP_ACCESS_TOKEN
- FRONTEND_BASE_URL=http://localhost:5173
- API_BASE_URL=http://localhost:4000
- DATABASE_URL="file:./dev.db"

Variáveis necessárias (.env do frontend):
- VITE_API_BASE_URL=http://localhost:4000
