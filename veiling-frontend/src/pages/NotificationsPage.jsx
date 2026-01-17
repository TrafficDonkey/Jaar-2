import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./NotificationsPageStyle.css";

function normalizeDetails(raw) {
  if (!Array.isArray(raw)) return null;
  const cleaned = raw
    .map((item) => {
      const label = String(item?.label ?? "").trim();
      const value = String(item?.value ?? "").trim();
      if (!label || !value) return null;
      return { label, value };
    })
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : null;
}

function loadNotifications() {
  try {
    const raw = sessionStorage.getItem("notifLog");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const details = normalizeDetails(item?.details);
      return {
        ...item,
        read: Boolean(item?.read),
        ...(details ? { details } : {}),
      };
    });
  } catch {
    return [];
  }
}

export default function NotificationsPage() {
  const [tab, setTab] = useState("new");
  const [items, setItems] = useState(loadNotifications());
  const [expandedId, setExpandedId] = useState(null);

  const newItems = useMemo(
    () => items.filter((n) => !n.read),
    [items]
  );
  const oldItems = useMemo(
    () => items.filter((n) => n.read),
    [items]
  );

  function updateItems(next) {
    setItems(next);
    sessionStorage.setItem("notifLog", JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent("floraflow:notifications:update", {
        detail: { log: next },
      })
    );
  }

  function markRead(id) {
    const next = items.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    updateItems(next);
  }

  function removeItem(id) {
    const next = items.filter((n) => n.id !== id);
    if (expandedId === id) setExpandedId(null);
    updateItems(next);
  }

  function markAllRead() {
    const next = items.map((n) => ({ ...n, read: true }));
    updateItems(next);
  }

  function clearAll() {
    setExpandedId(null);
    updateItems([]);
  }

  const visibleItems = useMemo(() => {
    const base = tab === "new" ? newItems : oldItems;
    if (tab !== "new" || !expandedId) return base;
    const expanded = items.find((n) => n.id === expandedId);
    if (!expanded || !expanded.read) return base;
    return [expanded, ...base.filter((n) => n.id !== expandedId)];
  }, [tab, newItems, oldItems, expandedId, items]);

  function handleItemToggle(item) {
    const hasDetails = Array.isArray(item.details) && item.details.length > 0;
    if (hasDetails) {
      setExpandedId((prev) => (prev === item.id ? null : item.id));
    }
    if (!item.read) {
      markRead(item.id);
    }
  }

  return (
    <div className="page-shell notif-shell">
      <header className="notif-header">
        <div>
          <h1>Meldingen</h1>
          <p className="notif-sub">
            Nieuwe meldingen zijn lichter. Oude meldingen zijn grijs.
          </p>
        </div>
        <div className="notif-actions">
          <button
            type="button"
            className="notif-tab"
            onClick={() => {
              setTab("new");
              setExpandedId(null);
            }}
            aria-pressed={tab === "new"}
          >
            Nieuw ({newItems.length})
          </button>
          <button
            type="button"
            className="notif-tab"
            onClick={() => {
              setTab("old");
              setExpandedId(null);
            }}
            aria-pressed={tab === "old"}
          >
            Oud ({oldItems.length})
          </button>
          <button
            type="button"
            className="notif-clear"
            onClick={markAllRead}
            disabled={newItems.length === 0}
          >
            Alles gelezen
          </button>
          <button
            type="button"
            className="notif-clear notif-clear--danger"
            onClick={clearAll}
            disabled={items.length === 0}
          >
            Alles verwijderen
          </button>
        </div>
      </header>

      <section className="notif-card">
        {visibleItems.length === 0 ? (
          <p className="notif-empty">
            Geen {tab === "new" ? "nieuwe" : "oude"} meldingen.
          </p>
        ) : (
          <ul className="notif-list">
            {visibleItems.map((item) => {
              const hasDetails =
                Array.isArray(item.details) && item.details.length > 0;
              const isExpanded = hasDetails && expandedId === item.id;
              const detailId = hasDetails
                ? `notif-details-${item.id}`
                : undefined;

              return (
                <li
                  key={item.id}
                  className={`notif-item notif-item--${item.type || "info"} ${
                    item.read ? "is-read" : "is-unread"
                  } ${isExpanded ? "is-expanded" : ""}`}
                  onClick={() => handleItemToggle(item)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={hasDetails ? isExpanded : undefined}
                  aria-controls={hasDetails ? detailId : undefined}
                  title={
                    hasDetails
                      ? "Klik om details te tonen"
                      : undefined
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleItemToggle(item);
                    }
                  }}
                >
                  <div className="notif-item__row">
                    <div className="notif-item__text">{item.text}</div>
                    <div className="notif-item__meta">
                      {item.time && (
                        <div className="notif-item__time">{item.time}</div>
                      )}
                      <button
                        type="button"
                        className="notif-item__delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                        }}
                        aria-label="Melding verwijderen"
                        title="Melding verwijderen"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {hasDetails && isExpanded && (
                    <dl className="notif-item__details" id={detailId}>
                      {item.details.map((detail, index) => (
                        <div
                          key={`${item.id}-detail-${index}`}
                          className="notif-item__detail"
                        >
                          <dt>{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="notif-back">
        <Link to="/app" className="notif-back-link">
          Terug naar dashboard
        </Link>
      </div>
    </div>
  );
}
