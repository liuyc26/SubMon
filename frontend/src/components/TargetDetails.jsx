import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../api.js";
import SubdomainForm from "./SubdomainForm.jsx";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const TargetDetails = () => {
  const { targetName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [target, setTarget] = useState(null);
  const [subdomains, setSubdomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingEditId, setSavingEditId] = useState(null);
  const [editError, setEditError] = useState(null);

  const [deleteErrorId, setDeleteErrorId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [subdomainsPerPage, setSubdomainsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  const isValidUrl = (str) => {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
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
          const all = await api.get("/api/v1/targets");
          const decodedName = decodeURIComponent(targetName);
          const found = (all.data || []).find((t) => t.name === decodedName);
          if (!found) {
            setError("Target not found");
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
        console.error("Error fetching target details", err);
        setError(err?.response?.data?.detail || err.message || "Failed to load target");
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

  const stats = useMemo(() => {
    const total = subdomains.length;
    const alive = subdomains.filter((s) => s.status === "alive").length;
    const missing = subdomains.filter((s) => s.status === "missing").length;
    return { total, alive, missing };
  }, [subdomains]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(subdomains.length / subdomainsPerPage)),
    [subdomains.length, subdomainsPerPage]
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedSubdomains = useMemo(() => {
    const start = (currentPage - 1) * subdomainsPerPage;
    return subdomains.slice(start, start + subdomainsPerPage);
  }, [subdomains, currentPage, subdomainsPerPage]);

  const pageStart = subdomains.length === 0 ? 0 : (currentPage - 1) * subdomainsPerPage + 1;
  const pageEnd = Math.min(currentPage * subdomainsPerPage, subdomains.length);

  const startEdit = (subdomain) => {
    setEditingId(subdomain.id);
    setEditUrl(subdomain.url || "");
    setEditTitle(subdomain.title || "");
    setEditStatus(subdomain.status || "");
    setEditError(null);
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUrl("");
    setEditTitle("");
    setEditStatus("");
    setEditError(null);
    setConfirmDeleteId(null);
  };

  const saveEdit = async (id) => {
    if (!targetId) return setEditError("Missing target id");
    if (editUrl && !isValidUrl(editUrl.trim())) {
      return setEditError("Invalid URL (include http:// or https://)");
    }
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
      setSuccess("Subdomain updated");
    } catch (err) {
      console.error("Error saving subdomain", err);
      setEditError(err?.response?.data?.detail || err.message || "Failed to save");
    } finally {
      setSavingEditId(null);
    }
  };

  const deleteSubdomain = async (id) => {
    if (!targetId) return setDeleteError("Missing target id");
    setDeleteErrorId(id);
    setDeleteError(null);
    try {
      await api.delete(`/api/v1/targets/${targetId}/subdomains/${id}`);
      setSubdomains((prev) => prev.filter((s) => s.id !== id));
      setSuccess("Subdomain deleted");
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Error deleting subdomain", err);
      setDeleteError(err?.response?.data?.detail || err.message || "Failed to delete");
    } finally {
      setDeleteErrorId(null);
    }
  };

  const renderDeleteControl = (id, disabled = false) => (
    <div className="delete-action">
      <button
        className="btn btn-danger"
        onClick={() => setConfirmDeleteId((prev) => (prev === id ? null : id))}
        disabled={disabled || deleteErrorId === id}
      >
        {deleteErrorId === id ? "Deleting..." : "Delete"}
      </button>
      {confirmDeleteId === id && deleteErrorId !== id && (
        <div className="delete-confirm-box">
          <span className="delete-confirm-label">Delete?</span>
          <button className="btn btn-danger btn-compact" onClick={() => deleteSubdomain(id)}>
            Yes
          </button>
          <button className="btn btn-compact" onClick={() => setConfirmDeleteId(null)}>
            No
          </button>
        </div>
      )}
    </div>
  );

  const changePageSize = (nextPageSize) => {
    const firstVisibleIndex = (currentPage - 1) * subdomainsPerPage;
    const nextPage = Math.floor(firstVisibleIndex / nextPageSize) + 1;
    setSubdomainsPerPage(nextPageSize);
    setCurrentPage(nextPage);
  };

  return (
    <section className="dashboard-content">
      <div className="dashboard-card">
        <div className="item-row">
          <div>
            <h2>Target: {target?.name ?? decodeURIComponent(targetName)}</h2>
            <p className="dashboard-subtle" style={{ margin: "6px 0 0" }}>
              {target?.url || "No URL configured"}
            </p>
          </div>
          <div className="item-actions">
            <button className="btn" onClick={() => navigate("/")}>
              Back to Targets
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-card">
          <p className="dashboard-subtle">Loading target data...</p>
        </div>
      ) : error ? (
        <div className="dashboard-card">
          <div className="status-text status-error">{error}</div>
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-card">
            <div className="stat-grid">
              <div className="stat-tile">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total subdomains</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{stats.alive}</div>
                <div className="stat-label">Alive</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{stats.missing}</div>
                <div className="stat-label">Missing</div>
              </div>
            </div>
            {success && <div className="status-text status-success">{success}</div>}
            {editError && <div className="status-text status-error">{editError}</div>}
            {deleteError && (
              <div className="status-text status-error">{deleteError}</div>
            )}
          </div>

          <SubdomainForm
            targetId={targetId}
            onCreated={(subdomain) => {
              setSubdomains((prev) => [subdomain, ...prev]);
              setCurrentPage(1);
            }}
          />

          <div className="dashboard-card">
            <h2>Subdomains</h2>
            <p className="dashboard-subtle" style={{ margin: "6px 0 12px" }}>
              {subdomains.length} records for this target.
            </p>
            {subdomains.length === 0 ? (
              <p className="dashboard-subtle">No subdomains found.</p>
            ) : (
              <>
                <div className="pagination-row">
                  <p className="dashboard-subtle">
                    Showing {pageStart}-{pageEnd} of {subdomains.length}
                  </p>
                  <div className="pagination-controls">
                    <label className="dashboard-subtle pagination-size-label">
                      Per page
                      <select
                        className="pagination-size-select"
                        value={subdomainsPerPage}
                        onChange={(e) => changePageSize(Number(e.target.value))}
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="btn"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="dashboard-subtle">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="btn"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
                <ul className="list">
                  {paginatedSubdomains.map((subdomain) => (
                  <li key={subdomain.id} className="list-item">
                    {editingId === subdomain.id ? (
                      <div className="form-row">
                        <input
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="URL"
                          style={{ flex: 1, minWidth: 220 }}
                        />
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                        />
                        <input
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          placeholder="Status"
                        />
                        <button
                          className="btn btn-primary"
                          onClick={() => saveEdit(subdomain.id)}
                          disabled={savingEditId === subdomain.id}
                        >
                          {savingEditId === subdomain.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="btn"
                          onClick={cancelEdit}
                          disabled={savingEditId === subdomain.id}
                        >
                          Cancel
                        </button>
                        {renderDeleteControl(subdomain.id, savingEditId === subdomain.id)}
                      </div>
                    ) : (
                      <div className="item-row">
                        <div>
                          <div>
                            {isValidUrl(subdomain.url) ? (
                              <a
                                className="item-title"
                                href={subdomain.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {subdomain.url}
                              </a>
                            ) : (
                              <span className="item-title">{subdomain.url}</span>
                            )}
                          </div>
                          <div className="item-meta">
                            {subdomain.title || "Untitled"} |{" "}
                            {subdomain.status || "unknown"}
                          </div>
                        </div>
                        <div className="item-actions">
                          <button className="btn" onClick={() => startEdit(subdomain)}>
                            Edit
                          </button>
                          {renderDeleteControl(subdomain.id)}
                        </div>
                      </div>
                    )}
                  </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default TargetDetails;
