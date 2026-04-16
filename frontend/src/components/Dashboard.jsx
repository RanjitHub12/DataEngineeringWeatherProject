/**
 * ========================================================================
 * Dashboard Component: Main React Component for Weather Visualization
 * ========================================================================
 * Purpose:
 *   - Fetch temperature trends data from FastAPI backend
 *   - Fetch weather summary data from FastAPI backend
 *   - Display data using Recharts (Line Chart for trends, Bar Chart for summary)
 *   - Responsive design with loading and error states
 *
 * Architecture:
 *   - State management: React hooks (useState, useEffect)
 *   - API calls: Axios (configured via environment variable)
 *   - Visualization: Recharts library
 *   - Styling: CSS-in-JS with styled-components
 *
 * API Endpoints Called:
 *   - GET /api/temperature-trends  → 7-day trend data
 *   - GET /api/weather-summary     → Aggregated statistics
 *
 * Frontend Environment:
 *   - VITE_API_BASE_URL: Base URL for backend API (from .env.local)
 *   - Default: http://localhost:8000
 *
 * Dependencies:
 *   - React 18+
 *   - Axios (HTTP client)
 *   - Recharts (charting library)
 *   - styled-components (CSS-in-JS)
 *
 * Data Flow:
 *   1. Component mounts (useEffect)
 *   2. Fetch trends data from backend
 *   3. Fetch summary data from backend
 *   4. Parse JSON and update state
 *   5. Recharts receives data and renders charts
 *   6. User sees visualizations
 *
 * ========================================================================
 */

import React, { useState, useEffect, useMemo } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import axios from 'axios'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const GlobalStyle = createGlobalStyle`
  :root {
    --ink: #1b2b46;
    --muted: #5e789e;
    --panel: rgba(255, 255, 255, 0.58);
    --panel-light: rgba(255, 255, 255, 0.42);
    --panel-strong: rgba(255, 255, 255, 0.85);
    --border: rgba(255, 255, 255, 0.6);
    --surface: rgba(255, 255, 255, 0.75);
    --surface-muted: rgba(255, 255, 255, 0.55);
    --surface-strong: rgba(255, 255, 255, 0.9);
    --surface-border: rgba(255, 255, 255, 0.75);
    --accent: #5a9cff;
    --accent-strong: #2d6be0;
    --accent-warm: #ffb36b;
    --warning: #f6b756;
    --success: #2fbf9f;
    --panel-glow: rgba(255, 255, 255, 0.55);
    --shadow: 0 30px 60px rgba(58, 97, 170, 0.22);
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    background:
      radial-gradient(circle at 20% 10%, rgba(118, 168, 255, 0.4), transparent 55%),
      radial-gradient(circle at 80% 0%, rgba(255, 211, 169, 0.45), transparent 55%),
      linear-gradient(160deg, #e6f0ff 0%, #d9e8ff 45%, #cfe2ff 100%);
    color: var(--ink);
  }

  body[data-theme='dark'] {
    color-scheme: dark;
    --ink: #f5f8ff;
    --muted: #c9d6ee;
    --panel: rgba(12, 20, 34, 0.95);
    --panel-light: rgba(18, 28, 44, 0.88);
    --panel-strong: rgba(22, 32, 50, 0.98);
    --border: rgba(120, 150, 190, 0.3);
    --surface: rgba(20, 30, 46, 0.95);
    --surface-muted: rgba(16, 26, 40, 0.78);
    --surface-strong: rgba(32, 44, 66, 0.98);
    --surface-border: rgba(120, 150, 200, 0.32);
    --panel-glow: rgba(90, 120, 170, 0.22);
    --shadow: 0 30px 60px rgba(6, 12, 24, 0.55);
    background:
      radial-gradient(circle at 20% 15%, rgba(46, 76, 128, 0.55), transparent 55%),
      radial-gradient(circle at 82% 0%, rgba(82, 60, 44, 0.4), transparent 58%),
      linear-gradient(160deg, #0b1220 0%, #0e1a2d 55%, #0a101d 100%);
  }

  body[data-theme='dark'] {
    color-scheme: dark;
    --ink: #e8f0ff;
    --muted: #b4c6e5;
    --panel: rgba(14, 22, 35, 0.92);
    --panel-light: rgba(18, 28, 44, 0.75);
    --panel-strong: rgba(22, 32, 50, 0.96);
    --border: rgba(130, 155, 190, 0.2);
    --surface: rgba(24, 34, 52, 0.85);
    --surface-muted: rgba(20, 30, 48, 0.65);
    --surface-strong: rgba(34, 46, 68, 0.95);
    --surface-border: rgba(140, 170, 210, 0.25);
    --panel-glow: rgba(90, 120, 170, 0.2);
    --shadow: 0 30px 60px rgba(6, 12, 24, 0.55);
    background:
      radial-gradient(circle at 20% 10%, rgba(52, 83, 140, 0.6), transparent 55%),
      radial-gradient(circle at 80% 0%, rgba(110, 71, 46, 0.45), transparent 55%),
      linear-gradient(160deg, #0f1726 0%, #101c2f 55%, #0d1626 100%);
  }

  ::selection {
    background: rgba(90, 156, 255, 0.25);
    color: #0f1a2f;
  }

  #root {
    min-height: 100vh;
  }

  @keyframes floatIn {
    0% {
      transform: translateY(8px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const DashboardShell = styled.div`
  min-height: 100vh;
  padding: 20px;
  display: grid;
  place-items: start center;
`
const MainPanel = styled.section`
  max-width: 1180px;
  width: min(1180px, 100%);
  margin: 0 auto;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 34px;
  padding: 20px 24px 72px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
  position: relative;
  overflow: hidden;
  height: calc(100vh - 40px);
  max-height: calc(100vh - 40px);
  overflow: auto;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 12px;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 20% 20%, var(--panel-glow), transparent 55%);
    opacity: 0.6;
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 2px;
`

const Brand = styled.div`
  display: grid;
  gap: 4px;
`

const BrandTitle = styled.div`
  font-weight: 700;
  letter-spacing: 0.02em;
`

const BrandSubtitle = styled.div`
  color: var(--muted);
  font-size: 0.85rem;
`

const TopNav = styled.div`
  display: inline-flex;
  gap: 8px;
  background: var(--surface-muted);
  border: 1px solid var(--surface-border);
  padding: 6px;
  border-radius: 999px;
  flex-wrap: wrap;
`

const NavButton = styled.button`
  border: none;
  background: ${(props) => (props.$active ? 'var(--surface-strong)' : 'transparent')};
  color: var(--ink);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: ${(props) => (props.$active ? '0 8px 16px rgba(74, 120, 200, 0.2)' : 'none')};

  &:hover {
    background: var(--surface-strong);
  }
`

const TopMeta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 0.85rem;
  flex-wrap: wrap;
`

const CityFilter = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--muted);
`

const CitySelect = styled.select`
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  padding: 6px 12px;
  background: var(--surface-strong);
  font-family: inherit;
  color: var(--ink);
  font-size: 0.85rem;
`

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 14px 16px;
  align-items: start;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`

const HeroCopy = styled.div`
  display: grid;
  gap: 10px;
`

const HeroRight = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 12px 16px;
  align-items: start;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`

const SlideViewport = styled.div`
  position: relative;
  min-height: 0;
  height: auto;
`

const Slide = styled.div`
  display: ${(props) => (props.$active ? 'grid' : 'none')};
  gap: 12px;
  animation: floatIn 0.35s ease;
`

const PanelSection = styled.div`
  display: grid;
  gap: 12px;
`

const Subtitle = styled.p`
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 520px;
  margin: 0;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`

const PrimaryButton = styled.button`
  background: linear-gradient(120deg, var(--accent), var(--accent-strong));
  color: #ffffff;
  border: none;
  padding: 10px 18px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(74, 120, 200, 0.28);
  }

  &:focus-visible {
    outline: 2px solid rgba(94, 228, 255, 0.6);
    outline-offset: 2px;
  }
`

const ThemeToggle = styled.button`
  border: 1px solid var(--surface-border);
  background: var(--surface);
  color: var(--ink);
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(74, 120, 200, 0.18);
  }

  &:focus-visible {
    outline: 2px solid rgba(94, 228, 255, 0.6);
    outline-offset: 2px;
  }
`

const StatusPill = styled.span`
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  font-size: 0.8rem;
`

const ConditionTitle = styled.h1`
  font-family: 'Fraunces', 'Times New Roman', serif;
  font-size: clamp(2.1rem, 3.2vw, 3.1rem);
  margin: 0;
`

const ConditionSubtitle = styled.p`
  color: var(--muted);
  margin: 0;
  font-size: 0.95rem;
`

const HeroMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`

const KpiInline = styled.div`
  display: grid;
  gap: 8px;
  justify-items: stretch;
  align-self: start;
  justify-self: end;
  grid-column: 1 / -1;
  width: min(420px, 100%);
  margin-top: -6px;

  @media (max-width: 1000px) {
    justify-self: stretch;
    width: 100%;
    margin-top: 0;
  }
`

const KpiInlineTitle = styled.div`
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`

const WeatherArt = styled.img`
  width: min(200px, 50vw);
  height: auto;
  justify-self: center;
  align-self: start;
  margin-top: -8px;
  filter: drop-shadow(0 24px 24px rgba(78, 118, 196, 0.25));
`

const TemperatureBlock = styled.div`
  justify-self: end;
  text-align: right;
  display: grid;
  gap: 8px;
  align-self: start;
  margin-top: -6px;

  @media (max-width: 1000px) {
    justify-self: start;
    text-align: left;
  }
`

const TemperatureValue = styled.div`
  font-size: clamp(2.6rem, 5vw, 4.6rem);
  font-weight: 600;
  letter-spacing: -0.02em;
`

const TemperatureUnit = styled.span`
  font-size: 1.3rem;
  font-weight: 500;
  color: var(--muted);
  margin-left: 6px;
`

const TemperatureMeta = styled.div`
  display: grid;
  gap: 4px;
  color: var(--muted);
  font-size: 0.82rem;
`

const MiniStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const MiniStat = styled.div`
  background: var(--panel-light);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 14px 16px;
  min-height: 78px;
  display: grid;
  gap: 4px;
  align-items: center;
  justify-items: center;
  text-align: center;
`

const MiniStatLabel = styled.div`
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MiniStatValue = styled.div`
  font-weight: 600;
  font-size: 1.05rem;
  text-align: center;
`

const CityRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
`

const CityPill = styled.span`
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  font-size: 0.72rem;
`

const WaveCard = styled.div`
  margin-top: 6px;
  background: var(--panel-strong);
  border-radius: 20px;
  padding: 12px 14px 6px;
  border: 1px solid var(--surface-border);
`

const WaveTitle = styled.div`
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 6px;
`

const SectionHeader = styled.div`
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
`

const SectionTitle = styled.h2`
  font-size: 1.05rem;
  margin: 0;
  font-weight: 600;
`

const SectionLead = styled.p`
  color: var(--muted);
  margin: 0;
  font-size: 0.85rem;
`

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(130px, 1fr));
  gap: 10px;
  justify-items: end;

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
`

const KpiCard = styled.div`
  background: var(--panel-strong);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 12px 12px;
  min-height: 70px;
  position: relative;
  overflow: hidden;
  text-align: center;
  animation: floatIn 0.55s ease both;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(90, 156, 255, 0.12), transparent 55%);
    opacity: 0.8;
  }
`

const KpiBody = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
`

const KpiLabel = styled.div`
  color: var(--muted);
  font-size: 0.65rem;
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const KpiValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
`

const KpiUnit = styled.span`
  color: var(--muted);
  font-size: 0.8rem;
  margin-left: 6px;
`

const PipelineGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
`

const PipelineStrip = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 8px;
  align-items: center;
  padding: 12px 10px;
  border-radius: 16px;
  background: var(--surface-muted);
  border: 1px solid var(--surface-border);

  &::before {
    content: '';
    position: absolute;
    left: 18px;
    right: 18px;
    top: 18px;
    height: 2px;
    background: linear-gradient(90deg, rgba(90, 156, 255, 0.35), rgba(90, 156, 255, 0.05));
  }
`

const PipelineStep = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;
`

const PipelineDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 10px rgba(90, 156, 255, 0.35);
`

const PipelineStepLabel = styled.div`
  font-size: 0.75rem;
  color: var(--muted);
`

const PipelineCard = styled.div`
  background: var(--panel-light);
  border-radius: 14px;
  padding: 12px;
  border: 1px solid var(--surface-border);
  display: grid;
  gap: 6px;
`

const PipelineTitle = styled.div`
  font-weight: 600;
`

const PipelineText = styled.div`
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.35;
`

const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
`

const InsightCard = styled.div`
  background: var(--panel-strong);
  border-radius: 16px;
  padding: 14px;
  border: 1px solid var(--surface-border);
  display: grid;
  gap: 6px;
`

const InsightLabel = styled.div`
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

const InsightValue = styled.div`
  font-size: 1.05rem;
  font-weight: 600;
`

const InsightMeta = styled.div`
  color: var(--muted);
  font-size: 0.78rem;
`

const ChartCard = styled.div`
  background: var(--panel-strong);
  border-radius: 18px;
  padding: 16px;
  border: 1px solid var(--surface-border);
`

const ChartScroll = styled.div`
  overflow-x: auto;
  padding-bottom: 6px;
  -webkit-overflow-scrolling: touch;
`

const ChartCanvas = styled.div`
  min-width: 640px;

  @media (max-width: 720px) {
    min-width: 520px;
  }
`

const ChartTitle = styled.h2`
  font-size: 1.05rem;
  margin: 0 0 10px;
`

const InfoNote = styled.div`
  color: var(--muted);
  font-size: 0.85rem;
  margin-top: 12px;
`

const StatusContainer = styled.div`
  text-align: center;
  margin: 36px auto 0;
  max-width: 1180px;
`

const LoadingMessage = styled.div`
  color: var(--ink);
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 10px;

  &::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 12px rgba(90, 156, 255, 0.5);
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.4); opacity: 1; }
  }
`

const ErrorMessage = styled.div`
  background: rgba(255, 107, 107, 0.2);
  color: #a33636;
  padding: 20px;
  border-radius: 14px;
  margin: 20px auto;
  max-width: 600px;
  border: 1px solid rgba(255, 107, 107, 0.45);
`

const StatusBadge = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(47, 191, 159, 0.18);
  border: 1px solid rgba(47, 191, 159, 0.35);
  font-size: 0.8rem;
  color: var(--success);
`

const BottomStatusBar = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 12px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
  padding: 0 20px;
`

const BottomStatusInner = styled.div`
  width: min(1180px, 100%);
  display: flex;
  justify-content: flex-end;
`

const BottomStatusPill = styled.div`
  pointer-events: auto;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  color: var(--muted);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  box-shadow: var(--shadow);
`

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

const Dashboard = () => {
  // ========================================================================
  // STATE MANAGEMENT: Data and UI state
  // ========================================================================
  
  const [trendsData, setTrendsData] = useState([])
  const [summaryData, setSummaryData] = useState([])
  const [analysisData, setAnalysisData] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activePanel, setActivePanel] = useState('kpis')
  const [selectedCity, setSelectedCity] = useState('All cities')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    const storedTheme = window.localStorage.getItem('theme')
    if (storedTheme) {
      return storedTheme === 'dark'
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  
  // ========================================================================
  // API CONFIGURATION
  // ========================================================================
  // Get API base URL from environment variable or use default
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  
  console.log('🔧 Dashboard Configuration:')
  console.log(`   API Base URL: ${API_BASE_URL}`)
  console.log(`   Environment: ${import.meta.env.MODE}`)
  
  // ========================================================================
  // API CLIENT SETUP: Axios instance
  // ========================================================================
  // Configure axios with base URL and headers
  
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,  // 10 second timeout
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  // ========================================================================
  // FETCH DATA: useEffect hook
  // ========================================================================
  // Called on component mount to fetch data from backend
  
  useEffect(() => {
    fetchDashboardData()

    // Refresh dashboard data every 15 minutes
    const refreshIntervalId = setInterval(fetchDashboardData, 15 * 60 * 1000)

    return () => clearInterval(refreshIntervalId)
  }, [])  // Empty dependency array = run only on mount

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }
    const theme = isDarkMode ? 'dark' : 'light'
    document.body.dataset.theme = theme
    window.localStorage.setItem('theme', theme)
  }, [isDarkMode])
  
  // ========================================================================
  // FUNCTION: Fetch all dashboard data
  // ========================================================================
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📡 Fetching dashboard data...')
      
      // Fetch both endpoints in parallel using Promise.all
      const [trendsResponse, summaryResponse, anomalyResponse] = await Promise.all([
        apiClient.get('/api/temperature-trends'),
        apiClient.get('/api/weather-summary'),
        apiClient.get('/api/temperature-anomalies'),
      ])
      
      // Validate responses
      if (trendsResponse.data.status === 'success') {
        const rawTrends = trendsResponse.data.data
        const transformedTrends = transformTrendsData(rawTrends)
        setTrendsData(transformedTrends)
        setCities(extractCities(rawTrends))
        console.log(`✓ Loaded ${transformedTrends.length} trend records`)
      }
      
      if (summaryResponse.data.status === 'success') {
        setSummaryData(summaryResponse.data.data)
        console.log(`✓ Loaded ${summaryResponse.data.data.length} summary records`)
      }

      if (anomalyResponse.data.data) {
        const transformedAnomalies = transformAnomalyData(anomalyResponse.data.data)
        setAnalysisData(transformedAnomalies)
        console.log(`✓ Loaded ${transformedAnomalies.length} anomaly records`)
      }

      if (summaryResponse.data.timestamp) {
        setLastUpdated(new Date(summaryResponse.data.timestamp).toLocaleString())
      } else {
        setLastUpdated(new Date().toLocaleString())
      }
      setLoading(false)
      
    } catch (err) {
      console.error('❌ Error fetching data:', err)
      
      // Provide detailed error message
      if (err.code === 'ERR_NETWORK') {
        setError(
          `Network Error: Cannot connect to API at ${API_BASE_URL}. ` +
          'Ensure the backend is running.'
        )
      } else if (err.response) {
        setError(
          `Server Error: ${err.response.status} ${err.response.statusText}`
        )
      } else {
        setError(`Error: ${err.message}`)
      }
      
      setLoading(false)
    }
  }
  
  // ========================================================================
  // HELPER FUNCTION: Transform trends data for Recharts
  // ========================================================================
  // Recharts needs data in specific format: array of objects
  // Each object has date and metrics for all series (temperature lines)
  
  const transformTrendsData = (rawData) => {
    // Group data by date
    const groupedByDate = {}
    
    rawData.forEach(record => {
      const dateKey = record.date_value
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateKey,
        }
      }
      
      // Add metrics for each city
      groupedByDate[dateKey][`temp_avg_${record.city_name}`] = parseFloat(
        record.temperature_avg
      )
      groupedByDate[dateKey][`temp_roll_${record.city_name}`] = parseFloat(
        record.temperature_avg_7day
      )
      groupedByDate[dateKey][`temp_min_${record.city_name}`] = parseFloat(
        record.temperature_min
      )
      groupedByDate[dateKey][`temp_max_${record.city_name}`] = parseFloat(
        record.temperature_max
      )
    })
    
    // Convert to array and sort by date
    return Object.values(groupedByDate).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    )
  }

  const transformAnomalyData = (rawData) => {
    const groupedByDate = {}

    rawData.forEach((record) => {
      const dateKey = record.date_value

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateKey,
        }
      }

      groupedByDate[dateKey][`zscore_${record.city_name}`] = Number(
        record.temperature_zscore ?? 0
      )
    })

    return Object.values(groupedByDate).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    )
  }

  const extractCities = (rawData) => {
    return [...new Set(rawData.map((record) => record.city_name))].sort()
  }

  const filteredSummaryData = useMemo(() => {
    if (selectedCity === 'All cities') {
      return summaryData
    }
    return summaryData.filter((row) => row.city_name === selectedCity)
  }, [summaryData, selectedCity])

  const filteredCities = useMemo(() => {
    if (selectedCity === 'All cities') {
      return cities
    }
    return cities.filter((city) => city === selectedCity)
  }, [cities, selectedCity])

  const summaryStats = useMemo(() => {
    if (!filteredSummaryData.length) {
      return {
        totalRecords: '0',
        avgTemp: '0.0',
        maxWind: '0.0',
        cities: '0',
        anomalySignals: '0',
      }
    }

    const totalRecords = filteredSummaryData.reduce(
      (sum, row) => sum + (row.record_count || 0),
      0
    )
    const avgTemp = (
      filteredSummaryData.reduce((sum, row) => sum + (row.avg_temperature || 0), 0) /
      filteredSummaryData.length
    ).toFixed(1)
    const maxWind = Math.max(
      ...filteredSummaryData.map((row) => row.max_wind_speed || 0)
    ).toFixed(1)

    const anomalySignals = analysisData.reduce((sum, row) => {
      if (selectedCity === 'All cities') {
        const signals = Object.keys(row).filter((key) => {
          if (!key.startsWith('zscore_')) {
            return false
          }
          return Math.abs(row[key] || 0) >= 2
        })
        return sum + signals.length
      }

      const value = row[`zscore_${selectedCity}`]
      if (typeof value !== 'number') {
        return sum
      }
      return sum + (Math.abs(value) >= 2 ? 1 : 0)
    }, 0)

    return {
      totalRecords: totalRecords.toLocaleString(),
      avgTemp,
      maxWind,
      cities: filteredSummaryData.length.toString(),
      anomalySignals: anomalySignals.toLocaleString(),
    }
  }, [filteredSummaryData, analysisData, selectedCity])

  const summaryAggregate = useMemo(() => {
    if (!filteredSummaryData.length) {
      return {
        avgHumidity: 0,
        totalPrecip: 0,
        maxWind: 0,
        minTemp: 0,
        maxTemp: 0,
        recordCount: 0,
        avgPrecip: 0,
      }
    }

    const recordCount = filteredSummaryData.reduce(
      (sum, row) => sum + (row.record_count || 0),
      0
    )
    const avgHumidity =
      filteredSummaryData.reduce((sum, row) => sum + (row.avg_humidity || 0), 0) /
      filteredSummaryData.length
    const totalPrecip = filteredSummaryData.reduce(
      (sum, row) => sum + (row.total_precipitation || 0),
      0
    )
    const maxWind = Math.max(
      ...filteredSummaryData.map((row) => row.max_wind_speed || 0)
    )
    const minTemp = Math.min(
      ...filteredSummaryData.map((row) => row.min_temperature ?? 0)
    )
    const maxTemp = Math.max(
      ...filteredSummaryData.map((row) => row.max_temperature ?? 0)
    )
    const avgPrecip = recordCount > 0 ? totalPrecip / recordCount : 0

    return {
      avgHumidity,
      totalPrecip,
      maxWind,
      minTemp,
      maxTemp,
      recordCount,
      avgPrecip,
    }
  }, [filteredSummaryData])

  const pipelineInsights = [
    {
      label: 'Cadence',
      value: 'Daily 06:00 UTC',
      meta: 'Scheduled Airflow run',
    },
    {
      label: 'Window',
      value: 'Last 7 days',
      meta: 'Rolling archive window',
    },
    {
      label: 'Retries',
      value: '2 retries',
      meta: '5 min backoff',
    },
    {
      label: 'API timeout',
      value: '30s',
      meta: 'Open-Meteo request',
    },
  ]

  const trendOverview = useMemo(() => {
    if (!trendsData.length) {
      return []
    }

    return trendsData.map((row) => {
      if (selectedCity !== 'All cities') {
        const value = Number(row[`temp_avg_${selectedCity}`] || 0)
        return {
          date: row.date,
          avgTemp: Number(value.toFixed(2)),
        }
      }

      const avgValues = Object.keys(row)
        .filter((key) => key.startsWith('temp_avg_'))
        .map((key) => Number(row[key]))
        .filter((value) => Number.isFinite(value))
      const avgTemp = avgValues.length
        ? avgValues.reduce((sum, value) => sum + value, 0) / avgValues.length
        : 0
      return {
        date: row.date,
        avgTemp: Number(avgTemp.toFixed(2)),
      }
    })
  }, [trendsData, selectedCity])

  const linePalette = ['#5a9cff', '#ffb36b', '#7aa7ff', '#2fbf9f', '#7d89ff']
  const activeCities = selectedCity === 'All cities' ? cities : [selectedCity]
  const cityOptions = ['All cities', ...cities]
  const summaryChartData =
    selectedCity === 'All cities'
      ? summaryData
      : summaryData.filter((row) => row.city_name === selectedCity)
  const cityTimezones = {
    'New York': 'America/New_York',
    London: 'Europe/London',
    Tokyo: 'Asia/Tokyo',
    'New Delhi': 'Asia/Kolkata',
    Mumbai: 'Asia/Kolkata',
    Bengaluru: 'Asia/Kolkata',
    Chennai: 'Asia/Kolkata',
    Kolkata: 'Asia/Kolkata',
  }
  const isNightTime = (() => {
    const timeZone =
      selectedCity !== 'All cities'
        ? cityTimezones[selectedCity]
        : Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timeZone) {
      return false
    }
    try {
      const hour = Number(
        new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone,
        }).format(new Date())
      )
      return hour >= 19 || hour < 6
    } catch {
      return false
    }
  })()

  const kpiItems = [
    { label: 'Total records', value: summaryStats.totalRecords, unit: '' },
    { label: 'Cities tracked', value: summaryStats.cities, unit: '' },
    { label: 'Anomaly signals', value: summaryStats.anomalySignals, unit: '' },
  ]

  const pipelineItems = [
    {
      title: 'Ingestion',
      text: 'Open-Meteo API pull with daily snapshots.',
    },
    {
      title: 'Processing',
      text: 'Validation, normalization, and quality checks.',
    },
    {
      title: 'Storage',
      text: 'Star schema warehouse in PostgreSQL.',
    },
    {
      title: 'Analysis',
      text: 'Rolling averages and anomaly detection.',
    },
    {
      title: 'Orchestration',
      text: 'Airflow DAG scheduling and retries.',
    },
    {
      title: 'Dashboard',
      text: 'FastAPI + React insights layer.',
    },
  ]

  const lastUpdateLabel = lastUpdated ? lastUpdated : 'Just now'
  const isAllCities = selectedCity === 'All cities'
  const primaryCity = !isAllCities ? selectedCity : 'All cities'
  const averageTemp = Number(summaryStats.avgTemp || 0)
  const tempRangeLabel = filteredSummaryData.length
    ? `${summaryAggregate.minTemp.toFixed(1)}° / ${summaryAggregate.maxTemp.toFixed(1)}°`
    : '0.0° / 0.0°'
  const anomalyCount = Number(
    (summaryStats.anomalySignals || '0').toString().replace(/,/g, '')
  )
  const anomalyStatus = anomalyCount > 0 ? 'Watch' : 'Stable'
  const displayedCities = filteredCities.slice(0, 8)
  const extraCityCount = Math.max(filteredCities.length - displayedCities.length, 0)
  const condition = (() => {
    const classify = (row) => {
      const avgTemp = row.avg_temperature || 0
      const avgHumidity = row.avg_humidity || 0
      const maxWind = row.max_wind_speed || 0
      const precipPerDay = row.record_count
        ? (row.total_precipitation || 0) / row.record_count
        : 0

      if (precipPerDay > 12 || maxWind > 45) {
        return 'thunder'
      }
      if (precipPerDay > 6) {
        return 'heavy_rain'
      }
      if (precipPerDay > 2) {
        return 'rain'
      }
      if (avgTemp <= 2) {
        return 'snow'
      }
      if (avgTemp >= 34) {
        return 'hot'
      }
      if (avgTemp >= 28 && avgHumidity < 60) {
        return 'clear'
      }
      if (avgTemp <= 12) {
        return 'chilly'
      }
      return 'cloudy'
    }

    const mapping = {
      thunder: {
        title: 'Thunder',
        subtitle: 'high wind + heavy rain',
        icon: '/weather/thunder.svg',
      },
      heavy_rain: {
        title: 'Stormy',
        subtitle: 'heavy rainfall',
        icon: '/weather/rainy-6.svg',
      },
      rain: {
        title: 'Showers',
        subtitle: 'light rain',
        icon: '/weather/rainy-1.svg',
      },
      snow: {
        title: 'Snowy',
        subtitle: 'freezing temps',
        icon: '/weather/snowy-2.svg',
      },
      hot: {
        title: 'Hot',
        subtitle: 'heat across the city',
        dayIcon: '/weather/day.svg',
        nightIcon: '/weather/night.svg',
      },
      clear: {
        title: isNightTime ? 'Clear night' : 'Clear',
        subtitle: isNightTime ? 'calm night skies' : 'bright and dry',
        dayIcon: '/weather/day.svg',
        nightIcon: '/weather/night.svg',
      },
      chilly: {
        title: 'Chilly',
        subtitle: 'cool air mass',
        dayIcon: '/weather/cloudy.svg',
        nightIcon: '/weather/cloudy-night-1.svg',
      },
      cloudy: {
        title: 'Cloudy',
        subtitle: 'soft skies',
        dayIcon: '/weather/cloudy-day-1.svg',
        nightIcon: '/weather/cloudy-night-1.svg',
      },
    }

    const resolveIcon = (entry) => {
      if (entry.icon) {
        return entry.icon
      }
      if (isNightTime && entry.nightIcon) {
        return entry.nightIcon
      }
      return entry.dayIcon || entry.nightIcon
    }

    if (isAllCities && summaryData.length > 1) {
      const counts = summaryData.reduce(
        (acc, row) => {
          const key = classify(row)
          acc[key] = (acc[key] || 0) + 1
          return acc
        },
        Object.keys(mapping).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
      )
      const total = summaryData.length
      const dominant = Object.keys(counts).reduce((top, key) =>
        counts[key] > counts[top] ? key : top
      )
      if (counts[dominant] / total >= 0.5) {
        return { ...mapping[dominant], icon: resolveIcon(mapping[dominant]) }
      }
      return {
        title: 'Mixed',
        subtitle: 'conditions across locations',
        icon: isNightTime ? '/weather/cloudy-night-1.svg' : '/weather/cloudy-day-1.svg',
      }
    }

    if (filteredSummaryData.length) {
      const entry = mapping[classify(filteredSummaryData[0])]
      return { ...entry, icon: resolveIcon(entry) }
    }

    if (
      summaryAggregate.avgPrecip > 6 ||
      summaryAggregate.avgHumidity > 75 ||
      summaryAggregate.maxWind > 35
    ) {
      return { ...mapping.heavy_rain, icon: resolveIcon(mapping.heavy_rain) }
    }

    return { ...mapping.cloudy, icon: resolveIcon(mapping.cloudy) }
  })()
  
  // ========================================================================
  // RENDER: Loading State
  // ========================================================================
  
  if (loading) {
    return (
      <DashboardShell>
        <GlobalStyle />
        <StatusContainer>
          <LoadingMessage>Loading live weather intelligence...</LoadingMessage>
        </StatusContainer>
      </DashboardShell>
    )
  }
  
  // ========================================================================
  // RENDER: Error State
  // ========================================================================
  
  if (error) {
    return (
      <DashboardShell>
        <GlobalStyle />
        <StatusContainer>
          <ErrorMessage>
            <strong>Unable to reach the data pipeline</strong>
            <p>{error}</p>
            <PrimaryButton onClick={fetchDashboardData}>Retry</PrimaryButton>
          </ErrorMessage>
        </StatusContainer>
      </DashboardShell>
    )
  }
  
  // ========================================================================
  // RENDER: Dashboard with Charts
  // ========================================================================
  
  return (
    <DashboardShell>
      <GlobalStyle />
      <MainPanel>
        <TopBar>
          <Brand>
            <BrandTitle>WeatherFlow</BrandTitle>
            <BrandSubtitle>{primaryCity} live feed</BrandSubtitle>
          </Brand>
          <TopNav>
            <NavButton
              $active={activePanel === 'kpis'}
              onClick={() => setActivePanel('kpis')}
            >
              Operational KPIs
            </NavButton>
            <NavButton
              $active={activePanel === 'pipeline'}
              onClick={() => setActivePanel('pipeline')}
            >
              Pipeline layers
            </NavButton>
            <NavButton
              $active={activePanel === 'analytics'}
              onClick={() => setActivePanel('analytics')}
            >
              Analytics workspace
            </NavButton>
            <NavButton
              $active={activePanel === 'summary'}
              onClick={() => setActivePanel('summary')}
            >
              Weather summary
            </NavButton>
            <NavButton
              $active={activePanel === 'anomalies'}
              onClick={() => setActivePanel('anomalies')}
            >
              Anomaly signals
            </NavButton>
          </TopNav>
          <TopMeta>
            <CityFilter>
              City
              <CitySelect
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
              >
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </CitySelect>
            </CityFilter>
            <PrimaryButton onClick={fetchDashboardData}>Refresh</PrimaryButton>
            <ThemeToggle
              type="button"
              aria-pressed={isDarkMode}
              onClick={() => setIsDarkMode((prev) => !prev)}
            >
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </ThemeToggle>
          </TopMeta>
        </TopBar>

        <SlideViewport>
          <Slide $active={activePanel === 'kpis'}>
            <PanelSection>
              <HeroGrid>
                <HeroCopy>
                  <ConditionTitle>{condition.title}</ConditionTitle>
                  <ConditionSubtitle>{condition.subtitle}</ConditionSubtitle>
                  <Subtitle>
                    {isAllCities
                      ? 'Network data is flowing through ingestion, processing, and analytics layers with live refresh from FastAPI.'
                      : `${primaryCity} data is flowing through ingestion, processing, and analytics layers with live refresh from FastAPI.`}
                  </Subtitle>
                  <HeroMetaRow>
                    <StatusPill>Pipeline healthy</StatusPill>
                    <StatusBadge>{anomalyStatus}</StatusBadge>
                  </HeroMetaRow>
                  <MiniStatsGrid>
                    <MiniStat>
                      <MiniStatLabel>Humidity</MiniStatLabel>
                      <MiniStatValue>{summaryAggregate.avgHumidity.toFixed(1)}%</MiniStatValue>
                    </MiniStat>
                    <MiniStat>
                      <MiniStatLabel>Precipitation</MiniStatLabel>
                      <MiniStatValue>{summaryAggregate.totalPrecip.toFixed(0)} mm</MiniStatValue>
                    </MiniStat>
                    <MiniStat>
                      <MiniStatLabel>Wind peak</MiniStatLabel>
                      <MiniStatValue>{summaryAggregate.maxWind.toFixed(1)} km/h</MiniStatValue>
                    </MiniStat>
                    <MiniStat>
                      <MiniStatLabel>Temp range</MiniStatLabel>
                      <MiniStatValue>{tempRangeLabel}</MiniStatValue>
                    </MiniStat>
                  </MiniStatsGrid>
                  <CityRow>
                    {displayedCities.length > 0 ? (
                      displayedCities.map((city) => <CityPill key={city}>{city}</CityPill>)
                    ) : (
                      <CityPill>No cities available</CityPill>
                    )}
                    {extraCityCount > 0 && <CityPill>+{extraCityCount} more</CityPill>}
                  </CityRow>
                </HeroCopy>
                <HeroRight>
                  <WeatherArt src={condition.icon} alt={`${condition.title} icon`} />

                  <TemperatureBlock>
                    <TemperatureValue>
                      {summaryStats.avgTemp}
                      <TemperatureUnit>°C</TemperatureUnit>
                    </TemperatureValue>
                    <TemperatureMeta>
                      <div>Scope: {primaryCity}</div>
                      <div>Window: Last 7 days</div>
                    </TemperatureMeta>
                  </TemperatureBlock>

                  <KpiInline>
                    <KpiInlineTitle>Operational KPIs</KpiInlineTitle>
                    <KpiGrid>
                      {kpiItems.map((item, index) => (
                        <KpiCard
                          key={item.label}
                          style={{ animationDelay: `${index * 0.08}s` }}
                        >
                          <KpiBody>
                            <KpiLabel>{item.label}</KpiLabel>
                            <KpiValue>
                              {item.value}
                              {item.unit && <KpiUnit>{item.unit}</KpiUnit>}
                            </KpiValue>
                          </KpiBody>
                        </KpiCard>
                      ))}
                    </KpiGrid>
                  </KpiInline>
                </HeroRight>
              </HeroGrid>
              <WaveCard>
                <WaveTitle>Temperature pulse (avg across cities)</WaveTitle>
                {trendOverview.length > 0 ? (
                  <ResponsiveContainer width="100%" height={90}>
                    <AreaChart data={trendOverview} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7aa7ff" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#7aa7ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value) => `${Number(value).toFixed(1)}°C`}
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid rgba(90, 156, 255, 0.3)',
                          borderRadius: '10px',
                          color: '#1b2b46',
                          boxShadow: '0 10px 25px rgba(74, 120, 200, 0.18)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="avgTemp"
                        stroke="#5a9cff"
                        strokeWidth={2.5}
                        fill="url(#tempGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <InfoNote>No trend data available.</InfoNote>
                )}
              </WaveCard>
            </PanelSection>
          </Slide>

          <Slide $active={activePanel === 'pipeline'}>
            <PanelSection>
              <SectionHeader>
                <SectionTitle>Pipeline layers</SectionTitle>
                <SectionLead>
                  Every stage that moves the data from source to insight.
                </SectionLead>
              </SectionHeader>
              <PipelineStrip>
                {pipelineItems.map((item) => (
                  <PipelineStep key={`strip-${item.title}`}>
                    <PipelineDot />
                    <PipelineStepLabel>{item.title}</PipelineStepLabel>
                  </PipelineStep>
                ))}
              </PipelineStrip>
              <PipelineGrid>
                {pipelineItems.map((item) => (
                  <PipelineCard key={item.title}>
                    <PipelineTitle>{item.title}</PipelineTitle>
                    <PipelineText>{item.text}</PipelineText>
                  </PipelineCard>
                ))}
              </PipelineGrid>
              <SectionHeader>
                <SectionTitle>Pipeline insights</SectionTitle>
                <SectionLead>
                  Live rollups for coverage, precipitation, and wind signals.
                </SectionLead>
              </SectionHeader>
              <InsightGrid>
                {pipelineInsights.map((insight) => (
                  <InsightCard key={insight.label}>
                    <InsightLabel>{insight.label}</InsightLabel>
                    <InsightValue>{insight.value}</InsightValue>
                    <InsightMeta>{insight.meta}</InsightMeta>
                  </InsightCard>
                ))}
              </InsightGrid>
            </PanelSection>
          </Slide>

          <Slide $active={activePanel === 'analytics'}>
            <PanelSection>
              <SectionHeader>
                <SectionTitle>Analytics workspace</SectionTitle>
                <SectionLead>
                  Trendlines across the selected city or entire network.
                </SectionLead>
              </SectionHeader>
              <ChartCard>
                <ChartTitle>7-Day Temperature Trends</ChartTitle>
                {trendsData.length > 0 ? (
                  <>
                    <ChartScroll>
                      <ChartCanvas>
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={trendsData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(30, 60, 120, 0.15)"
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12, fill: '#5e789e' }}
                              angle={-25}
                              textAnchor="end"
                              height={55}
                            />
                            <YAxis tick={{ fill: '#5e789e' }} />
                            <Tooltip
                              formatter={(value) => Number(value).toFixed(1)}
                              contentStyle={{
                                background: '#ffffff',
                                border: '1px solid rgba(90, 156, 255, 0.3)',
                                borderRadius: '10px',
                                color: '#1b2b46',
                                boxShadow: '0 10px 25px rgba(74, 120, 200, 0.18)',
                              }}
                            />
                            {(activeCities.length <= 4) && (
                              <Legend wrapperStyle={{ paddingTop: '8px' }} />
                            )}
                            {activeCities.map((city, index) => (
                              <Line
                                key={`avg-${city}`}
                                type="monotone"
                                dataKey={`temp_avg_${city}`}
                                stroke={linePalette[index % linePalette.length]}
                                name={`${city} Avg`}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                              />
                            ))}
                            {activeCities.map((city, index) => (
                              <Line
                                key={`roll-${city}`}
                                type="monotone"
                                dataKey={`temp_roll_${city}`}
                                stroke={linePalette[index % linePalette.length]}
                                name={`${city} 7d Avg`}
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                                dot={false}
                                connectNulls
                                opacity={0.6}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartCanvas>
                    </ChartScroll>
                    <InfoNote>
                      Rolling 7-day averages are calculated in the SQL layer.
                    </InfoNote>
                  </>
                ) : (
                  <InfoNote>No trend data available.</InfoNote>
                )}
              </ChartCard>
            </PanelSection>
          </Slide>

          <Slide $active={activePanel === 'summary'}>
            <PanelSection>
              <SectionHeader>
                <SectionTitle>Weather summary by location</SectionTitle>
                <SectionLead>
                  Aggregated temperature distribution across cities.
                </SectionLead>
              </SectionHeader>
              <ChartCard>
                <ChartTitle>Weather Summary by Location</ChartTitle>
                {summaryChartData.length > 0 ? (
                  <>
                    <ChartScroll>
                      <ChartCanvas>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={summaryChartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(30, 60, 120, 0.15)"
                            />
                            <XAxis dataKey="city_name" tick={{ fill: '#5e789e' }} />
                            <YAxis tick={{ fill: '#5e789e' }} />
                            <Tooltip
                              formatter={(value) => Number(value).toFixed(1)}
                              contentStyle={{
                                background: '#ffffff',
                                border: '1px solid rgba(90, 156, 255, 0.3)',
                                borderRadius: '10px',
                                color: '#1b2b46',
                                boxShadow: '0 10px 25px rgba(74, 120, 200, 0.18)',
                              }}
                            />
                            {(summaryChartData.length <= 6) && (
                              <Legend wrapperStyle={{ paddingTop: '8px' }} />
                            )}
                            <Bar dataKey="min_temperature" fill="#7aa7ff" name="Min" />
                            <Bar dataKey="avg_temperature" fill="#5a9cff" name="Avg" />
                            <Bar dataKey="max_temperature" fill="#ffb36b" name="Max" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCanvas>
                    </ChartScroll>
                    <InfoNote>Aggregated across all historical observations.</InfoNote>
                  </>
                ) : (
                  <InfoNote>No summary data available.</InfoNote>
                )}
              </ChartCard>
            </PanelSection>
          </Slide>

          <Slide $active={activePanel === 'anomalies'}>
            <PanelSection>
              <SectionHeader>
                <SectionTitle>Temperature anomaly signals</SectionTitle>
                <SectionLead>
                  Z-score anomalies across the selected city scope.
                </SectionLead>
              </SectionHeader>
              <ChartCard>
                <ChartTitle>Temperature Anomaly Signals</ChartTitle>
                {analysisData.length > 0 ? (
                  <>
                    <ChartScroll>
                      <ChartCanvas>
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={analysisData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(30, 60, 120, 0.15)"
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12, fill: '#5e789e' }}
                              angle={-25}
                              textAnchor="end"
                              height={55}
                            />
                            <YAxis tick={{ fill: '#5e789e' }} />
                            <Tooltip
                              formatter={(value) => Number(value).toFixed(2)}
                              contentStyle={{
                                background: '#ffffff',
                                border: '1px solid rgba(90, 156, 255, 0.3)',
                                borderRadius: '10px',
                                color: '#1b2b46',
                                boxShadow: '0 10px 25px rgba(74, 120, 200, 0.18)',
                              }}
                            />
                            {(activeCities.length <= 4) && (
                              <Legend wrapperStyle={{ paddingTop: '8px' }} />
                            )}
                            <ReferenceLine y={0} stroke="#ffb36b" strokeDasharray="4 4" />
                            {activeCities.map((city, index) => (
                              <Line
                                key={`zscore-${city}`}
                                type="monotone"
                                dataKey={`zscore_${city}`}
                                stroke={linePalette[index % linePalette.length]}
                                name={`${city} Z-Score`}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartCanvas>
                    </ChartScroll>
                    <InfoNote>Values beyond |2| indicate unusual shifts.</InfoNote>
                  </>
                ) : (
                  <InfoNote>No anomaly data available.</InfoNote>
                )}
              </ChartCard>
            </PanelSection>
          </Slide>
        </SlideViewport>
      </MainPanel>
      <BottomStatusBar>
        <BottomStatusInner>
          <BottomStatusPill>Dashboard refreshed {lastUpdateLabel}.</BottomStatusPill>
        </BottomStatusInner>
      </BottomStatusBar>
    </DashboardShell>
  )
}

export default Dashboard
