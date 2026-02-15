import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import AddTargetForm from "./AddTargetForm.jsx";

const TargetList = () => {
  const [targets, setTargets] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [scanningId, setScanningId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [editError, setEditError] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scanMessage, setScanMessage] = useState(null);
  const [lockedScanTargets, setLockedScanTargets] = useState({});

  const navigate = useNavigate();

  const fetchTargets = async () => {
    try {
      const response = await api.get("/api/v1/targets");
      setTargets(response.data);
    } catch (error) {
      console.error("Error fetching targets", error);
    }
  };

  const addTarget = async ({ name, url }) => {
    try {
      await api.post("/api/v1/targets", { name, url });
      await fetchTargets();
    } catch (error) {
      console.error("Error adding target", error);
      throw error;
    }
  };

  const deleteTarget = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this target?")) return;
    try {
      setDeletingId(id);
      await api.delete(`/api/v1/targets/${id}`);
      setTargets((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting target", error);
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
      await api.patch(`/api/v1/targets/${id}`, {
        name: editName.trim(),
        url: editUrl.trim(),
      });
      setTargets((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, name: editName.trim(), url: editUrl.trim() } : t
        )
      );
      setEditingId(null);
    } catch (error) {
      console.error("Error updating target", error);
      setEditError(
        error?.response?.data?.detail || error.message || "Failed to update target"
      );
    } finally {
      setSavingId(null);
    }
  };

  const scanTarget = async (target) => {
    if (!target?.id) return;
    setScanError(null);
    setScanMessage(null);
    try {
      setScanningId(target.id);
      await api.post(`/api/v1/targets/${target.id}/scan`);
      setLockedScanTargets((prev) => ({ ...prev, [target.id]: true }));
      setScanMessage(`Scan queued for ${target.name}`);
    } catch (error) {
      console.error("Error queueing scan", error);
      setScanError(
        error?.response?.data?.detail || error.message || "Failed to queue scan"
      );
    } finally {
      setScanningId(null);
    }
  };

  const stats = useMemo(() => {
    const total = targets.length;
    const withUrl = targets.filter((t) => t.url).length;
    const withoutUrl = total - withUrl;
    return { total, withUrl, withoutUrl };
  }, [targets]);

  useEffect(() => {
    fetchTargets();
  }, []);

  return (
    <section className="dashboard-content">
      <div className="dashboard-card">
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total targets</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{stats.withUrl}</div>
            <div className="stat-label">With URL</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{stats.withoutUrl}</div>
            <div className="stat-label">Without URL</div>
          </div>
        </div>
      </div>

      <AddTargetForm onAdd={addTarget} />

      <div className="dashboard-card">
        <h2>Target List</h2>
        <p className="dashboard-subtle" style={{ margin: "6px 0 12px" }}>
          Click a target name to view and manage subdomains.
        </p>
        {targets.length === 0 ? (
          <p className="dashboard-subtle">No targets yet.</p>
        ) : (
          <ul className="list">
            {targets.map((target, index) => (
              <li key={target.id ?? index} className="list-item">
                {editingId === target.id ? (
                  <div className="form-row">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      style={{ flex: 1, minWidth: 140 }}
                    />
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="URL"
                      style={{ flex: 1, minWidth: 180 }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => saveEdit(target.id)}
                      disabled={savingId === target.id}
                    >
                      {savingId === target.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        setEditingId(null);
                        setEditError(null);
                      }}
                      disabled={savingId === target.id}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteTarget(target.id)}
                      disabled={!target.id || deletingId === target.id}
                    >
                      {deletingId === target.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ) : (
                  <div className="item-row">
                    <div>
                      <button
                        className="btn-link item-title"
                        onClick={() =>
                          navigate(`/${encodeURIComponent(target.name)}`, {
                            state: { id: target.id },
                          })
                        }
                        title="Open target details"
                      >
                        {target.name}
                      </button>
                      <div className="item-meta">{target.url || "No URL set"}</div>
                    </div>
                    <div className="item-actions">
                      <button
                        className="btn"
                        onClick={() => scanTarget(target)}
                        disabled={
                          !target.id ||
                          scanningId === target.id ||
                          Boolean(lockedScanTargets[target.id])
                        }
                      >
                        {scanningId === target.id
                          ? "Submitting..."
                          : lockedScanTargets[target.id]
                            ? "Scan Locked"
                            : "Scan"}
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingId(target.id);
                          setEditName(target.name);
                          setEditUrl(target.url);
                          setEditError(null);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteTarget(target.id)}
                        disabled={!target.id || deletingId === target.id}
                      >
                        {deletingId === target.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {editError && <div className="status-text status-error">{editError}</div>}
        {scanError && <div className="status-text status-error">{scanError}</div>}
        {scanMessage && (
          <div className="status-text status-success">{scanMessage}</div>
        )}
      </div>
    </section>
  );
};

export default TargetList;
