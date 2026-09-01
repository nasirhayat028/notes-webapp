import React, { useState, useEffect } from 'react'
import '../styles/NoteModal.css'

interface Note {
  _id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface NoteModalProps {
  note: Note | null
  onSave: (title: string, content: string) => void
  onClose: () => void
  readOnly?: boolean
  onEdit?: () => void
}

function NoteModal({ note, onSave, onClose, readOnly, onEdit }: NoteModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
    } else {
      setTitle('')
      setContent('')
    }
    setError('')
  }, [note])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (readOnly) {
      return
    }

    setError('')

    if (!title.trim()) {
      setError('Title cannot be empty')
      return
    }

    if (!content.trim()) {
      setError('Content cannot be empty')
      return
    }

    onSave(title.trim(), content.trim())
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{readOnly ? 'View Note' : note ? 'Edit Note' : 'Create Note'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title"
              readOnly={readOnly}
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter note content"
              rows={10}
              readOnly={readOnly}
            />
          </div>

          {!readOnly && error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            {readOnly ? (
              <>
                <button type="button" onClick={onClose} className="button-cancel">
                  Close
                </button>
                <button type="button" onClick={onEdit} className="button-save">
                  Edit
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onClose} className="button-cancel">
                  Cancel
                </button>
                <button type="submit" className="button-save">
                  Save
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default NoteModal
