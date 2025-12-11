import React from 'react'
import './App.css'
import AbsenceRecords from './components/AbsenceRecords'
import AlertRecords from './components/AlertRecords'
import ConsecutiveWorkDays from './components/ConsecutiveWorkDays'
import OvertimeRecords from './components/OvertimeRecords'
import ExceptionalHours from './components/ExceptionalHours'
import OrganizationSummary from './components/OrganizationSummary'
import DepartmentStatistics from './components/DepartmentStatistics'

function App() {
  return (
    <div className="app-container">
      <h1 className="app-title">Flink Access Records Analysis</h1>
      <div className="components-container">
        <OrganizationSummary />
        <DepartmentStatistics />
        <AbsenceRecords />
        <OvertimeRecords />
        <ExceptionalHours />
        <AlertRecords />
        <ConsecutiveWorkDays />
      </div>
    </div>
  )
}

export default App
