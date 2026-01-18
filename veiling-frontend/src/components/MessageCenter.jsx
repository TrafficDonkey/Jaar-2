import React from "react";
import "./MessageCenter.css";

export default function MessageCenter({ title = "Berichten", messages, onClear }) {
  const hasMessages = Array.isArray(messages) && messages.length > 0;

  return (
    <section className="msg-center" aria-live="polite">
      <div className="msg-center__head">
        <h3 className="msg-center__title">{title}</h3>
        {onClear && hasMessages && (
          <button
            type="button"
            className="msg-center__clear"
            onClick={onClear}
          >
            Wissen
          </button>
        )}
      </div>
      {!hasMessages ? (
        <p className="msg-center__empty">Nog geen berichten.</p>
      ) : (
        <ul className="msg-center__list">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`msg-center__item msg-center__item--${m.type || "info"}`}
            >
              <div className="msg-center__text">{m.text}</div>
              {m.time && <div className="msg-center__time">{m.time}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
