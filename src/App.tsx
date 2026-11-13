import { MockDataBanner } from './common/units/MockDataBanner.tsx'
import DashboardPage from './features/dashboard/DashboardPage.tsx'
import { marketDataConfig } from './marketData.ts'

function App() {
  return (
    <>
      {marketDataConfig.source === 'mock' && <MockDataBanner />}
      <DashboardPage />
    </>
  )
}

export default App
