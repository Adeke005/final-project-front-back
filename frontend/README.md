# Frontend (React + Redux)

## Stack
- React (Vite)
- Redux Toolkit
- React Router
- React Toastify

## Environment Variables
Copy `.env.example` to `.env`:

- `VITE_API_URL=http://127.0.0.1:8000`

## Run
```bash
npm install
npm run dev
```

## Build / Lint
```bash
npm run lint
npm run build
```

## Implemented Features
- JWT auth flow with refresh handling
- Protected routes
- Role-based workspace layout
- Light/Dark theme toggle with localStorage persistence and no-flicker boot
- Global search + filtering + sorting + URL query sync on dashboard
- Course progress bars with continue-learning section
- Course rating with optimistic updates
- Personal account page (profile, password, sessions)
- Toast notifications, modals, skeleton loaders, and error boundary
