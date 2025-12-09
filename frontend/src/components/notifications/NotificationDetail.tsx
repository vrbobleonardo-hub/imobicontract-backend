import { motion } from 'framer-motion';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Skeleton from '../ui/Skeleton';
import { Notification, NotificationStatus, NotificationTemplate, NotificationType } from '../../lib/api';

type Props = {
  notification: Notification | null;
  formTitle: string;
  formBody: string;
  activeTemplate?: NotificationTemplate;
  loading?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onMarkStatus?: (status: NotificationStatus) => void;
  onCopy?: () => void;
  onPdf?: () => void;
  statusUpdating?: boolean;
};

const statusLabel: Record<NotificationStatus, string> = {
  PENDENTE: 'Pendente',
  ENVIADA: 'Enviada',
  ARQUIVADA: 'Arquivada',
};

const NotificationDetail = ({
  notification,
  formTitle,
  formBody,
  activeTemplate,
  loading = false,
  onEdit,
  onDuplicate,
  onMarkStatus,
  onCopy,
  onPdf,
  statusUpdating,
}: Props) => {
  if (loading) {
    return (
      <div className="notif-detail-card">
        <Skeleton height="32px" />
        <Skeleton height="180px" />
        <Skeleton height="32px" />
      </div>
    );
  }

  const title = notification?.title || formTitle || 'Selecione uma notificação';
  const body = notification?.body || formBody || '';
  const typeLabel = activeTemplate?.label || notification?.type || 'Tipo não definido';
  const status = notification?.status || 'PENDENTE';

  return (
    <motion.div
      className="notif-detail-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="detail-head">
        <div>
          <p className="detail-eyebrow">Notificação</p>
          <h2 className="detail-title">{title}</h2>
          <div className="detail-meta">
            <Badge variant={status === 'ENVIADA' ? 'success' : status === 'PENDENTE' ? 'warning' : 'neutral'}>
              {statusLabel[status]}
            </Badge>
            <Badge variant="neutral">{typeLabel}</Badge>
          </div>
        </div>
        <div className="detail-actions">
          <Button variant="ghost" onClick={onEdit}>
            Editar texto
          </Button>
          <Button variant="ghost" onClick={onDuplicate}>
            Duplicar como nova
          </Button>
          <Button
            variant="primary"
            onClick={() => onMarkStatus && onMarkStatus(status === 'ENVIADA' ? 'PENDENTE' : 'ENVIADA')}
            disabled={statusUpdating}
          >
            {statusUpdating
              ? 'Atualizando...'
              : status === 'ENVIADA'
                ? 'Marcar como rascunho'
                : 'Marcar como enviada'}
          </Button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <p className="detail-card-label">Imóvel</p>
          <p className="detail-card-value">{notification?.property?.title || 'Não vinculado'}</p>
          <p className="detail-card-sub">
            {notification?.property?.city || ''} {notification?.property?.state ? `• ${notification.property.state}` : ''}
          </p>
        </div>
        <div className="detail-card">
          <p className="detail-card-label">Locatário</p>
          <p className="detail-card-value">{notification?.tenant?.fullName || 'Não vinculado'}</p>
          <p className="detail-card-sub">{notification?.tenant?.email || notification?.tenant?.phone || ''}</p>
        </div>
        <div className="detail-card">
          <p className="detail-card-label">Locador</p>
          <p className="detail-card-value">{notification?.landlord?.fullName || 'Não vinculado'}</p>
          <p className="detail-card-sub">{notification?.landlord?.email || notification?.landlord?.phone || ''}</p>
        </div>
      </div>

      <div className="detail-body">
        <p className="detail-body-label">Conteúdo</p>
        <div className="detail-body-box">
          {body
            ? body.split('\n').map((line, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <p key={`${line}-${idx}`}>{line || '\u00A0'}</p>
              ))
            : 'Sem conteúdo ainda.'}
        </div>
      </div>

      <div className="detail-footer">
        <div className="detail-timeline">
          <span>Criado: {notification?.createdAt ? new Date(notification.createdAt).toLocaleString('pt-BR') : '—'}</span>
          <span>Atualizado: {notification?.updatedAt ? new Date(notification.updatedAt).toLocaleString('pt-BR') : '—'}</span>
        </div>
        <div className="detail-buttons">
          <Button variant="ghost" onClick={onCopy}>
            Copiar texto
          </Button>
          <Button variant="ghost" onClick={onPdf}>
            Gerar PDF
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationDetail;
