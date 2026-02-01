import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../api.js';
import SubdomainForm from './SubdomainForm.jsx';

const TargetDetails = () => {
  const { targetName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [target, setTarget] = useState(null);
  const [subdomains, setSubdomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [savingEditId, setSavingEditId] = useState(null);
  const [editError, setEditError] = useState(null);

  // Delete error state
  const [deleteErrorId, setDeleteErrorId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Generic success message
  const [success, setSuccess] = useState(null);

  // Utility: validate URL
  const isValidUrl = (str) => {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    const fetchTarget = async () => {
      try {
        setLoading(true);
        setError(null);

        let id = location.state?.id;

        if (!id) {
          // Fallback: fetch targets and find by name
          const all = await api.get('/api/v1/targets');
          const decodedName = decodeURIComponent(targetName);
          const found = (all.data || []).find((t) => t.name === decodedName);
          if (!found) {
            setError('Target not found');
            setLoading(false);
            return;
          }
          id = found.id;
        }

        const resp = await api.get(`/api/v1/targets/${id}`);
        const data = resp.data;
        setTarget(data.target ?? data);
        setSubdomains(data.subdomains ?? []);
      } catch (err) {
        console.error('Error fetching target details', err);
        setError(err?.response?.data?.detail || err.message || 'Failed to load target');
      } finally {
        setLoading(false);
      }
    };

    fetchTarget();
  }, [targetName, location.state]);

  const targetId = target?.id || location.state?.id;

  const clearMessages = () => {
    setEditError(null);
    setDeleteError(null);
    setSuccess(null);
  };

  useEffect(() => {
    if (editError || deleteError || success) {
      const t = setTimeout(() => clearMessages(), 5000);
      return () => clearTimeout(t);
    }
  }, [editError, deleteError, success]);



  const startEdit = (s) => {
    setEditingId(s.id);
    setEditUrl(s.url || '');
    setEditTitle(s.title || '');
    setEditStatus(s.status || '');
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUrl('');
    setEditTitle('');
    setEditStatus('');
    setEditError(null);
  };

  const saveEdit = async (id) => {
    if (!targetId) return setEditError('Missing target id');
    if (editUrl && !isValidUrl(editUrl.trim())) return setEditError('Invalid URL (include http:// or https://)');
    setEditError(null);
    setSavingEditId(id);
    try {
      const resp = await api.patch(`/api/v1/targets/${targetId}/subdomains/${id}`, {
        url: editUrl.trim() || "",
        title: editTitle.trim() || "",
        status: editStatus.trim() || "",
      });
      setSubdomains((prev) => prev.map((s) => (s.id === id ? resp.data : s)));
      cancelEdit();
      setSuccess('Subdomain updated');
    } catch (err) {
      console.error('Error saving subdomain', err);
      setEditError(err?.response?.data?.detail || err.message || 'Failed to save');
    } finally {
      setSavingEditId(null);
    }
  };

  const deleteSubdomain = async (id) => {
    if (!targetId) return setDeleteError('Missing target id');
    if (!window.confirm('Are you sure you want to delete this subdomain?')) return;
    setDeleteErrorId(id);
    setDeleteError(null);
    try {
      await api.delete(`/api/v1/targets/${targetId}/subdomains/${id}`);
      setSubdomains((prev) => prev.filter((s) => s.id !== id));
      setSuccess('Subdomain deleted');
    } catch (err) {
      console.error('Error deleting subdomain', err);
      setDeleteError(err?.response?.data?.detail || err.message || 'Failed to delete');
    } finally {
      setDeleteErrorId(null);
    }
  };

  return (
    <div>
      <button onClick={() => navigate('/')}>🔙 Back</button>
      <h2>Target: {target?.name ?? decodeURIComponent(targetName)}</h2>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>
          <div>{error}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      ) : (
        <div>
          <h3>Subdomains ({subdomains.length})</h3>

          {success && <div style={{ color: 'green', marginBottom: 8 }}>{success}</div>}

          <SubdomainForm targetId={targetId} onCreated={(s) => { setSubdomains((prev) => [...prev, s]); }} />

          {subdomains.length === 0 ? (
            <div>No subdomains found.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {subdomains.map((s) => (
                <li key={s.id} style={{ padding: '8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {editingId === s.id ? (
                    <>
                      <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} style={{ flex: 1 }} />
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      <input value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
                      <button onClick={() => saveEdit(s.id)} disabled={savingEditId === s.id}>{savingEditId === s.id ? 'Saving...' : 'Save'}</button>
                      <button onClick={cancelEdit} disabled={savingEditId === s.id}>Cancel</button>
                      <button onClick={() => deleteSubdomain(s.id)} style={{ color: 'red' }} disabled={savingEditId === s.id}>{deleteErrorId === s.id ? 'Deleting...' : 'Delete'}</button>
                      {editError && <div style={{ color: 'red' }}>{editError}</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <div><strong>{s.url}</strong></div>
                        <div>{s.title} — {s.status}</div>
                        {deleteErrorId === s.id && deleteError && <div style={{ color: 'red' }}>{deleteError}</div>}
                      </div>
                      <button onClick={() => startEdit(s)}>Edit</button>
                      <button onClick={() => deleteSubdomain(s.id)} style={{ color: 'red' }} disabled={deleteErrorId === s.id}>Delete</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TargetDetails;
