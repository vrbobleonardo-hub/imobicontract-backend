import { AnimatePresence, motion } from 'framer-motion';
import Skeleton from '../ui/Skeleton';
import Badge from '../ui/Badge';
import { Notification, NotificationStatus, NotificationTemplate, NotificationType } from '../../lib/api';

type Props = {
  notifications: Notification[];
  loading?: boolean;
  selectedId: number | null;
  onSelect: (notification: Notification) => void;
  templates: NotificationTemplate[];
};

const statusLabel: Record<NotificationStatus, string> = {
  PENDENTE: 'Pendente',
  ENVIADA: 'Enviada',
  ARQUIVADA: 'Arquivada',
};

const NotificationList = ({ notifications, loading = false, selectedId, onSelect, templates }: Props) => {
  const templateLabel = (type: NotificationType) =>
    templates.find((tpl) => tpl.type === type)?.label || type.replace(/_/g, ' ').toLowerCase();

  if (loading) {
    return (
      <div className="notif-list-card">
        <Skeleton height="42px" />
        <Skeleton height="42px" />
        <Skeleton height="42px" />
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="notif-list-card empty-state">
        <p className="muted">Nenhuma notificação ainda. Comece gerando uma notificação a partir de um contrato ou imóvel.</p>
      </div>
    );
  }

  return (
    <div className="notif-list-card">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => {
          const isActive = selectedId === n.id;
          return (
            <motion.button
              key={n.id}
              className={`notif-row ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(n)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <div className="row-head">
                <div className="row-titles">
                  <p className="row-title">{n.title}</p>
                  <p className="row-sub">
                    {n.property?.title || 'Sem imóvel'} {n.property?.city ? `• ${n.property.city}` : ''}
                  </p>
                </div>
                <div className="row-badges">
                  <Badge
                    variant={
                      n.status === 'ENVIADA'
                        ? 'success'
                        : n.status === 'PENDENTE'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {statusLabel[n.status]}
                  </Badge>
                  <Badge variant="neutral">{templateLabel(n.type)}</Badge>
                </div>
              </div>
              <div className="row-meta">
                <span>{n.tenant?.fullName || 'Locatário não vinculado'}</span>
                <span>•</span>
                <span>{n.landlord?.fullName || 'Locador não vinculado'}</span>
                <span>•</span>
                <span>{new Date(n.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NotificationList;
