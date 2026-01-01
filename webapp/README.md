# Golf Data Viz — Web App

React frontend for visualizing Trackman golf data.

## Development

```bash
npm install
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Environment Variables

Create a `.env` file:

```bash
VITE_EXTENSION_ID=your-chrome-extension-id
```

## Key Components

| Component | Description |
|-----------|-------------|
| `ShotChart` | Main view switcher (scorecard vs shot analysis) |
| `ScorecardView` | Round scorecard with momentum chart |
| `ShotAnalysisView` | Per-club shot data and visualizations |
| `SessionList` | Activity list sidebar with type icons |
| `ShotVisualizations` | SVG charts (dispersion, impact, launch, trajectory) |
| `AuthStatus` | Extension connection status indicator |

## API Integration

The app communicates with Trackman's API via `src/api/trackman.ts`. Auth tokens are captured by the companion Chrome extension and retrieved via `chrome.runtime.sendMessage`.

## Styling

- CSS variables defined in `index.css` (Pantone green/yellow theme)
- Component styles in `App.css`
- No CSS framework — vanilla CSS with custom properties
