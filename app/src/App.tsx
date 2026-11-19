import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle, Confetti, Gift, Trash } from '@phosphor-icons/react';
import type { AddPrefill, Invite } from '@family-registry/core';
import { db, type LocalItem } from './db.ts';
import { signIn, startFamily } from './identity.ts';
import { addItem, markReceived, removeItem, updateItem, type ItemDraft } from './items.ts';
import { keepLinkInAddressBar, readArrival, tidyAddressBar } from './route.ts';
import { MyList } from './screens/MyList.tsx';
import { Start } from './screens/Start.tsx';
import { Welcome, Working } from './screens/Welcome.tsx';
import { AddSheet } from './ui/AddSheet.tsx';
import { ItemSheet } from './ui/ItemSheet.tsx';
import { SettingsSheet } from './ui/SettingsSheet.tsx';
import { useToast } from './ui/Toast.tsx';

type Sheet = { kind: 'add'; prefill?: AddPrefill | null } | { kind: 'edit'; id: string } | { kind: 'item'; id: string } | { kind: 'settings' } | null;

export function App() {
  const toast = useToast();
  const me = useLiveQuery(() => db.identity.get('me').then(x => x ?? null), [], undefined);
  const prefs = useLiveQuery(() => db.prefs.get('prefs'), []);
  const [working, setWorking] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pendingAdd, setPendingAdd] = useState<AddPrefill | null>(null);
  const openId = sheet && 'id' in sheet ? sheet.id : undefined;
  const current = useLiveQuery(() => (openId ? db.items.get(openId) : undefined), [openId]);

  const largeText = !!prefs?.largeText;
  useEffect(() => { document.documentElement.classList.toggle('large', largeText); }, [largeText]);

  // Arriving from a personal link and/or with something to add (share target, helpers).
  useEffect(() => {
    const { invite, add } = readArrival();
    if (add) setPendingAdd(add);
    if (invite) {
      setWorking('Getting things ready…');
      signIn(invite)
        .catch(() => toast('That link didn’t work. Ask for a new one.'))
        .finally(() => { setWorking(null); tidyAddressBar(keepLinkInAddressBar()); });
    } else if (add) {
      tidyAddressBar(false);
    }
  }, [toast]);

  // Open the Add sheet with shared details once someone is signed in and welcomed.
  useEffect(() => {
    if (pendingAdd && me?.welcomed) { setSheet({ kind: 'add', prefill: pendingAdd }); setPendingAdd(null); }
  }, [pendingAdd, me]);

  const run = async (text: string, job: () => Promise<unknown>) => {
    setWorking(text);
    try { await job(); } finally { setWorking(null); }
  };

  if (working) return <main className="app"><Working text={working} /></main>;
  if (me === undefined) return <main className="app" />;
  if (me === null) return (
    <main className="app">
      <Start onInvite={(inv: Invite) => run('Getting things ready…', () => signIn(inv))}
        onStartFamily={name => run('Setting up your family…', () => startFamily(name))} />
    </main>
  );
  if (!me.welcomed) return (
    <main className="app"><Welcome me={me} onDone={name => db.identity.update('me', { name, welcomed: true })} /></main>
  );

  const close = () => setSheet(null);

  async function save(d: ItemDraft) {
    if (sheet?.kind === 'edit') {
      await updateItem(sheet.id, d);
      setSheet({ kind: 'item', id: sheet.id });
      toast(<><CheckCircle weight="fill" /> Saved</>);
    } else {
      await addItem(d);
      close();
      toast(<><Gift weight="fill" /> Added to your list</>);
    }
  }

  async function remove(it: LocalItem) {
    const undo = await removeItem(it.id);
    close();
    toast(<><Trash weight="fill" /> Removed</>, { undo: () => void undo() });
  }

  async function received(it: LocalItem, got: boolean) {
    await markReceived(it.id, got);
    close();
    if (got) toast(<><Confetti weight="fill" /> Moved to Received</>, { undo: () => void markReceived(it.id, false) });
  }

  return (
    <main className="app">
      <MyList me={me} onAdd={() => setSheet({ kind: 'add' })} onOpen={it => setSheet({ kind: 'item', id: it.id })} onSettings={() => setSheet({ kind: 'settings' })} />
      <AddSheet open={sheet?.kind === 'add' || sheet?.kind === 'edit'} onClose={close} onSave={save}
        editing={sheet?.kind === 'edit' ? current : undefined} prefill={sheet?.kind === 'add' ? sheet.prefill : undefined} />
      <ItemSheet item={sheet?.kind === 'item' ? current : undefined} onClose={close}
        onEdit={() => current && setSheet({ kind: 'edit', id: current.id })}
        onRemove={() => current && remove(current)} onReceived={got => current && received(current, got)} />
      <SettingsSheet open={sheet?.kind === 'settings'} onClose={close} me={me} largeText={largeText}
        onLargeText={on => db.prefs.put({ id: 'prefs', largeText: on })} />
    </main>
  );
}
