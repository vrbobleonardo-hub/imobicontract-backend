import { ReactNode } from 'react';
import '../../App.css';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: string;
};

const PageHeader = ({ title, subtitle, actions, breadcrumb }: PageHeaderProps) => {
  return (
    <div className="page-header-2025">
      <div className="page-header-text">
        {breadcrumb && <p className="eyebrow">{breadcrumb}</p>}
        <h1 className="text-heading">{title}</h1>
        {subtitle && <p className="text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
};

export default PageHeader;
