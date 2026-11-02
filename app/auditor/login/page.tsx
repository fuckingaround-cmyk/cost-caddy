import { AuditorShell } from '@/components/ui/AuditorShell';
import { BrandMark } from '@/components/ui/BrandMark';
import { AuditorLoginForm } from './AuditorLoginForm';

// B1 — auditor sign-in (screen key `login`). Wrong credentials keep the email and
// show one message; valid credentials land on `pending`.
export default function AuditorLoginPage() {
  return (
    <AuditorShell>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 520,
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <BrandMark size="login" />
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 'var(--space-11)' }}>Auditor sign in</div>
        <AuditorLoginForm />
      </div>
    </AuditorShell>
  );
}
