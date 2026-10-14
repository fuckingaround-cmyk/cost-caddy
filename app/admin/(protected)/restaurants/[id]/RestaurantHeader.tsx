'use client';

import { useActionState, useEffect, useState } from 'react';
import { deleteRestaurant, updateRestaurant, type EditRestaurantState } from '@/lib/actions/restaurants';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';

const initialState: EditRestaurantState = {};

// A6: name/location with Edit and Delete. Delete cascades to the restaurant's audits;
// the confirm names that consequence.
export function RestaurantHeader({
  outletId,
  name,
  city,
  auditCount,
}: {
  outletId: string;
  name: string;
  city: string | null;
  auditCount: number;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--divider)',
        paddingBottom: 'var(--space-9)',
        marginBottom: 'var(--space-10)',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {editing ? (
        <EditForm outletId={outletId} name={name} city={city} onDone={() => setEditing(false)} />
      ) : (
        <div>
          <div style={{ fontFamily: 'var(--font-ui-title)', fontSize: 'var(--text-screen-title)', fontWeight: 600 }}>{name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>{city}</div>
        </div>
      )}
      {!editing && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Button variant="secondary" onClick={() => setEditing(true)} style={{ padding: '8px 12px', fontSize: 12 }}>
            Edit
          </Button>
          <ConfirmDeleteButton
            message={
              auditCount > 0
                ? `Delete this restaurant and its ${auditCount} audit${auditCount === 1 ? '' : 's'} permanently? Reports and photos are removed too.`
                : 'Delete this restaurant permanently?'
            }
            onConfirm={() => deleteRestaurant(outletId)}
          />
        </div>
      )}
    </div>
  );
}

function EditForm({
  outletId,
  name,
  city,
  onDone,
}: {
  outletId: string;
  name: string;
  city: string | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateRestaurant.bind(null, outletId), initialState);

  useEffect(() => {
    if (state.saved) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.saved]);

  return (
    <form action={formAction} style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-end', flexWrap: 'wrap', flex: 1 }}>
      <TextInput label="Restaurant name" name="name" defaultValue={name} required style={{ flex: 1, minWidth: 200 }} />
      <TextInput label="Location" name="city" defaultValue={city ?? ''} style={{ flex: 1, minWidth: 160 }} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="secondary" onClick={onDone} disabled={pending}>
        Cancel
      </Button>
      {state.error && (
        <div style={{ width: '100%', fontSize: 12, color: 'var(--status-fail-fg-app)', fontWeight: 600 }}>{state.error}</div>
      )}
    </form>
  );
}
