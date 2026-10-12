import Icon from './Icon';

export default function EmptyState({ icon = 'inbox', title, description, actionLabel, onAction }) {
    return (
        <div className="empty-state" role="status">
            <Icon name={icon} size={40} className="empty-state__icon" aria-hidden="true" />
            <h3 className="empty-state__title">{title}</h3>
            {description && <p className="empty-state__description">{description}</p>}
            {actionLabel && onAction && (
                <button type="button" className="empty-state__action" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
