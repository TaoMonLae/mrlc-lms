import { NavLink, Outlet } from 'react-router';
import { usePermissions } from '../../lib/permissions';
import type { Permission } from '../../../shared/permissions';
import { Landmark } from 'lucide-react';

const links: { to: string; title: string; permission: Permission }[] = [
  { to: '/financial', title: 'Overview', permission: 'view_financial_reports' },
  { to: '/fees', title: 'School fees', permission: 'manage_fees' },
  { to: '/donations', title: 'Donations', permission: 'view_donations' },
  { to: '/expenses', title: 'Expenses', permission: 'view_expenses' },
  { to: '/budgets', title: 'Budgets', permission: 'view_budgets' },
  { to: '/financial/reports/monthly', title: 'Monthly report', permission: 'view_financial_reports' },
  { to: '/financial/reports/income-expense', title: 'Income & expense', permission: 'view_financial_reports' },
  { to: '/financial/reports/budget-vs-actual', title: 'Budget variance', permission: 'view_financial_reports' },
  { to: '/financial/procedures', title: 'Finance guide', permission: 'view_financial_reports' },
];
export default function FinanceWorkspace() {
  const { hasPermission } = usePermissions();
  return <div className="finance-workspace min-w-0">
    <div className="mb-6 border-b border-border print:hidden">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Landmark className="h-4 w-4" aria-hidden="true" />MRLC · School & community finance</div>
      <nav aria-label="Finance workspace" className="flex gap-1 overflow-x-auto pb-px">
        {links.filter(link => hasPermission(link.permission)).map(link => <NavLink key={link.to} to={link.to} end className={({ isActive }) => `shrink-0 border-b-2 px-3 py-3 text-sm font-medium outline-offset-[-3px] transition-colors ${isActive ? 'border-academic-teal text-academic-teal' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{link.title}</NavLink>)}
      </nav>
    </div>
    <Outlet />
  </div>;
}
