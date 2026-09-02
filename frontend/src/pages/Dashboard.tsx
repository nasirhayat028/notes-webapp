import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import NoteCard from '../components/NoteCard'
import NoteModal from '../components/NoteModal'
import NotesActivity from '../components/NotesActivity'
import '../styles/Dashboard.css'

interface Note {
  _id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface DashboardProps {
  setIsAuthenticated: (value: boolean) => void
}

const BACKEND_URL = 'http://localhost:5000'

function Dashboard({ setIsAuthenticated }: DashboardProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [viewingNote, setViewingNote] = useState<Note | null>(null)
  const [userName, setUserName] = useState('')
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchUser()
    fetchNotes()
    fetchActivity()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchUser = async () => {
    try {
      const activeToken = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      setUserName(response.data.name)
    } catch (err) {
      console.error('Error fetching user:', err)
    }
  }

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const activeToken = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${activeToken}` },
        params: { search }
      })

      // 💡 Format validation check update:
      if (Array.isArray(response.data)) {
        setNotes(response.data)
      } else if (response.data && Array.isArray(response.data.notes)) {
        setNotes(response.data.notes)
      } else if (response.data && Array.isArray(response.data.data)) {
        setNotes(response.data.data)
      } else {
        setNotes([])
      }

      setError('')
    } catch (err) {
      console.error(err)
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }


  const fetchActivity = async () => {
    try {
      const activeToken = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      const notesArray = Array.isArray(response.data) ? response.data : response.data.notes || []
      setAllNotes(notesArray)
    } catch (err) {
      console.error('Error fetching activity data:', err)
    }
  }

  const handleLogout = async () => {
    try {
      const activeToken = localStorage.getItem('token')
      await axios.post(
        `${BACKEND_URL}/api/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${activeToken}` } }
      )
    } catch (err) {
      console.error('Error during logout:', err)
    } finally {
      localStorage.removeItem('token')
      setIsAuthenticated(false)
      navigate('/login')
    }
  }

  const handleCreateNote = () => {
    setEditingNote(null)
    setShowModal(true)
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setShowModal(true)
  }

  const handleViewNote = async (note: Note) => {
    try {
      setError('')
      const activeToken = localStorage.getItem('token')
      const response = await axios.get(`${BACKEND_URL}/api/notes/${note._id}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      setViewingNote(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open note')
    }
  }

  const handleEditFromView = () => {
    if (viewingNote) {
      setEditingNote(viewingNote)
      setViewingNote(null)
      setShowModal(true)
    }
  }

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return
    }
    try {
      const activeToken = localStorage.getItem('token')
      await axios.delete(`${BACKEND_URL}/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      setNotes(notes.filter((note) => note._id !== id))
      setAllNotes(allNotes.filter((note) => note._id !== id))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete note')
    }
  }

  // 💡 Parameters signature dynamically handled
  const handleSaveNote = async (title: string, content: string) => {
    try {
      const activeToken = localStorage.getItem('token')

      if (editingNote) {
        await axios.put(
          `${BACKEND_URL}/api/notes/${editingNote._id}`,
          { title, content },
          { headers: { Authorization: `Bearer ${activeToken}` } }
        )
      } else {
        await axios.post(
          `${BACKEND_URL}/api/notes`,
          { title, content },
          { headers: { Authorization: `Bearer ${activeToken}` } }
        )
      }

      setShowModal(false)
      setEditingNote(null)
      fetchNotes()
      fetchActivity()
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to save note')
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Simple Notes</div>

        <button onClick={handleCreateNote} className="new-note-button">
          + New Note
        </button>

        <nav className="sidebar-nav">
          <span className="nav-item nav-item-active">My Notes</span>
        </nav>

        <div className="sidebar-footer">
          {userName && <div className="user-name">{userName}</div>}
          <button onClick={handleLogout} className="logout-button">
            Log out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-topbar">
          <h2>My Notes</h2>
          <div className="search-box">
            <label htmlFor="search" className="visually-hidden">
              Search notes
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <NotesActivity notes={allNotes} />

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="no-notes">
            {search ? 'No notes found matching your search.' : 'No notes yet. Create your first note!'}
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                onView={handleViewNote}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <NoteModal
          note={editingNote}
          onSave={handleSaveNote}
          onClose={() => {
            setShowModal(false)
            setEditingNote(null)
          }}
        />
      )}

      {viewingNote && (
        <NoteModal
          note={viewingNote}
          readOnly
          onEdit={handleEditFromView}
          onSave={() => { }}
          onClose={() => setViewingNote(null)}
        />
      )}
    </div>
  )
}

export default Dashboard
