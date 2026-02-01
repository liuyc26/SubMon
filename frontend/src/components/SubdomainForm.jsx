import React, { useEffect, useState } from 'react';
import api from '../api.js';

const SubdomainForm = ({ targetId, onCreated }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(null); setSuccess(null); }, 5000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const isValidUrl = (str) => {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const handleCreate = async () => {
    if (!targetId) return setError('Missing target id');
    if (!url.trim()) return setError('URL is required');
    if (!isValidUrl(url.trim())) return setError('Invalid URL (include http:// or https://)');
    setError(null);
    setCreating(true);
    try {
      const resp = await api.post(`/api/v1/targets/${targetId}/subdomains`, {
        url: url.trim(),
        title: title.trim() || "",
        status: status.trim() || "",
      });
      setSuccess('Subdomain created');
      setUrl('');
      setTitle('');
      setStatus('');
      if (onCreated) onCreated(resp.data);
    } catch (err) {
      console.error('Error creating subdomain', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}>
      <h4>Create subdomain</h4>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} />
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Status" value={status} onChange={(e) => setStatus(e.target.value)} />
        <button onClick={handleCreate} disabled={creating || !targetId}>{creating ? 'Creating...' : 'Create'}</button>
      </div>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
    </div>
  );
};

export default SubdomainForm;
