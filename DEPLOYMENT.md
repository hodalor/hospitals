# Deployment

## Frontend on Netlify

- Base directory: `frontend/healthnova`
- Build command: `npm run build`
- Publish directory: `build`
- Environment variable:
  - `REACT_APP_API_BASE_URL=https://your-render-service.onrender.com/api`

`netlify.toml` already includes the SPA redirect to `index.html`.

## Backend on Render

- Root directory: `frontend/backend`
- Build command: `npm install`
- Start command: `npm start`

Set these environment variables on Render:

- `PORT=10000`
- `MONGODB_URI=your-mongodb-uri`
- `CLIENT_URL=http://localhost:3000,https://your-netlify-site.netlify.app`
- `FRONTEND_BASE_URL=https://your-netlify-site.netlify.app`
- `PAYSTACK_SECRET_KEY=your-paystack-secret-key`
- `PAYSTACK_CURRENCY=GHS`

## Notes

- Backend CORS now accepts multiple frontend origins from `CLIENT_URL` as a comma-separated list.
- Paystack callback uses `FRONTEND_BASE_URL`, so this must match the live Netlify URL.
- If you change the Netlify site URL later, update both `REACT_APP_API_BASE_URL` on Netlify and `CLIENT_URL` / `FRONTEND_BASE_URL` on Render.
