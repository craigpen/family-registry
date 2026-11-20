import { ArrowLeft, CheckCircle, CircleDashed, Clock, CrownSimple, HandHeart, Plus, Printer, UserPlus, UsersThree } from '@phosphor-icons/react';
import type { Member } from '@family-registry/core';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { Avatar } from '../ui/bits.tsx';
import { t } from '../ui/text.tsx';

const c = copy.people;

type Status = 'you' | 'joined' | 'invited' | 'none' | 'managed';

function statusOf(fam: Family, pk: string): { status: Status; devices: number; invitedAt?: number } {
  if (pk === fam.me.pubkey) return { status: 'you', devices: 0 };
  if (fam.people.get(pk)?.managed) return { status: 'managed', devices: 0 };
  const devices = fam.joined.get(pk)?.size ?? 0;
  const invitedAt = fam.vault?.people.find(p => p.pubkey === pk)?.invitedAt;
  return { status: devices ? 'joined' : invitedAt ? 'invited' : 'none', devices, invitedAt };
}

/** Where someone is set up, from their devices' markers ("phone app, computer browser"). Older devices don't say. */
function whereSetUp(fam: Family, pk: string): string {
  const labels = new Set<string>();
  for (const { kind } of fam.devices.get(pk)?.values() ?? []) {
    if (!kind?.platform) continue;
    const phone = kind.platform !== 'desktop';
    labels.add(phone ? (kind.app ? c.phoneApp : c.phoneBrowser)
      : kind.button ? c.computerButton : kind.app ? c.computerApp : c.computerBrowser);
  }
  return [...labels].join(', ');
}

const ago = (time: number) => {
  const days = Math.floor((Date.now() / 1000 - time) / 86_400);
  return days <= 0 ? c.today : days === 1 ? c.yesterday : t(c.daysAgo, { n: days });
};

/** The organizer view: everyone in each group, whether they've joined, and their invites. */
export function People({ fam, onBack, onInvite, onAddPerson, onNewGroup, onBackup, onEdit }: {
  fam: Family; onBack: () => void; onInvite: (pk: string, groupTag: string) => void; onAddPerson: () => void; onNewGroup: () => void;
  onBackup: () => void; onEdit: (pk: string) => void;
}) {
  const nameOf = (pk: string) => (pk === fam.me.pubkey ? c.youLower : fam.people.get(pk)?.name.replace(/^(Aunt|Uncle) /, '') ?? c.someoneLower);
  const row = (m: Member, tag: string) => {
    const s = statusOf(fam, m.pubkey);
    const line = {
      you: <span className="st"><CrownSimple weight="fill" aria-hidden /> {c.you}</span>,
      joined: <span className="st joined"><CheckCircle weight="fill" aria-hidden /> {whereSetUp(fam, m.pubkey)
        ? t(c.joinedWhere, { where: whereSetUp(fam, m.pubkey) })
        : s.devices > 1 ? t(c.joinedOn, { n: s.devices }) : c.joined}</span>,
      invited: <span className="st waiting"><Clock weight="fill" aria-hidden /> {t(c.invited, { when: s.invitedAt ? ago(s.invitedAt) : '' })}</span>,
      none: <span className="st"><CircleDashed aria-hidden /> {c.notInvited}</span>,
      managed: <span className="st"><HandHeart weight="fill" aria-hidden /> {t(c.keptBy, { names: m.helpers.map(nameOf).join(copy.common.and) || c.nobodyYet })}</span>,
    }[s.status];
    return (
      <div className="prow" key={m.pubkey}>
        <button className="tapname" onClick={() => onEdit(m.pubkey)} aria-label={t(c.editLabel, { name: m.name })}>
          <Avatar person={fam.people.get(m.pubkey) ?? m} size="sm" />
          <div className="body"><div className="name">{m.name}{m.organizer && s.status !== 'you' ? c.organizerSuffix : ''}</div>{line}</div>
        </button>
        {s.status === 'none' && <button className="act" onClick={() => onInvite(m.pubkey, tag)}>{c.invite}</button>}
        {s.status === 'invited' && <button className="act quiet" onClick={() => onInvite(m.pubkey, tag)}>{c.resend}</button>}
      </div>
    );
  };

  return (
    <section className="screen">
      <div className="top">
        <button className="iconbtn" onClick={onBack} aria-label={copy.common.back}><ArrowLeft weight="bold" /></button>
        <div className="grow"><div className="sub">{c.sub}</div><h1>{c.title}</h1></div>
      </div>
      {fam.groups.map(g => (
        <div key={g.tag}>
          <div className="section-title"><span className="group-name"><UsersThree aria-hidden />{g.name}</span><span>{g.members.length}</span></div>
          <div className="prows">{g.members.map(m => row(m, g.tag))}</div>
        </div>
      ))}
      <button className="btn primary" style={{ marginTop: 20 }} onClick={onAddPerson}><UserPlus weight="bold" aria-hidden /> {c.addSomeone}</button>
      <button className="btn ghost" onClick={onNewGroup}><Plus aria-hidden /> {c.newGroup}</button>
      <button className="btn ghost" onClick={onBackup}><Printer aria-hidden /> {c.printBackup}</button>
    </section>
  );
}
