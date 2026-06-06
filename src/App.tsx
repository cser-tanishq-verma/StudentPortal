import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'

interface Session {
  user?: {
    id: string
    email?: string
  }
}

interface Profile {
  id: string
  first_name?: string
  last_name?: string
  student_id?: string
  department?: string
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="app-container" style={{justifyContent: 'center', alignItems: 'center'}}>Loading...</div>
  }

  return (
    <div className="app-container">
      <header>
        <h1>StudentPortal</h1>
        {session && (
          <button className="btn btn-danger" style={{width: 'auto', padding: '0.5rem 1rem'}} onClick={() => supabase.auth.signOut()}>
            Sign Out
          </button>
        )}
      </header>
      
      {!session ? <Auth /> : <Dashboard user={session.user} />}
    </div>
  )
}

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [department, setDepartment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              student_id: studentId,
              department: department
            }
          }
        })
        if (error) throw error
        // Auto sign-in if confirm email is disabled
      }
    } catch (err: Error | unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="subtitle">{isLogin ? 'Enter your details to access the portal' : 'Register for a new student account'}</p>
        
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label>First Name</label>
                <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Student ID</label>
                <input type="text" required value={studentId} onChange={e => setStudentId(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input type="text" required value={department} onChange={e => setDepartment(e.target.value)} />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ user }: { user: { id: string; email?: string } }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMyProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setMyProfile(data)
  }, [user.id])

  const fetchProfiles = useCallback(async (query = '') => {
    setLoading(true)
    let q = supabase.from('profiles').select('*').limit(50)
    
    if (query) {
      q = q.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_id.ilike.%${query}%`)
    }
    
    const { data } = await q
    if (data) setProfiles(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMyProfile()
    fetchProfiles()
  }, [fetchMyProfile, fetchProfiles])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProfiles(searchQuery)
  }

  return (
    <div className="dashboard">
      <div style={{marginBottom: '2rem'}}>
        <h2>Welcome, {myProfile?.first_name || user.email}</h2>
        <p style={{color: 'var(--text-muted)'}}>
          Student ID: <span className="badge">{myProfile?.student_id || 'N/A'}</span>
        </p>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input 
          type="text" 
          placeholder="Search students by name or ID..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button type="submit" className="btn" style={{width: 'auto', padding: '0 2rem'}}>
          Search
        </button>
      </form>

      {loading ? (
        <p>Loading profiles...</p>
      ) : (
        <div className="profile-grid">
          {profiles.map(profile => (
            <div key={profile.id} className="profile-card">
              <div className="profile-avatar">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
              <h3>{profile.first_name} {profile.last_name}</h3>
              <p>ID: {profile.student_id}</p>
              {profile.department && <span className="badge">{profile.department}</span>}
            </div>
          ))}
          
          {profiles.length === 0 && (
            <p style={{gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem'}}>
              No students found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
