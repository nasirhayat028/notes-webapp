import React from 'react'
import '../styles/NotesActivity.css'

interface Note {
  _id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface NotesActivityProps {
  notes: Note[]
}

interface DayActivity {
  key: string
  label: string
  count: number
  isToday: boolean
}

function getLast7DaysActivity(notes: Note[]): DayActivity[] {
  const days: DayActivity[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    days.push({
      key: date.toDateString(),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count: 0,
      isToday: i === 0,
    })
  }

  const byKey = new Map(days.map((day) => [day.key, day]))

  notes.forEach((note) => {
    const key = new Date(note.createdAt).toDateString()
    const day = byKey.get(key)
    if (day) {
      day.count += 1
    }
  })

  return days
}

function NotesActivity({ notes }: NotesActivityProps) {
  const days = getLast7DaysActivity(notes)
  const maxCount = Math.max(1, ...days.map((day) => day.count))

  return (
    <div className="activity-card">
      <div className="activity-header">
        <div>
          <p className="activity-label">Notes created</p>
          <p className="activity-value">{notes.length}</p>
        </div>
        <span className="activity-sublabel">Last 7 days</span>
      </div>

      <div className="activity-chart">
        {days.map((day) => (
          <div className="activity-bar-column" key={day.key}>
            <div className="activity-bar-track">
              <div
                className={`activity-bar${day.isToday ? ' activity-bar-today' : ''}`}
                style={{ height: `${Math.max((day.count / maxCount) * 100, 6)}%` }}
                tabIndex={0}
                title={`${day.label}: ${day.count} note${day.count === 1 ? '' : 's'}`}
                aria-label={`${day.label}: ${day.count} note${day.count === 1 ? '' : 's'}`}
              />
            </div>
            <span className="activity-bar-label">{day.label[0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotesActivity
