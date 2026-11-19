import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle, Confetti, Gift, PaperPlaneTilt, Trash, UsersThree } from '@phosphor-icons/react';
import type { AddPrefill, Invite, ItemState } from '@family-registry/core';
import { db } from './db.ts';
import { useFamily, type Family } from './family.ts';
import { announceJoined, signIn, startFamily, switchTo, type SignInResult } from './identity.ts';
import { addItem, markGot, removeItem, shareItemsWithAllGroups, updateItem, type ItemDraft } from './items.ts';
import { addPerson, createGroup, markInvited } from './people.ts';
import { isHelpPage, keepLinkInAddressBar, readArrival, tidyAddressBar } from './route.ts';
import { sync } from './sync.ts';
import { Backup } from './screens/Backup.tsx';
import { FamilyHome } from './screens/FamilyHome.tsx';
import { Help } from './screens/Help.tsx';
import { MyList } from './screens/MyList.tsx';
import { People } from './screens/People.tsx';
import { PersonList } from './screens/PersonList.tsx';
import { Start } from './screens/Start.tsx';
import { Welcome, Working } from './screens/Welcome.tsx';
import { AddSheet } from './ui/AddSheet.tsx';
import { ItemSheet } from './ui/ItemSheet.tsx';
import { AddPersonSheet, InviteSheet, NewGroupSheet } from './ui/PeopleSheets.tsx';
import { SettingsSheet } from './ui/SettingsSheet.tsx';
import { useToast } from './ui/Toast.tsx';
import { firstName } from './ui/bits.tsx';

type Screen = { name: 'family' } | { name: 'mine' } | { name: 'person'; pubkey: string } | { name: 'people' } | { name: 'backup' };
type SheetState =
  | { kind: 'add'; prefill?: AddPrefill | null; owner?: string }
  | { kind: 'edit'; id: string }
  | { kind: 'item'; id: string }
  | { kind: 'settings' }
  | { kind: 'invite'; pubkey: string; group: string }
  | { kind: 'add-person' }
  | { kind: 'new-group' }
  | null;

export function App() {
  if (isHelpPage()) return <main className="app"><Help /></main>;
  return <Registry />;
}

function Registry() {
  const toast = useToast();
  const fam = useFamily();
  const prefs = useLiveQuery(() => db.prefs.get('prefs'), []);
  const [working, setWorking] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'family' });
  const [sheet, setSheet] = useState<SheetState>(null);
  const [pendingAdd, setPendingAdd] = useState<AddPrefill | null>(null);
  const [someoneElse, setSomeoneElse] = useState<Extract<SignInResult, { kind: 'someone-else' }> | null>(null);
  const [synced, setSynced] = useState(false);

  const largeText = !!prefs?.largeText;
  useEffect(() => { document.documentElement.classList.toggle('large', largeText); }, [largeText]);

  const handleSignIn = async (job: Promise<SignInResult>) => {
    const r = await job;
    if (r.kind === 'someone-else') setSomeoneElse(r);
    if (r.kind === 'added-group') toast(<><UsersThree weight="fill" /> You've joined another group</>);
  };

  // Arriving from a personal link and/or with something to add (share target, helpers).
  // Also when a link opens in an app that's already running, which only changes the #fragment.
  useEffect(() => {
    const arrive = () => {
      const { invite, add } = readArrival();
      if (add) setPendingAdd(add);
      if (invite) {
        setSheet(null);
        setScreen({ name: 'family' });
        setWorking('Getting things ready…');
        handleSignIn(signIn(invite))
          .catch(() => toast('That link didn’t work. Ask for a new one.'))
          .finally(() => { setWorking(null); tidyAddressBar(keepLinkInAddressBar()); });
      } else if (add) {
        tidyAddressBar(false);
      }
    };
    arrive();
    addEventListener('hashchange', arrive);
    return () => removeEventListener('hashchange', arrive);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync: listen to every group this device is in; send what's waiting.
  const tags = fam ? fam.me.groups.map(g => g.tag).join() : '';
  useEffect(() => {
    if (!tags) { sync.stop(); return; }
    sync.start();
    sync.listen(tags.split(','));
    const off = sync.onStatus(s => { if (s === 'synced') setSynced(true); });
    return () => { off(); };
  }, [tags]);

  // Once the family has arrived: say this device is in use, and make sure every group can read my items.
  const announced = useRef('');
  useEffect(() => {
    if (!fam || !fam.me.welcomed || !synced || announced.current === tags) return;
    announced.current = tags;
    void announceJoined(fam.me).then(shareItemsWithAllGroups);
  }, [fam, synced, tags]);

  // Open the Add sheet with shared details once someone is signed in and welcomed.
  useEffect(() => {
    if (pendingAdd && fam?.me.welcomed) { setSheet({ kind: 'add', prefill: pendingAdd }); setPendingAdd(null); }
  }, [pendingAdd, fam?.me.welcomed]);

  const run = async (text: string, job: () => Promise<unknown>) => {
    setWorking(text);
    try { await job(); } finally { setWorking(null); }
  };

  if (working) return <main className="app"><Working text={working} /></main>;
  if (someoneElse) return (
    <main className="app"><section className="screen welcome">
      <div className="mark"><UsersThree weight="duotone" aria-hidden /></div>
      <h1>This link is for someone else</h1>
      <p>This device is set up for {fam?.self.name ?? 'someone'}. Switch it to the person in the link? Nothing is lost: everyone's lists stay safe.</p>
      <button className="btn primary" onClick={() => { const inv = someoneElse.invite; setSomeoneElse(null); void run('Switching…', () => handleSignIn(switchTo(inv))); }}>Switch</button>
      <button className="btn ghost" onClick={() => setSomeoneElse(null)}>Stay as {fam?.self.name ?? 'I am'}</button>
    </section></main>
  );
  if (fam === undefined) return <main className="app" />;
  if (fam === null) return (
    <main className="app">
      <Start onInvite={(inv: Invite) => void run('Getting things ready…', () => handleSignIn(signIn(inv)))}
        onStartFamily={name => void run('Setting up your family…', () => startFamily(name))} />
    </main>
  );
  if (!fam.me.welcomed) return (
    <main className="app">
      <Welcome fam={fam} waiting={!synced} onDone={(next, name) => {
        void db.identity.update('me', { welcomed: true, ...(name?.trim() ? { name: name.trim() } : {}) });
        setScreen(next === 'add' ? { name: 'mine' } : { name: 'family' });
        if (next === 'add') setSheet({ kind: 'add' });
      }} />
    </main>
  );

  return <Main fam={fam} screen={screen} setScreen={setScreen} sheet={sheet} setSheet={setSheet} largeText={largeText} />;
}

function Main({ fam, screen, setScreen, sheet, setSheet, largeText }: {
  fam: Family; screen: Screen; setScreen: (s: Screen) => void; sheet: SheetState; setSheet: (s: SheetState) => void; largeText: boolean;
}) {
  const toast = useToast();
  const close = () => setSheet(null);
  const go = (s: Screen) => { setScreen(s); scrollTo(0, 0); };
  const openId = sheet && (sheet.kind === 'item' || sheet.kind === 'edit') ? sheet.id : undefined;
  const current = openId ? fam.items.find(i => i.id === openId) : undefined;
  const canEdit = (it?: ItemState) => !!it && (it.owner === fam.me.pubkey || !!fam.people.get(it.owner)?.helpers.includes(fam.me.pubkey));
  const ownerName = (it?: ItemState) => (it && it.owner !== fam.me.pubkey ? firstName(fam.people.get(it.owner)?.name ?? '') : undefined);
  const addOwner = sheet?.kind === 'add' ? sheet.owner : undefined;

  async function save(d: ItemDraft) {
    if (sheet?.kind === 'edit') {
      await updateItem(sheet.id, d);
      setSheet({ kind: 'item', id: sheet.id });
      toast(<><CheckCircle weight="fill" /> Saved</>);
    } else {
      await addItem(d, addOwner);
      close();
      toast(<><Gift weight="fill" /> {addOwner ? `Added to ${ownerName({ owner: addOwner } as ItemState)}'s list` : 'Added to your list'}</>);
    }
  }

  async function remove(it: ItemState) {
    const undo = await removeItem(it.id);
    close();
    toast(<><Trash weight="fill" /> Removed</>, { undo: () => void undo() });
  }

  async function got(it: ItemState, yes: boolean) {
    await markGot(it.id, yes);
    close();
    if (yes) toast(<><Confetti weight="fill" /> Moved to Received</>, { undo: () => void markGot(it.id, false) });
  }

  const openItem = (it: ItemState) => setSheet({ kind: 'item', id: it.id });
  let body;
  if (screen.name === 'mine') body = <MyList fam={fam} onAdd={() => setSheet({ kind: 'add' })} onOpen={openItem} onSettings={() => setSheet({ kind: 'settings' })} onFamily={() => go({ name: 'family' })} />;
  else if (screen.name === 'person') body = <PersonList fam={fam} pubkey={screen.pubkey} onBack={() => go({ name: 'family' })} onOpen={openItem} onMine={() => go({ name: 'mine' })} onAdd={owner => setSheet({ kind: 'add', owner })} />;
  else if (screen.name === 'people' && fam.isOrganizer) body = <People fam={fam} onBack={() => go({ name: 'family' })} onInvite={(pubkey, group) => setSheet({ kind: 'invite', pubkey, group })} onAddPerson={() => setSheet({ kind: 'add-person' })} onNewGroup={() => setSheet({ kind: 'new-group' })} onBackup={() => go({ name: 'backup' })} />;
  else if (screen.name === 'backup' && fam.isOrganizer) body = <Backup fam={fam} onBack={() => go({ name: 'people' })} />;
  else body = <FamilyHome fam={fam} onPerson={pubkey => go({ name: 'person', pubkey })} onPeople={() => go({ name: 'people' })} onSettings={() => setSheet({ kind: 'settings' })} onAdd={() => setSheet({ kind: 'add' })} onMine={() => go({ name: 'mine' })} />;

  return (
    <main className="app">
      {body}
      <AddSheet open={sheet?.kind === 'add' || sheet?.kind === 'edit'} onClose={close} onSave={save}
        editing={sheet?.kind === 'edit' ? current : undefined} prefill={sheet?.kind === 'add' ? sheet.prefill : undefined}
        forName={sheet?.kind === 'edit' ? ownerName(current) : addOwner ? firstName(fam.people.get(addOwner)?.name ?? '') : undefined} />
      <ItemSheet item={sheet?.kind === 'item' ? current : undefined} canEdit={canEdit(current)} ownerName={ownerName(current)} onClose={close}
        onEdit={() => current && setSheet({ kind: 'edit', id: current.id })}
        onRemove={() => current && remove(current)} onGot={yes => current && got(current, yes)} />
      <SettingsSheet open={sheet?.kind === 'settings'} onClose={close} me={fam.me} largeText={largeText}
        onLargeText={on => db.prefs.get('prefs').then(p => db.prefs.put({ ...(p ?? { id: 'prefs' }), largeText: on }))} />
      <InviteSheet fam={fam} target={sheet?.kind === 'invite' ? { pubkey: sheet.pubkey, group: sheet.group } : null} onClose={close}
        onSent={how => {
          if (sheet?.kind !== 'invite') return;
          const name = firstName(fam.people.get(sheet.pubkey)?.name ?? '');
          void markInvited(sheet.pubkey);
          close();
          toast(<><PaperPlaneTilt weight="fill" /> {how === 'copy' ? 'Invite copied. Paste it anywhere' : how === 'qr' ? `${name} can scan it now` : `Invite for ${name} is on its way`}</>);
        }} />
      <AddPersonSheet fam={fam} open={sheet?.kind === 'add-person'} onClose={close} onSave={async p => {
        const pk = await addPerson(p);
        setSheet({ kind: 'invite', pubkey: pk, group: p.groups[0]! });
      }} />
      <NewGroupSheet fam={fam} open={sheet?.kind === 'new-group'} onClose={close} onSave={async (name, members) => {
        await createGroup(name, members);
        close();
        toast(<><UsersThree weight="fill" /> {name} started. Invite people from the list.</>);
      }} />
    </main>
  );
}
