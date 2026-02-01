import React, { useState } from "react";

const AddTargetForm = ({ onAdd }) => {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) {
            setError("Name is required");
            return;
        }
        if (!onAdd) {
            setError("Add handler not provided");
            return;
        }
        setLoading(true);
        try {
            await onAdd({ name: name.trim(), url: url.trim() });
            setSuccess("Target added");
            setName("");
            setUrl("");
            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            setError(err?.response?.data?.detail || err.message || "Failed to add target");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Target Name"
                />
                <input
                    name="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                />
                <button type="submit" disabled={loading}>{loading ? "Adding..." : "Add"}</button>
            </form>
            {error && <div style={{ color: "red" }}>{error}</div>}
            {success && <div style={{ color: "green" }}>{success}</div>}
        </div>
    );
};

export default AddTargetForm;