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
        } catch (_) {
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
        <div style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}>
            <h4>Create target</h4>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Target Name"
                    style={{ flex: 1 }}
                />
                <input
                    name="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                />
                <button type="submit" disabled={loading}>{loading ? "Adding..." : "Add"}</button>
            </form>
            {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
            {success && <div style={{ color: "green", marginTop: 8 }}>{success}</div>}
        </div>
    );
};

export default AddTargetForm;