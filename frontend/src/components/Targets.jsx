import React, { useEffect, useState } from "react";
import api from "../api.js";
import AddTargetForm from "./AddTargetForm.jsx";

const TargetList = () => {
    const [targets, setTargets] = useState([]);
    const [deletingId, setDeletingId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editUrl, setEditUrl] = useState("");
    const [savingId, setSavingId] = useState(null);
    const [editError, setEditError] = useState(null);

    const fetchTargets = async () => {
        try {
            const response = await api.get('/api/v1/targets');
            setTargets(response.data);
        } catch (error) {
            console.error("Error fetching targets", error);
        }
    };

    const addTarget = async ({ name, url }) => {
        try {
            await api.post('/api/v1/targets', { name, url });
            await fetchTargets();
        } catch (error) {
            console.error("Error adding target", error);
            throw error; // rethrow so callers can show errors
        }
    };

    const deleteTarget = async (id) => {
        if (!id) return;
        if (!window.confirm("Are you sure you want to delete this target?")) return;
        try {
            setDeletingId(id);
            await api.delete(`/api/v1/targets/${id}`);
            // Optimistically update UI
            setTargets((prev) => prev.filter((t) => t.id !== id));
        } catch (error) {
            console.error("Error deleting target", error);
            // Optionally show an alert
            alert("Failed to delete target");
        } finally {
            setDeletingId(null);
        }
    };

    const saveEdit = async (id) => {
        if (!id) return;
        setEditError(null);
        if (!editName.trim() || !editUrl.trim()) {
            setEditError("Name and URL are required");
            return;
        }
        try {
            setSavingId(id);
            await api.patch(`/api/v1/targets/${id}`, { name: editName.trim(), url: editUrl.trim() });
            setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, name: editName.trim(), url: editUrl.trim() } : t)));
            setEditingId(null);
        } catch (error) {
            console.error("Error updating target", error);
            setEditError(error?.response?.data?.detail || error.message || "Failed to update target");
        } finally {
            setSavingId(null);
        }
    };

    useEffect(() => {
        fetchTargets();
    }, []);

    return (
        <div>
            <h2>Target List</h2>
            <AddTargetForm onAdd={addTarget} />
            <ul>
                {targets.map((target, index) => (
                    <li key={target.id ?? index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {editingId === target.id ? (
                            <>
                                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                                <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" />
                                <button onClick={() => saveEdit(target.id)} disabled={savingId === target.id}>{savingId === target.id ? 'Saving...' : 'Save'}</button>
                                <button onClick={() => { setEditingId(null); setEditError(null); }} disabled={savingId === target.id}>Cancel</button>
                                <button onClick={() => deleteTarget(target.id)} disabled={!target.id || deletingId === target.id}>{deletingId === target.id ? 'Deleting...' : 'Delete'}</button>
                            </>
                        ) : (
                            <>
                                <span style={{ flex: 1 }}>{target.name} - {target.url}</span>
                                <button onClick={() => { setEditingId(target.id); setEditName(target.name); setEditUrl(target.url); setEditError(null); }}>Edit</button>
                                <button onClick={() => deleteTarget(target.id)} disabled={!target.id || deletingId === target.id}>{deletingId === target.id ? 'Deleting...' : 'Delete'}</button>
                            </>
                        )}
                    </li>
                ))}
            </ul>
            {editError && <div style={{ color: 'red' }}>{editError}</div>}
        </div>
    );
};

export default TargetList