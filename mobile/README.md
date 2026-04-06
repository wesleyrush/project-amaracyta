# Mahamatrix Mobile

React Native (Expo) mobile app for the Jornada Akasha platform.

## Setup

```bash
cd Mobile
npm install
npm start
```

## Configuration

By default the app connects to `http://10.0.2.2:3002` (Android emulator → localhost:3002).

For a physical device, update `DEFAULT_BASE_URL` in `src/api/client.ts` to your machine's LAN IP:
```
const DEFAULT_BASE_URL = 'http://192.168.x.x:3002';
```

Or set at runtime via AsyncStorage key `BASE_URL`.

## Features

- Login / Register
- Chat with AI modules (streaming via SSE)
- Session management (rename, delete, switch)
- Coin balance display
- Coin store (buy chests)
- Checkout (PIX, Boleto, Cartão)
- Profile & password management
- Drawer navigation with session list
