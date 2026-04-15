"use client";

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorCard({ message, onRetry, onDismiss }: ErrorCardProps) {
  return (
    <div className="error-card" role="alert">
      <div className="error-card__content">
        <span className="error-card__icon" aria-hidden="true">⚠</span>
        <p className="error-card__message">{message}</p>
      </div>
      {(onRetry || onDismiss) && (
        <div className="error-card__actions">
          {onRetry && (
            <button type="button" className="btn-primary btn-inline" onClick={onRetry}>
              Retry
            </button>
          )}
          {onDismiss && (
            <button type="button" className="btn-ghost btn-inline" onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
