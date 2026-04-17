# React Frontend - Weather Forecast Dashboard

## Overview

This is the frontend application for the Weather Forecast Analytical DB dashboard. It provides an interactive, responsive UI for visualizing weather data using Recharts across tabbed panels:
- 7-Day Temperature Trends
- Weather Summary by Location
- Temperature Anomalies

## Architecture

### Technology Stack
- **React 18**: Component-based UI framework
- **Vite**: Ultra-fast build tool and dev server
- **Recharts**: Composable charting library
- **Axios**: Promise-based HTTP client
- **Styled Components**: CSS-in-JS styling

### Component Structure
```
src/
├── main.jsx              # React entry point
├── components/
│   └── Dashboard.jsx     # Main dashboard component
│       ├── State management (useState)
│       ├── Data fetching (useEffect)
│       ├── API client setup (axios)
│       ├── Trend and summary charts
│       └── Anomaly analysis panels
```

### Data Flow
```
FastAPI Backend
      ↓
   /api/temperature-trends
   /api/weather-summary
   /api/temperature-anomalies
      ↓
  Axios API Calls
      ↓
  React State (useState)
      ↓
  Recharts Components
      ↓
  Browser Visualization
```

## Local Development

### Prerequisites
- Node.js 16+ and npm/yarn
- Backend API running (http://localhost:8000)
- PostgreSQL with data loaded (via Airflow)

### Setup Steps

1. **Navigate to Frontend Directory**
   ```bash
   cd frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local if needed
   # Default: VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   The application will start at `http://localhost:5173`

5. **View Application**
   - Open browser: http://localhost:5173
   - Should see dashboard with tabbed panels and charts
   - If backend is running and has data, charts will display

### Development Commands

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint (if configured)
npm run lint
```

## Vite Configuration

Vite is configured in `vite.config.js` with:
- **Dev Server**: Port 5173, auto-reload enabled
- **API Proxy**: `/api/*` requests proxied to http://localhost:8000 (prevents CORS issues)
- **Build**: Optimized production bundle with code splitting
- **Environment Variables**: Prefix `VITE_` for client-side access

### Key Vite Features Used
- **Hot Module Replacement (HMR)**: Edit files → instant refresh without losing state
- **API Proxy**: Dev server proxies API calls, avoiding CORS issues during development
- **Environment Variables**: `import.meta.env.VITE_API_BASE_URL` accesses environment config
- **Code Splitting**: Vendor libraries (React, Recharts) split into separate bundles

## Production Deployment

### Option 1: Vercel (Recommended for React Apps)

**Why Vercel?**
- Optimized for React/Next.js
- Automatic deployments on GitHub push
- Free tier includes: 100GB bandwidth, custom domains
- Serverless functions (if needed)
- Environment variable management

**Steps:**

1. **Push Code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Vercel Account**
   - Sign up at https://vercel.com
   - Connect GitHub account

3. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Vercel auto-detects it's a Vite project

4. **Configure Environment**
   - In Vercel Dashboard: Settings → Environment Variables
   - Add: `VITE_API_BASE_URL=https://your-backend-url`
   - (Update to your production backend URL)

5. **Deploy**
   - Click "Deploy"
   - Vercel automatically runs `npm run build`
   - Your app is live at `https://[project].vercel.app`

**Redeploy on Code Changes**
- Push to main branch → Automatic deployment

### Option 2: Netlify

**Steps:**

1. **Build Project**
   ```bash
   npm run build
   ```

2. **Create Netlify Account**
   - Sign up at https://netlify.com

3. **Deploy via Drag & Drop**
   - Drag `dist/` folder to Netlify
   - OR connect GitHub for automatic deploys

4. **Configure Environment**
   - Settings → Environment
   - Add `VITE_API_BASE_URL=https://your-backend-url`

### Option 3: GitHub Pages

**Steps:**

1. **Update vite.config.js**
   ```javascript
   export default {
     base: '/weather-dashboard/',  // If repo is not organization
   }
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Deploy**
   - Publish the `dist/` folder to GitHub Pages (manual upload or a gh-pages workflow).
   - This repo does not include a deploy script by default.

### Option 4: Self-Hosted (VPS, Dedicated Server)

**Steps:**

1. **Build**
   ```bash
   npm run build
   ```

2. **Upload to Server**
   ```bash
   scp -r dist/* user@server:/var/www/weather-dashboard/
   ```

3. **Configure Web Server (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       root /var/www/weather-dashboard;
       index index.html;
       
       location / {
           try_files $uri /index.html;
       }
       
       location /api/ {
           proxy_pass http://backend:8000;
       }
   }
   ```

4. **Enable HTTPS**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

## Environment Configuration

### Development (.env.local)
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Production (Vercel Example)
```env
VITE_API_BASE_URL=https://weather-backend.onrender.com
```

### Important Notes
- **Frontend credentials**: Never put secrets (API keys, passwords) in frontend .env
- **VITE_ prefix**: Only variables prefixed with `VITE_` are exposed to the browser
- **Backend URL**: Must be HTTPS in production (browsers don't allow HTTP API calls from HTTPS pages)

## Troubleshooting

### "Cannot connect to API"
- Check backend is running: `curl http://localhost:8000/health`
- Verify `VITE_API_BASE_URL` is correct in `.env.local`
- Check browser console for CORS errors
- Ensure backend CORS allows frontend origin

### "Charts not showing"
- Open browser DevTools → Network tab
- Check `/api/temperature-trends` and `/api/weather-summary` calls
- Look for 200 OK response
- If no data, Airflow ETL may not have run yet

### "npm install fails"
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`
- Reinstall: `npm install`

### "Hot reload not working"
- Check Vite server running: `npm run dev`
- Verify browser at http://localhost:5173 (not different port)
- Check firewall not blocking port 5173

### Build fails with "out of memory"
- Increase Node memory: `NODE_OPTIONS=--max_old_space_size=4096 npm run build`

## Performance Optimization

### Implemented
- Code splitting (React, Recharts in separate bundles)
- Gzip compression (Vite default)
- Minification (esbuild)
- CSS tree-shaking

### For Production
- Enable sourcemaps in Sentry for error tracking
- Use CDN for static assets
- Enable HTTP/2 on web server
- Set cache headers: `Cache-Control: public, max-age=31536000, immutable`

## Browser Support

- Chrome 90+
- Firefox 87+
- Safari 14+
- Edge 90+
- Modern mobile browsers

## Contributing

When modifying the dashboard:
1. Keep components modular and reusable
2. Comment complex logic
3. Test API integration
4. Ensure responsive design (mobile-first)
5. Performance: profile bundle size with `npm run build -- --analyze`

## API Contract

### /api/temperature-trends
```json
{
  "status": "success",
  "data": [
    {
      "city_name": "New York",
      "date_value": "2024-01-15",
      "temperature_avg": 5.2,
      "temperature_min": 2.1,
      "temperature_max": 8.5,
         "humidity": 65.0,
         "temperature_avg_7day": 6.1
    }
  ],
  "count": 21,
  "date_range": "2024-01-09 to 2024-01-15"
}
```

### /api/temperature-anomalies
```json
{
   "status": "success",
   "data": [
      {
         "city_name": "New York",
         "date_value": "2024-01-15",
         "temperature_avg": 5.2,
         "temperature_avg_7day": 4.9,
         "temperature_zscore": 1.3,
         "precipitation_7day": 12.5
      }
   ],
   "count": 30,
   "date_range": "2024-01-09 to 2024-02-07"
}
```

### /api/weather-summary
```json
{
  "status": "success",
  "data": [
    {
      "city_name": "New York",
      "record_count": 365,
      "max_temperature": 28.5,
      "min_temperature": -5.2,
      "avg_temperature": 12.3,
      "avg_humidity": 62.5,
      "total_precipitation": 1250.0,
      "max_wind_speed": 45.0
    }
  ],
  "timestamp": "2024-01-15T10:30:00"
}
```

## Resources

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Recharts Documentation](https://recharts.org)
- [Axios Documentation](https://axios-http.com)
- [Vercel Deployment](https://vercel.com/docs)

## License

Academic Project - 2024
