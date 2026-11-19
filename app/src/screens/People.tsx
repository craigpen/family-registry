import { ArrowLeft, CheckCircle, CircleDashed, Clock, CrownSimple, HandHeart, Plus, Printer, UserPlus, UsersThree } from '@phosphor-icons/react';
import type { Member } from '@family-registry/core';
import type { Family } from '../family.ts';
import { Avatar } from '../ui/bits.tsx';

type Status = 'you' | 'joined' | 'invited' | 'none' | 'managed';

function statusOf(fam: Family, pk: string): { status: Status; devices: number; invitedAt?: number } {
  if (pk === fam.me.pubkey) return { status: 'you', devices: 0 };
  if (fam.people.get(pk)?.managed) return { status: 'managed', devices: 0 };
  const devices = fam.joined.get(pk)?.size ?? 0;
  const invitedAt = fam.vault?.people.find(p => p.pubkey === pk)?.invitedAt;
  return { status: devices ? 'joined' : invitedAt ? 'invited' : 'none', devices, invitedAt };
}

const ago = (t: number) => {
  const days = Math.floor((Date.now() / 1000 - t) / 86_400);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

/** The organizer view: everyone in each group, whether they've joined, and their invites. */
export function People({ fam, onBack, onInvite, onAddPerson, onNewGroup, onBackup, onEdit }: {
  fam: Family; onBack: () => void; onInvite: (pk: string, groupTag: string) => void; onAddPerson: () => void; onNewGroup: () => void;
  onBackup: () => void; onEdit: (pk: string) => void;
}) {
  const nameOf = (pk: string) => (pk === fam.me.pubkey ? 'you' : fam.people.get(pk)?.name.replace(/^(Aunt|Uncle) /, '') ?? 'someone');
  const row = (m: Member, tag: string) => {
    const s = statusOf(fam, m.pubkey);
    const line = {
      you: <span className="st"><CrownSimple weight="fill" aria-hidden /> You · organizer</span>,
      joined: <span className="st joined"><CheckCircle weight="fill" aria-hidden /> Joined{s.devices > 1 ? ` on ${s.devices} devices` : ''}</span>,
      invited: <span className="st waiting"><Clock weight="fill" aria-hidden /> Invited {s.invitedAt ? ago(s.invitedAt) : ''}, not opened yet</span>,
      none: <span className="st"><CircleDashed aria-hidden /> Not invited yet</span>,
      managed: <span className="st"><HandHeart weight="fill" aria-hidden /> Kept by {m.helpers.map(nameOf).join(' and ') || 'nobody yet'}</span>,
    }[s.status];
    return (
      <div className="prow" key={m.pubkey}>
        <button className="tapname" onClick={() => onEdit(m.pubkey)} aria-label={`Edit ${m.name}`}>
          <Avatar person={m} size="sm" />
          <div className="body"><div className="name">{m.name}{m.organizer && s.status !== 'you' ? ' · organizer' : ''}</div>{line}</div>
        </button>
        {s.status === 'none' && <button className="act" onClick={() => onInvite(m.pubkey, tag)}>Invite</button>}
        {s.status === 'invited' && <button className="act quiet" onClick={() => onInvite(m.pubkey, tag)}>Resend</button>}
      </div>
    );
  };

  return (
    <section className="screen">
      <div className="top">
        <button className="iconbtn" onClick={onBack} aria-label="Back"><ArrowLeft weight="bold" /></button>
        <div className="grow"><div className="sub">You're an organizer</div><h1>People</h1></div>
      </div>
      {fam.groups.map(g => (
        <div key={g.tag}>
          <div className="section-title"><span className="group-name"><UsersThree aria-hidden />{g.name}</span><span>{g.members.length}</span></div>
          <div className="prows">{g.members.map(m => row(m, g.tag))}</div>
        </div>
      ))}
      <button className="btn primary" style={{ marginTop: 20 }} onClick={onAddPerson}><UserPlus weight="bold" aria-hidden /> Add someone</button>
      <button className="btn ghost" onClick={onNewGroup}><Plus aria-hidden /> Start another group</button>
      <button className="btn ghost" onClick={onBackup}><Printer aria-hidden /> Print family backup</button>
    </section>
  );
}
