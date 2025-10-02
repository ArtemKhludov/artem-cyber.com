# Google OAuth Setup Instructions

## Добавить в .env.local:

```
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/api/auth/oauth/google/callback
```

## Настроить в Google Cloud Console:

1. Перейти в [Google Cloud Console](https://console.cloud.google.com/)
2. Выбрать проект EnergyLogic
3. Перейти в "APIs & Services" > "Credentials"
4. Найти OAuth 2.0 Client ID
5. Добавить в "Authorized redirect URIs":
   - `http://localhost:3001/api/auth/oauth/google/callback`
   - `http://localhost:3000/api/auth/oauth/google/callback` (для порта 3000)

## Проверить настройки:

- Client ID: `476616872747-rqr0mm0b8ggc8sft3rca6bev8kh447rt.apps.googleusercontent.com`
- Client Secret: `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`
- Redirect URI: `http://localhost:3001/api/auth/oauth/google/callback`

## После настройки:

1. Перезапустить сервер разработки
2. Протестировать Google OAuth на странице регистрации
3. Протестировать Google OAuth в модальном окне
