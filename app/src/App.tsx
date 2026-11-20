import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, CheckCircle, Confetti, Gift, HandHeart, Lightbulb, PaperPlaneTilt, Trash, UsersThree } from '@phosphor-icons/react';
import { upcomingOccasions, type AddPrefill, type Invite, type ItemState } from '@family-registry/core';
import { copy } from './copy.ts';
import { db } from './db.ts';
import { hiddenTagsToFetch, useFamily, type Family } from './family.ts';
import { announceJoined, ensureRosters, signIn, startFamily, switchTo, type SignInResult } from './identity.ts';
import { addIdea, addItem, markGot, removeItem, reveal, revealPastGifts, setClaim, shareItemsWithAllGroups, updateItem, type ItemDraft } from './items.ts';
import { addPerson, createGroup, markInvited, updatePerson } from './people.ts';
import { mayEditProfile, saveProfile, type ProfileChanges } from './profile.ts';
import { useNav } from './nav.ts';
import { isEmbedPage, isHelpPage, keepLinkInAddressBar, readArrival, tidyAddressBar } from './route.ts';
import { EmbedBridge } from './embed.tsx';
import { sync } from './sync.ts';
import { pairWithCode } from './pairing.ts';
import { startSeen, useSeen } from './seen.ts';
import { Backup } from './screens/Backup.tsx';
import { FamilyHome } from './screens/FamilyHome.tsx';
import { Help } from './screens/Help.tsx';
import { Import } from './screens/Import.tsx';
import { MyList } from './screens/MyList.tsx';
import { People } from './screens/People.tsx';
import { PersonList } from './screens/PersonList.tsx';
import { Start } from './screens/Start.tsx';
import { Welcome, Working } from './screens/Welcome.tsx';
import { AddSheet } from './ui/AddSheet.tsx';
import { ItemSheet, type ClaimAction } from './ui/ItemSheet.tsx';
import { AddPersonSheet, EditPersonSheet, InviteSheet, NewGroupSheet } from './ui/PeopleSheets.tsx';
import { SettingsSheet } from './ui/SettingsSheet.tsx';
import { useToast } from './ui/Toast.tsx';
import { firstName } from './ui/bits.tsx';
import { plural, t } from './ui/text.tsx';

const toasts = copy.toasts;
const waits = copy.working;

type Screen = { name: 'family' } | { name: 'mine' } | { name: 'person'; pubkey: string } | { name: 'people' } | { name: 'backup' } | { name: 'import' };
type SheetState =
  | { kind: 'add'; prefill?: AddPrefill | null; owner?: string; secret?: boolean }
  | { kind: 'edit'; id: string }
  | { kind: 'item'; id: string }
  | { kind: 'settings' }
  | { kind: 'invite'; pubkey: string; group: string }
  | { kind: 'add-person' }
  | { kind: 'new-group' }
  | { kind: 'edit-person'; pubkey: string }
  | null;

export function App() {
  if (isHelpPage()) return <main className="app"><Help /></main>;
  if (isEmbedPage()) return <EmbedBridge />;
  return <Registry />;
}

function Registry() {
  const toast = useToast();
  const fam = useFamily();
  const prefs = useLiveQuery(() => db.prefs.get('prefs'), []);
  const [working, setWorking] = useState<string | null>(null);
  const nav = useNav<Screen, NonNullable<SheetState>>({ name: 'family' });
  const { screen, sheet, setSheet, reset: setScreen } = nav;
  const [pendingAdd, setPendingAdd] = useState<AddPrefill | null>(null);
  const [someoneElse, setSomeoneElse] = useState<Extract<SignInResult, { kind: 'someone-else' }> | null>(null);
  const [synced, setSynced] = useState(false);

  const largeText = !!prefs?.largeText;
  useEffect(() => { document.documentElement.classList.toggle('large', largeText); }, [largeText]);

  const handleSignIn = async (job: Promise<SignInResult>) => {
    const r = await job;
    if (r.kind === 'someone-else') setSomeoneElse(r);
    if (r.kind === 'added-group') toast(<><UsersThree weight="fill" /> {toasts.joinedGroup}</>);
  };

  // Arriving from a personal link and/or with something to add (share target, helpers).
  // Also when a link opens in an app that's already running, which only changes the #fragment.
  useEffect(() => {
    const arrive = () => {
      const { invite, add, importing } = readArrival();
      if (add) setPendingAdd(add);
      if (importing) { setScreen({ name: 'import' }); tidyAddressBar(false); }
      if (invite) {
        setSheet(null);
        setScreen({ name: 'family' });
        setWorking(waits.gettingReady);
        handleSignIn(signIn(invite))
          .catch(() => toast(toasts.badLink))
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
  const hidden = fam ? hiddenTagsToFetch(fam).join() : '';
  useEffect(() => {
    if (!tags) { sync.stop(); return; }
    sync.start();
    sync.listen(tags.split(','), hidden ? hidden.split(',') : []);
    const off = sync.onStatus(s => { if (s === 'synced') setSynced(true); });
    return () => { off(); };
  }, [tags, hidden]);

  // Once the family has arrived: say this device is in use, and make sure every group can read my items.
  const announced = useRef('');
  useEffect(() => {
    if (!fam || !fam.me.welcomed || !synced || announced.current === tags) return;
    announced.current = tags;
    void ensureRosters(fam.me, fam.groups.filter(g => g.rosterBy).map(g => g.tag))
      .then(() => announceJoined(fam.me)).then(shareItemsWithAllGroups).then(() => revealPastGifts()).then(startSeen);
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
      <h1>{copy.someoneElse.title}</h1>
      <p>{t(copy.someoneElse.text, { name: fam?.self.name ?? copy.someoneElse.someone })}</p>
      <button className="btn primary" onClick={() => { const inv = someoneElse.invite; setSomeoneElse(null); void run(waits.switching, () => handleSignIn(switchTo(inv))); }}>{copy.someoneElse.switch}</button>
      <button className="btn ghost" onClick={() => setSomeoneElse(null)}>{t(copy.someoneElse.stay, { name: fam?.self.name ?? copy.someoneElse.iAm })}</button>
    </section></main>
  );
  if (fam === undefined) return <main className="app" />;
  if (fam === null) return (
    <main className="app">
      <Start onInvite={(inv: Invite) => void run(waits.gettingReady, () => handleSignIn(signIn(inv)))}
        onStartFamily={name => void run(waits.settingUp, async () => { await startFamily(name); tidyAddressBar(false); })}
        onCode={pairWithCode} />
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

  return <Main fam={fam} nav={nav} largeText={largeText} />;
}

function Main({ fam, nav, largeText }: { fam: Family; nav: ReturnType<typeof useNav<Screen, NonNullable<SheetState>>>; largeText: boolean }) {
  const { screen, sheet, setSheet, go, back, home } = nav;
  const toast = useToast();
  const seen = useSeen();
  const prefs = useLiveQuery(() => db.prefs.get('prefs'), []);
  const close = () => setSheet(null);
  const openId = sheet && (sheet.kind === 'item' || sheet.kind === 'edit') ? sheet.id : undefined;
  const current = openId ? fam.items.find(i => i.id === openId) : undefined;
  const me = fam.me.pubkey;
  const nameOf = (pk: string) => (pk === me ? copy.common.you : firstName(fam.people.get(pk)?.name ?? copy.common.someone));
  // Owner and helpers edit list items; anyone but the recipient edits a secret idea.
  const canEdit = (it?: ItemState) => !!it && (it.content.surprise ? it.owner !== me : it.owner === me || !!fam.people.get(it.owner)?.helpers.includes(me));
  const ownerName = (it?: ItemState) => (it && it.owner !== me ? firstName(fam.people.get(it.owner)?.name ?? '') : undefined);
  const addOwner = sheet?.kind === 'add' ? sheet.owner : undefined;
  const addSecret = sheet?.kind === 'add' && !!sheet.secret;

  async function save(d: ItemDraft) {
    if (sheet?.kind === 'edit') {
      await updateItem(sheet.id, d);
      setSheet({ kind: 'item', id: sheet.id });
      toast(<><CheckCircle weight="fill" /> {toasts.saved}</>);
    } else if (addSecret && addOwner) {
      await addIdea(d, addOwner);
      close();
      toast(<><Lightbulb weight="fill" /> {t(toasts.ideaAdded, { name: nameOf(addOwner) })}</>);
    } else {
      await addItem(d, addOwner);
      close();
      toast(<><Gift weight="fill" /> {addOwner ? t(toasts.addedTo, { name: nameOf(addOwner) }) : toasts.addedMine}</>);
    }
  }

  async function remove(it: ItemState) {
    const undo = await removeItem(it.id);
    close();
    toast(<><Trash weight="fill" /> {toasts.removed}</>, { undo: () => void undo() });
  }

  async function got(it: ItemState, yes: boolean) {
    await markGot(it.id, yes);
    close();
    if (yes) toast(<><Confetti weight="fill" /> {toasts.movedToReceived}</>, { undo: () => void markGot(it.id, false) });
  }

  /** I'll get this / I got it / Never mind / I've given it: each with an Undo. */
  async function claim(it: ItemState, a: ClaimAction) {
    const prev = [it.claims.holder, ...it.claims.others].find(c => c?.author === me);
    const occasion = a.kind === 'claim' ? a.occasion : prev?.occasion ?? upcomingOccasions(fam.people.get(it.owner)?.birthday)[0]!.id;
    const back = () => void setClaim(it, prev?.state ?? 'released', occasion);
    if (a.kind === 'claim') {
      await setClaim(it, 'getting', occasion);
      close();
      toast(<><HandHeart weight="fill" /> {t(toasts.claimed, { title: it.content.title })}</>, { undo: back });
    } else if (a.kind === 'bought') {
      await setClaim(it, 'bought', occasion);
      toast(<><Check weight="bold" /> {toasts.markedBought}</>, { undo: back });
    } else if (a.kind === 'release') {
      await setClaim(it, 'released', occasion);
      close();
      toast(toasts.released, { undo: back });
    } else {
      await reveal(it, occasion);
      close();
      toast(<><Gift weight="fill" /> {t(toasts.givenReveal, { name: nameOf(it.owner) })}</>);
    }
  }

  const openItem = (it: ItemState) => setSheet({ kind: 'item', id: it.id });
  let body;
  if (screen.name === 'mine') body = <MyList fam={fam} onAdd={() => setSheet({ kind: 'add' })} onOpen={openItem} onSettings={() => setSheet({ kind: 'settings' })} onFamily={() => home({ name: 'family' })} />;
  else if (screen.name === 'person') body = <PersonList key={screen.pubkey} fam={fam} pubkey={screen.pubkey} seen={seen}
    onEdit={mayEditProfile(fam, screen.pubkey) ? () => setSheet({ kind: 'edit-person', pubkey: screen.pubkey }) : undefined} onBack={() => back({ name: 'family' })} onOpen={openItem} onMine={() => go({ name: 'mine' })}
    onAdd={owner => setSheet({ kind: 'add', owner })} onIdea={owner => setSheet({ kind: 'add', owner, secret: true })} />;
  else if (screen.name === 'people' && fam.isOrganizer) body = <People fam={fam} onBack={() => back({ name: 'family' })} onInvite={(pubkey, group) => setSheet({ kind: 'invite', pubkey, group })}
    onAddPerson={() => setSheet({ kind: 'add-person' })} onNewGroup={() => setSheet({ kind: 'new-group' })} onBackup={() => go({ name: 'backup' })} onEdit={pubkey => setSheet({ kind: 'edit-person', pubkey })} />;
  else if (screen.name === 'backup' && fam.isOrganizer) body = <Backup fam={fam} onBack={() => back({ name: 'people' })} />;
  else if (screen.name === 'import') body = <Import fam={fam} onCancel={() => back({ name: 'family' })} onDone={(target, n) => {
    nav.reset(target === me ? { name: 'mine' } : { name: 'person', pubkey: target });
    toast(<><Check weight="bold" /> {plural(toasts.imported, n)}</>);
  }} />;
  else body = <FamilyHome fam={fam} seen={seen} dismissed={prefs?.dismissed ?? []} onPerson={pubkey => go({ name: 'person', pubkey })} onPeople={() => go({ name: 'people' })}
    onSettings={() => setSheet({ kind: 'settings' })} onAdd={() => setSheet({ kind: 'add' })} onMine={() => go({ name: 'mine' })}
    onDismiss={async it => {
      const p = (await db.prefs.get('prefs')) ?? { id: 'prefs' as const, largeText: false };
      await db.prefs.put({ ...p, dismissed: [...(p.dismissed ?? []), it.id] });
      const mine = [it.claims.holder, ...it.claims.others].find(c => c?.author === me);
      if (mine) await setClaim(it, 'released', mine.occasion);
    }} />;

  const owner = current ? fam.people.get(current.owner) : undefined;
  return (
    <main className="app">
      {body}
      <AddSheet open={sheet?.kind === 'add' || sheet?.kind === 'edit'} onClose={close} onSave={save}
        editing={sheet?.kind === 'edit' ? current : undefined} prefill={sheet?.kind === 'add' ? sheet.prefill : undefined}
        secret={sheet?.kind === 'edit' ? !!current?.content.surprise : addSecret}
        forName={sheet?.kind === 'edit' ? ownerName(current) : addOwner ? nameOf(addOwner) : undefined} />
      <ItemSheet item={sheet?.kind === 'item' ? current : undefined} viewer={me} nameOf={nameOf} canEdit={canEdit(current)}
        ownerName={ownerName(current)} ownerBirthday={owner?.birthday} onClose={close}
        onEdit={() => current && setSheet({ kind: 'edit', id: current.id })}
        onRemove={() => current && remove(current)} onGot={yes => current && got(current, yes)}
        onClaim={a => current && claim(current, a)} />
      <SettingsSheet open={sheet?.kind === 'settings'} onClose={close} me={fam.me} self={fam.self} largeText={largeText}
        onLargeText={on => db.prefs.get('prefs').then(p => db.prefs.put({ ...(p ?? { id: 'prefs' }), largeText: on }))} />
      <InviteSheet fam={fam} target={sheet?.kind === 'invite' ? { pubkey: sheet.pubkey, group: sheet.group } : null} onClose={close}
        onSent={how => {
          if (sheet?.kind !== 'invite') return;
          const name = nameOf(sheet.pubkey);
          void markInvited(sheet.pubkey);
          close();
          toast(<><PaperPlaneTilt weight="fill" /> {how === 'copy' ? toasts.inviteCopied : t(how === 'qr' ? toasts.canScan : toasts.inviteSent, { name })}</>);
        }} />
      <AddPersonSheet fam={fam} open={sheet?.kind === 'add-person'} onClose={close} onSave={async p => {
        const pk = await addPerson(p);
        if (p.managed) { close(); toast(<><HandHeart weight="fill" /> {t(toasts.managedAdded, { name: firstName(p.name) })}</>); }
        else setSheet({ kind: 'invite', pubkey: pk, group: p.groups[0]! });
      }} />
      <EditPersonSheet fam={fam} pubkey={sheet?.kind === 'edit-person' ? sheet.pubkey : null} onClose={close} onSave={async (pk, { photo, ...ch }) => {
        const before = fam.people.get(pk);
        if (fam.isOrganizer) await updatePerson(pk, ch);
        // A photo always goes in the profile; so does a helper's birthday (organizers' go in the roster too).
        const changes: ProfileChanges = {};
        if (photo !== (before?.photo ?? null)) changes.photo = photo;
        if (!fam.isOrganizer && ch.birthday !== (before?.birthday ?? null)) changes.birthday = ch.birthday;
        if (Object.keys(changes).length) await saveProfile(pk, changes);
        close();
        toast(<><CheckCircle weight="fill" /> {toasts.saved}</>);
      }} />
      <NewGroupSheet fam={fam} open={sheet?.kind === 'new-group'} onClose={close} onSave={async (name, members) => {
        await createGroup(name, members);
        close();
        toast(<><UsersThree weight="fill" /> {t(toasts.groupStarted, { name })}</>);
      }} />
    </main>
  );
}
