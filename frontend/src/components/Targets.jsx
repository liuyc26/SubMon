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
  const [schedulingId, setSchedulingId] = useState(null);
  const [scheduledTargets, setScheduledTargets] = useState({});
  const [scheduleMinutesByTarget, setScheduleMinutesByTarget] = useState({});
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleMessage, setScheduleMessage] = useState(null);

  const navigate = useNavigate();

  const fetchTargets = async () => {
    try {
      const response = await api.get("/api/v1/targets");
      const targetRows = response.data;
      setTargets(targetRows);

      const scheduledMap = {};
      const minutesMap = {};
      for (const target of targetRows) {
        if (!target?.id) continue;
        scheduledMap[target.id] = Boolean(target.is_scheduled);
        if (target.waiting_minutes) {
          minutesMap[target.id] = target.waiting_minutes;
        }
      }
      setScheduledTargets(scheduledMap);
      setScheduleMinutesByTarget((prev) => ({ ...prev, ...minutesMap }));
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
      setTargets((prev) =>
        prev.map((t) => (t.id === target.id ? { ...t, scan_status: "queued" } : t))
      );
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

  const toggleSchedule = async (target) => {
    if (!target?.id) return;
    const isScheduled = Boolean(scheduledTargets[target.id]);
    const waitingMinutes =
      scheduleMinutesByTarget[target.id] ?? target.waiting_minutes ?? 60;
    const currentWaitingMinutes = target.waiting_minutes ?? 60;
    const shouldUnschedule = isScheduled && waitingMinutes === currentWaitingMinutes;
    setScheduleError(null);
    setScheduleMessage(null);

    try {
      setSchedulingId(target.id);
      if (shouldUnschedule) {
        const resp = await api.patch(`/api/v1/targets/${target.id}/schedule`, null, {
          params: { enabled: false },
        });
        setScheduledTargets((prev) => ({ ...prev, [target.id]: false }));
        setTargets((prev) =>
          prev.map((t) =>
            t.id === target.id
              ? {
                  ...t,
                  is_scheduled: false,
                  next_run_time: resp?.data?.next_run_time ?? null,
                }
              : t
          )
        );
        setScheduleMessage(`Schedule disabled for ${target.name}`);
      } else {
        const resp = await api.patch(`/api/v1/targets/${target.id}/schedule`, null, {
          params: { enabled: true, waiting_minutes: waitingMinutes },
        });
        const nextRunTime = resp?.data?.next_run_time ?? null;
        setScheduledTargets((prev) => ({ ...prev, [target.id]: true }));
        setTargets((prev) =>
          prev.map((t) =>
            t.id === target.id && t.scan_status !== "running"
              ? {
                  ...t,
                  is_scheduled: true,
                  waiting_minutes: waitingMinutes,
                  next_run_time: nextRunTime,
                  scan_status: "queued",
                }
              : t.id === target.id
                ? {
                    ...t,
                    is_scheduled: true,
                    waiting_minutes: waitingMinutes,
                    next_run_time: nextRunTime,
                  }
              : t
          )
        );
        setScheduleMessage(
          `Scheduled ${target.name} every ${waitingMinutes} minute${waitingMinutes === 1 ? "" : "s"}`
        );
      }
    } catch (error) {
      console.error("Error updating schedule", error);
      setScheduleError(
        error?.response?.data?.detail || error.message || "Failed to update schedule"
      );
    } finally {
      setSchedulingId(null);
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
                          target.scan_status === "queued" ||
                          target.scan_status === "running"
                        }
                      >
                        {scanningId === target.id
                          ? "Submitting..."
                          : target.scan_status === "queued"
                            ? "Queued"
                          : target.scan_status === "running"
                            ? "Scanning"
                            : "Scan"}
                      </button>
                      <div className="schedule-combo">
                        {(() => {
                          const selectedMinutes =
                            scheduleMinutesByTarget[target.id] ??
                            target.waiting_minutes ??
                            60;
                          const currentMinutes = target.waiting_minutes ?? 60;
                          const showUnschedule =
                            Boolean(scheduledTargets[target.id]) &&
                            selectedMinutes === currentMinutes;
                          const nextRunLabel =
                            target.next_run_time
                              ? `Next run: ${new Date(target.next_run_time).toLocaleString("en-US", { timeZone: "UTC" })} UTC`
                              : "No next run set";
                          return (
                        <button
                          className="btn schedule-main-btn"
                          onClick={() => toggleSchedule(target)}
                          disabled={!target.id || schedulingId === target.id}
                          title={nextRunLabel}
                        >
                          {schedulingId === target.id
                            ? "Applying..."
                            : showUnschedule
                              ? "Unschedule"
                              : "Schedule"}
                        </button>
                          );
                        })()}
                        <select
                          className="schedule-inline-select"
                          value={scheduleMinutesByTarget[target.id] ?? 60}
                          onChange={(e) =>
                            setScheduleMinutesByTarget((prev) => ({
                              ...prev,
                              [target.id]: Number.parseInt(e.target.value, 10),
                            }))
                          }
                          disabled={!target.id || schedulingId === target.id}
                        >
                          <option value={5}>5m</option>
                          <option value={15}>15m</option>
                          <option value={30}>30m</option>
                          <option value={60}>1h</option>
                          <option value={120}>2h</option>
                          <option value={360}>6h</option>
                          <option value={720}>12h</option>
                          <option value={1440}>24h</option>
                        </select>
                      </div>
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
        {scheduleError && (
          <div className="status-text status-error">{scheduleError}</div>
        )}
        {scheduleMessage && (
          <div className="status-text status-success">{scheduleMessage}</div>
        )}
      </div>
    </section>
  );
};

export default TargetList;
