import { BrandMark } from '@/components/ui/BrandMark';
import { LoginForm } from './LoginForm';

// A1 — Super admin login. Auditors sign in from the separate auditor app (B1).
export default function AdminLoginPage() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '64px 24px',
        background: 'var(--bg)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 392,
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-large)',
          padding: '34px 32px',
        }}
      >
        <BrandMark size="login" />
        <div style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 'var(--space-6)' }}>Super admin console</div>

        <LoginForm />

        <div
          style={{
            marginTop: 'var(--space-11)',
            paddingTop: 'var(--space-8)',
            borderTop: '1px solid var(--divider)',
            fontSize: 11.5,
            color: 'var(--placeholder)',
            lineHeight: 1.55,
          }}
        >
          Auditors sign in from the auditor app with credentials issued here. Super admin accounts
          are provisioned by the platform owner.
        </div>
      </div>
    </div>
  );
}
