import React, { useState, useEffect } from "react";

const AddTargetForm = ({ onAdd }) => {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const isValidUrl = (str) => {
        if (!str) return true; // optional
        try {
            const u = new URL(str);
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
            return false;
        }
    };

    useEffect(() => {
        if (error || success) {
            const t = setTimeout(() => { setError(null); setSuccess(null); }, 5000);
            return () => clearTimeout(t);
        }
    }, [error, success]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) {
            setError("Name is required");
            return;
        }
        if (url && !isValidUrl(url.trim())) {
            setError('Invalid URL (include http:// or https://)');
            return;
        }
        if (!onAdd) {
            setError("Add handler not provided");
            return;
        }
        setLoading(true);
        try {
            await onAdd({ name: name.trim(), url: url.trim() || undefined });
            setSuccess("Target added");
            setName("");
            setUrl("");
        } catch (err) {
            setError(err?.response?.data?.detail || err.message || "Failed to add target");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-card">
            <h2>Create Target</h2>
            <p className="dashboard-subtle" style={{ margin: '6px 0 12px' }}>Add a new monitoring target with a name and root URL.</p>
            <form onSubmit={handleSubmit} className="form-row">
                <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Target Name"
                    style={{ flex: 1, minWidth: 180 }}
                />
                <input
                    name="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    style={{ flex: 1, minWidth: 200 }}
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Adding..." : "Add Target"}</button>
            </form>
            {error && <div className="status-text status-error">{error}</div>}
            {success && <div className="status-text status-success">{success}</div>}
        </div>
    );
};

export default AddTargetForm;
