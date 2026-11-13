import { MockDataBanner } from './common/units/MockDataBanner.tsx'
import DashboardPage from './features/dashboard/DashboardPage.tsx'
import { useSession } from './session/SessionContext.tsx'

function App() {
  const { settings } = useSession()
  return (
    <>
      {settings.source === 'mock' && <MockDataBanner />}
      <DashboardPage />
    </>
  )
}

export default App
