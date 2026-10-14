import { Suspense } from 'react'
import { Routes } from 'react-router-dom'
import { SplashScreen } from './components/SplashScreen'
import { MaintenanceBanner } from './components/MaintenanceBanner'
import { appRoutes } from './routes'

export default function App() {
  return (
    <>
      <SplashScreen />
      <MaintenanceBanner />
      <Suspense fallback={null}>
        <Routes>{appRoutes()}</Routes>
      </Suspense>
    </>
  )
}
