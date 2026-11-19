import { ArrowLeft, Printer } from '@phosphor-icons/react';
import type { Family } from '../family.ts';
import { inviteLinkFor } from '../people.ts';
import { QR } from '../ui/bits.tsx';

/**
 * The family backup: every person's words and a QR of their link, on paper.
 * With this sheet, anyone can get back in, even if every device is lost.
 */
export function Backup({ fam, onBack }: { fam: Family; onBack: () => void }) {
  const vault = fam.vault;
  return (
    <section className="screen backup">
      <div className="top no-print">
        <button className="iconbtn" onClick={onBack} aria-label="Back"><ArrowLeft weight="bold" /></button>
        <div className="grow"><h1>Family backup</h1></div>
      </div>
      <div className="note no-print"><span>Print this and keep it somewhere safe, like with important papers. Anyone holding it can open everyone's lists.</span></div>
      <button className="btn primary no-print" onClick={() => print()}><Printer weight="bold" aria-hidden /> Print</button>
      {!vault ? <p className="hint">The backup hasn't synced to this device yet.</p> : fam.groups.map(g => {
        const words = vault.groups.find(x => x.tag === g.tag);
        return (
          <div key={g.tag}>
            <h2 style={{ marginTop: 24 }}>{g.name}</h2>
            {words && <p className="hint">Group words: <b>{words.words.join(' ')}</b> · organizer: <b>{words.organizer.join(' ')}</b></p>}
            {g.members.map(m => {
              const p = vault.people.find(x => x.pubkey === m.pubkey);
              const link = inviteLinkFor(fam, m.pubkey, g.tag);
              return (
                <div className="person" key={m.pubkey}>
                  {link && <QR text={link} size={110} label={`QR code for ${m.name}`} />}
                  <div><b>{m.name}</b><p className="words">{p ? p.words.join(' ') : 'Words not in the backup'}</p></div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
