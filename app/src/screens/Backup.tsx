import { ArrowLeft, Printer } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { inviteLinkFor } from '../people.ts';
import { QR } from '../ui/bits.tsx';
import { rich, t } from '../ui/text.tsx';

const c = copy.backup;

/**
 * The family backup: every person's words and a QR of their link, on paper.
 * With this sheet, anyone can get back in, even if every device is lost.
 */
export function Backup({ fam, onBack }: { fam: Family; onBack: () => void }) {
  const vault = fam.vault;
  return (
    <section className="screen backup">
      <div className="top no-print">
        <button className="iconbtn" onClick={onBack} aria-label={copy.common.back}><ArrowLeft weight="bold" /></button>
        <div className="grow"><h1>{c.title}</h1></div>
      </div>
      <div className="note no-print"><span>{c.note}</span></div>
      <button className="btn primary no-print" onClick={() => print()}><Printer weight="bold" aria-hidden /> {c.print}</button>
      {!vault ? <p className="hint">{c.notSynced}</p> : fam.groups.map(g => {
        const words = vault.groups.find(x => x.tag === g.tag);
        return (
          <div key={g.tag}>
            <h2 style={{ marginTop: 24 }}>{g.name}</h2>
            {words && <p className="hint">{rich(c.groupWords, { words: words.words.join(' '), organizer: words.organizer.join(' ') })}</p>}
            {g.members.map(m => {
              const p = vault.people.find(x => x.pubkey === m.pubkey);
              const link = inviteLinkFor(fam, m.pubkey, g.tag);
              return (
                <div className="person" key={m.pubkey}>
                  {link && <QR text={link} size={110} label={t(c.qrLabel, { name: m.name })} />}
                  <div><b>{m.name}</b><p className="words">{p ? p.words.join(' ') : c.noWords}</p></div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
