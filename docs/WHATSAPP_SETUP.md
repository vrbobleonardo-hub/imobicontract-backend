## Como configurar o WhatsApp Cloud API no ImobiContract

1. Acesse o **Painel de Apps da Meta** (developers.facebook.com) e crie/abra o app com produto WhatsApp.
2. Localize no painel do número do WhatsApp:
   - **Phone Number ID** (ID do número).
   - **Token de Acesso** (botão “Gerar token de acesso”).
   - **Base URL**: use `https://graph.facebook.com/v22.0`.
   - **Webhook Verify Token**: escolha um valor (ex.: `imobi_verify_123`) e use o mesmo no .env.
3. Copie `backend/.env.example` para `backend/.env` e preencha:
   - `WHATSAPP_API_BASE_URL` (ex.: `https://graph.facebook.com/v22.0`)
   - `WHATSAPP_PHONE_NUMBER_ID` (do painel)
   - `WHATSAPP_API_TOKEN` (token gerado)
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (o valor que você escolher)
   - `WHATSAPP_TEST_TO` (seu número em E.164, ex.: `5511999999999`)
4. Rode os servidores:
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```
5. Teste:
   - Abra o painel em `/app/mensagens`.
   - Preencha telefone (E.164) e mensagem, clique **Enviar**.
   - Ou use **Enviar mensagem de teste (WHATSAPP_TEST_TO)** para mandar a mensagem “Teste ImobiContract via WhatsApp Cloud API”.
   - Verifique a chegada no seu WhatsApp.

> Segurança: nunca compartilhe o token da Meta. Mantenha-o apenas no `.env` local/servidor.***
