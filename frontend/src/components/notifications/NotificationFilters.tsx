import Input from '../ui/Input';
import Select from '../ui/Select';
import { NotificationStatus, NotificationTemplate, NotificationType, Property } from '../../lib/api';

type TimeScope = 'all' | 'dueSoon' | 'overdue';

type Props = {
  status: NotificationStatus | 'todos';
  type: NotificationType | 'todos';
  propertyId: number | 'todos';
  searchTerm: string;
  timeScope: TimeScope;
  templates: NotificationTemplate[];
  properties: Property[];
  onStatusChange: (status: NotificationStatus | 'todos') => void;
  onTypeChange: (type: NotificationType | 'todos') => void;
  onPropertyChange: (id: number | 'todos') => void;
  onSearchTermChange: (value: string) => void;
  onApplySearch: () => void;
  onTimeScopeChange: (scope: TimeScope) => void;
};

const NotificationFilters = ({
  status,
  type,
  propertyId,
  searchTerm,
  timeScope,
  templates,
  properties,
  onStatusChange,
  onTypeChange,
  onPropertyChange,
  onSearchTermChange,
  onApplySearch,
  onTimeScopeChange,
}: Props) => {
  const statusChips: { key: NotificationStatus | 'todos' | TimeScope; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'PENDENTE', label: 'Pendente' },
    { key: 'ENVIADA', label: 'Enviada' },
    { key: 'dueSoon', label: 'Vencendo em 15 dias' },
    { key: 'overdue', label: 'Em atraso' },
  ];

  const isChipActive = (key: NotificationStatus | 'todos' | TimeScope) => {
    if (key === 'dueSoon' || key === 'overdue') {
      return timeScope === key;
    }
    return status === key && timeScope === 'all';
  };

  const handleChipClick = (key: NotificationStatus | 'todos' | TimeScope) => {
    if (key === 'dueSoon' || key === 'overdue') {
      onTimeScopeChange(key);
      onStatusChange('PENDENTE');
    } else {
      onStatusChange(key as NotificationStatus | 'todos');
      onTimeScopeChange('all');
    }
  };

  return (
    <div className="notif-filters-card">
      <div className="filter-top">
        <h3 className="filter-title">Filtros rápidos</h3>
        <p className="filter-sub">Encontre rapidamente o que precisa de atenção.</p>
      </div>

      <div className="chip-group">
        {statusChips.map((chip) => (
          <button
            key={chip.key}
            className={`chip ${isChipActive(chip.key) ? 'active' : ''}`}
            onClick={() => handleChipClick(chip.key)}
            type="button"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <Input
        label="Busca"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        placeholder="Título, corpo ou destinatário"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onApplySearch();
        }}
      />

      <div className="input-row two-cols">
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => onTypeChange(e.target.value as NotificationType | 'todos')}
        >
          <option value="todos">Todos os tipos</option>
          {templates.map((tpl) => (
            <option key={tpl.type} value={tpl.type}>
              {tpl.label}
            </option>
          ))}
        </Select>
        <Select
          label="Imóvel"
          value={propertyId}
          onChange={(e) => onPropertyChange(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
        >
          <option value="todos">Todos os imóveis</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} {p.city ? `• ${p.city}` : ''}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default NotificationFilters;
