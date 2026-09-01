import React from 'react'
import '../styles/NoteCard.css'

interface Note {
  _id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface NoteCardProps {
  note: Note
  onView: (note: Note) => void
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
}

function NoteCard({ note, onView, onEdit, onDelete }: NoteCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const preview = note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content

  return (
    <div className="note-card">
      <h3 className="note-title">{note.title}</h3>
      <p className="note-preview">{preview}</p>
      <p className="note-date">Updated: {formatDate(note.updatedAt)}</p>
      <div className="note-actions">
        <button onClick={() => onView(note)} className="button-open">
          Open
        </button>
        <button onClick={() => onEdit(note)} className="button-edit">
          Edit
        </button>
        <button onClick={() => onDelete(note._id)} className="button-delete">
          Delete
        </button>
      </div>
    </div>
  )
}

export default NoteCard
