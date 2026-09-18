import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowUpRight, Download, ImagePlus, Plus, Sparkles, Star, Trash2, Bot } from 'lucide-react';
import { photoDesignService as photos } from './service';
import { PHOTO_STYLES, ROOM_TYPES, PhotoDesign, PhotoSettings, photoMetadata } from './model';
import { downloadPhoto } from './images';
import type { PhotoServerConfig } from './api';
import { uiStore } from '../../state/uiStore';
import './photo-design.css';
import { supabase } from '../auth/client';

function useImage(blob?: Blob) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const next = URL.createObjectURL(blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export function PhotoDesignPage() {
  const version = useSyncExternalStore(photos.subscribe, photos.getVersion);
  const [library, setLibrary] = useState<ReturnType<typeof photoMetadata>[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [design, setDesign] = useState<PhotoDesign>();
  const [draft, setDraft] = useState<PhotoSettings>({ roomType: 'Living room', styleId: 'warm', instruction: '' });
  const [revision, setRevision] = useState(0);
  const dirty = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState<PhotoServerConfig>();
  const [serverError, setServerError] = useState('');
  const [consent, setConsent] = useState(false);
  const [resultId, setResultId] = useState('');
  const [comparison, setComparison] = useState<'split' | 'side'>('split');
  const [split, setSplit] = useState(50);
  const upload = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const pendingImport = useRef<string>();
  const heading = useRef<HTMLHeadingElement>(null);

  const checkServer = async () => {
    try { setConfig(await photos.config()); setServerError(''); }
    catch (error) { setConfig(undefined); setServerError(error instanceof Error ? error.message : 'Photo server unavailable.'); }
  };
  useEffect(() => { void checkServer(); heading.current?.focus(); }, []);
  useEffect(() => {
    let live = true;
    photos.list().then(items => {
      if (!live) return;
      setLibrary(items);
      if (!selected || !items.some(item => item.id === selected)) {
        dirty.current = false; setSelected(items[0]?.id || null); setDesign(undefined);
      }
    }).catch(error => live && setError(error.message));
    return () => { live = false; };
  }, [version, selected]);
  useEffect(() => {
    let live = true;
    if (!selected) { setDesign(undefined); return; }
    photos.get(selected).then(value => {
      if (!live) return;
      setDesign(value);
      if (!dirty.current) { setDraft({ ...value.settings }); setRevision(value.revision); }
    }).catch(error => live && setError(error.message));
    return () => { live = false; };
  }, [selected, version]);

  const waiting = design?.requests.filter(r => r.generation && !design.results.some(result => result.requestId === r.id) && ['submitting', 'queued', 'running', 'succeeded'].includes(r.generation.status)).map(r => r.id).join(',') || '';
  useEffect(() => {
    if (!selected || !waiting) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        for (const request of waiting.split(',')) { if (stopped) return; await photos.refreshGeneration(selected, request); }
        if (!stopped) timer = setTimeout(poll, 3000);
      } catch (error) { if (!stopped) setError(`${error instanceof Error ? error.message : 'Unable to check generation.'} Use Recheck generation to resume.`); }
    };
    timer = setTimeout(poll, 3000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [selected, waiting]);

  const result = design?.results.find(r => r.id === resultId) || design?.results[design.results.length - 1];
  const sourceUrl = useImage(design?.source.blob);
  const resultUrl = useImage(result?.asset.blob);
  const ratioMatches = !design || !result || Math.abs(result.asset.width / result.asset.height / (design.source.width / design.source.height) - 1) < 0.02;
  const latest = design?.requests[design.requests.length - 1];

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to complete this action.'); }
    finally { setBusy(false); }
  }
  async function saveSettings() {
    if (!design) throw new Error('Upload a room photo first.');
    if (dirty.current) {
      const updated = await photos.configure(design.id, draft, revision);
      dirty.current = false; setRevision(updated.revision);
    }
  }
  async function addPhoto(file?: File) {
    if (!file) return;
    await run(async () => {
      const created = await photos.create(file, file.name.replace(/\.[^.]+$/, ''));
      dirty.current = false; setDesign(undefined); setSelected(created.id); setResultId(''); setConsent(false);
      setMessage(`Photo saved ${supabase ? 'to your private library' : 'in this browser'}. Choose a style to begin.`);
    });
  }
  function editSettings(next: Partial<PhotoSettings>) { dirty.current = true; setDraft(value => ({ ...value, ...next })); setConsent(false); }
  function selectDesign(id: string) {
    if (dirty.current && !window.confirm('Discard unsaved design settings?')) return;
    dirty.current = false; setDesign(undefined); setSelected(id); setResultId(''); setConsent(false); setError(''); setMessage('');
  }

  return <div className="photo-page">
    <header className="photo-nav">
      <button onClick={() => { if (!dirty.current || window.confirm('Discard unsaved design settings?')) uiStore.setActiveView('dashboard'); }}><ArrowLeft size={17} aria-hidden="true" /> Projects</button>
      <a href="/" onClick={event => { if (dirty.current && !window.confirm('Discard unsaved design settings?')) { event.preventDefault(); return; } event.preventDefault(); uiStore.setActiveView('landing'); }}>HouseSpace</a>
      <button onClick={() => uiStore.setAgentBridgeModalOpen(true)}><Bot size={17} aria-hidden="true" /> Agent tools</button>
    </header>
    <main className="photo-main">
      <div className="photo-heading"><div><h1 ref={heading} tabIndex={-1}>A fresh perspective on your room.</h1><p>Start with a photo. Explore a new style. Keep the original close.</p></div>
        <button className="photo-primary" disabled={busy} onClick={() => upload.current?.click()}><Plus size={17} aria-hidden="true" /> New room photo</button>
      </div>
      <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload a room photo" className="photo-file-input" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void addPhoto(file); }} />
      <input ref={importInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Import a design result" className="photo-file-input" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (file && selected && pendingImport.current) { const id = selected, request = pendingImport.current; void run(async () => { await photos.importResult(id, request, file); setResultId(''); setMessage('Imported concept saved.'); }); }
      }} />
      <div className="photo-feedback" aria-live="polite" role="status">{busy ? 'Saving changes…' : message}</div>
      {error && <p className="photo-error" id="photo-error" role="alert">{error}</p>}

      <div className="photo-workspace">
        <section className="photo-canvas-area" aria-label="Room photo and concepts">
          {!design ? <div className="photo-empty" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) void addPhoto(event.dataTransfer.files[0]); }}>
            <div className="photo-frame-art" aria-hidden="true"><div /><span /><i /></div>
            <h2>Your room is the starting point.</h2><p>Choose a well-lit photo with the walls and floor in view. You can also drop it here.</p>
            <button className="photo-primary" disabled={busy} onClick={() => upload.current?.click()}><ImagePlus size={18} aria-hidden="true" /> Choose room photo</button>
            <small>JPEG, PNG or WebP · Up to 12 MB / 24 MP<br />Up to 2,048 px on the longest edge. {supabase ? 'Saved to your private library.' : 'Saved in this browser.'}</small>
          </div> : <>
            <div className="photo-canvas-toolbar"><div><strong>{design.name}</strong><span>{design.source.width} × {design.source.height} · {supabase ? 'Private cloud library' : 'Saved in this browser'}</span></div>
              <button disabled={busy} onClick={() => downloadPhoto(design.source.blob, `${design.name}-source.jpg`)} aria-label="Download source photo"><Download size={17} /></button>
            </div>
            {result && <div className="photo-comparison-options" aria-label="Comparison layout">
              <button aria-pressed={comparison === 'split' && ratioMatches} disabled={!ratioMatches} onClick={() => setComparison('split')}>Before / after</button>
              <button aria-pressed={comparison === 'side' || !ratioMatches} onClick={() => setComparison('side')}>Side by side</button>
              {!ratioMatches && <span>Different image proportions; shown without cropping.</span>}
            </div>}
            <div className={`photo-image-stage ${result && (comparison === 'side' || !ratioMatches) ? 'photo-side-by-side' : ''}`}>
              {result && (comparison === 'side' || !ratioMatches) ? <>
                <figure><img src={sourceUrl} alt={`Original ${draft.roomType.toLowerCase()}`} /><figcaption>Original</figcaption></figure>
                <figure><img src={resultUrl} alt="Redesigned room concept" /><figcaption>{result.origin === 'openai' ? 'AI concept' : 'Imported concept'}</figcaption></figure>
              </> : <div className="photo-split-image">
                <img src={sourceUrl} alt="Original room" />
                {result && <><img className="photo-result-overlay" src={resultUrl} alt="Redesigned room concept, revealed using the comparison slider" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} /><div className="photo-divider" style={{ left: `${split}%` }} aria-hidden="true" /></>}
              </div>}
            </div>
            {result && comparison === 'split' && ratioMatches && <label className="photo-slider">Concept <input aria-label="Amount of redesigned room shown" type="range" min="0" max="100" value={split} onChange={event => setSplit(Number(event.target.value))} /> Original</label>}
            <div className="photo-result-actions">
              <p>{result ? `${result.origin === 'openai' ? `Generated with ${result.model}` : 'Imported from another tool'}. Visual concept; dimensions are not verified.` : 'Your original photo stays unchanged. Generate a concept or import one below.'}</p>
              {result && <><button aria-pressed={result.favorite} aria-label={result.favorite ? 'Remove favorite' : 'Favorite result'} disabled={busy} onClick={() => void run(() => photos.favorite(design.id, result.id, !result.favorite))}><Star size={17} fill={result.favorite ? 'currentColor' : 'none'} /></button><button onClick={() => downloadPhoto(result.asset.blob, `${design.name}-concept.jpg`)}><Download size={16} aria-hidden="true" /> Download</button></>}
            </div>
            {design.results.length > 0 && <div className="photo-versions" aria-label="Saved concepts">{design.results.map((item, index) => <button key={item.id} aria-pressed={result?.id === item.id} onClick={() => setResultId(item.id)}>Concept {index + 1}{item.favorite ? ' ★' : ''}</button>)}</div>}
          </>}
        </section>

        <aside className="photo-controls" aria-label="Design settings">
          <h2>Make it yours.</h2><p>Keep the structure. Change the feeling.</p>
          <fieldset disabled={!design || busy || Boolean(waiting)}>
            <label htmlFor="photo-room">Room type</label><select id="photo-room" value={draft.roomType} onChange={event => editSettings({ roomType: event.target.value as PhotoSettings['roomType'] })}>{ROOM_TYPES.map(room => <option key={room}>{room}</option>)}</select>
            <div className="photo-style-label" id="photo-style-label">Interior style</div>
            <div className="photo-styles" role="group" aria-labelledby="photo-style-label">{PHOTO_STYLES.map(style => <button type="button" key={style.id} aria-pressed={draft.styleId === style.id} onClick={() => editSettings({ styleId: style.id })}><span className="photo-swatches" aria-hidden="true">{style.colors.map(color => <i key={color} style={{ backgroundColor: color }} />)}</span>{style.name}</button>)}</div>
            <label htmlFor="photo-instruction">What would you like to change?</label><textarea id="photo-instruction" rows={3} maxLength={1500} placeholder="Keep the floor. Add warm oak and cream fabrics…" value={draft.instruction} onChange={event => editSettings({ instruction: event.target.value })} aria-describedby="photo-instruction-help photo-error" />
            <small id="photo-instruction-help">Optional · {draft.instruction.length}/1,500 characters</small>
            <button className="photo-save" onClick={() => void run(async () => { await saveSettings(); setMessage('Design settings saved.'); })}>Save settings</button>
          </fieldset>
          <div className="photo-generation-info">
            <strong>{config?.configured ? 'OpenAI is ready' : 'Connect OpenAI to generate'}</strong>
            <p>{config?.configured ? `Draft quality · ${config.attemptsToday}/${config.dailyLimit} daily attempts used.` : serverError || 'Image generation is not configured yet. You can save photos, prepare a design brief, and import concepts.'}</p>
            <button onClick={() => void checkServer()}>Check connection</button>
          </div>
          <label className="photo-consent"><input type="checkbox" checked={consent} disabled={!design || busy || Boolean(waiting)} onChange={event => setConsent(event.target.checked)} />Send this photo to OpenAI. I understand API usage is billed to the configured account.</label>
          <button className="photo-primary photo-generate" disabled={!design || busy || !config?.configured || !consent || Boolean(waiting)} onClick={() => void run(async () => {
            await saveSettings(); const request = await photos.prepare(design!.id);
            await photos.generate(design!.id, request.id, consent); setConsent(false); setResultId(''); setMessage('Generating one room concept. You can return to this page later.'); void checkServer();
          })}><Sparkles size={17} aria-hidden="true" />{waiting ? 'Generating your concept…' : 'Generate one concept'}</button>
          <small className="photo-charge-note">OpenAI generation uses paid API credits. Uploading, saving and comparing do not call OpenAI.</small>
          {latest?.generation && <div className="photo-job-status" role="status"><p>{latest.generation.error || `Latest request: ${latest.generation.status}`}</p><button disabled={busy} onClick={() => void run(async () => { await photos.refreshGeneration(design!.id, latest.id); setMessage('Generation status updated.'); })}>Recheck generation</button></div>}
          <details className="photo-advanced"><summary>Design brief & imported concepts</summary><p>Use a saved brief with another tool, then import its result. No image is generated by preparing a brief.</p>
            <button disabled={!design || busy} onClick={() => void run(async () => { await saveSettings(); const request = await photos.prepare(design!.id); downloadPhoto(new Blob([request.prompt], { type: 'text/plain' }), `${design!.name}-brief.txt`); setMessage('Design brief saved and downloaded.'); })}>Download design brief <ArrowUpRight size={14} aria-hidden="true" /></button>
            <button disabled={!design || busy} onClick={() => void run(async () => { await saveSettings(); const request = await photos.prepare(design!.id); pendingImport.current = request.id; importInput.current?.click(); })}>Import concept image</button>
            <button disabled={!design || busy || Boolean(waiting)} onClick={() => void run(async () => { await saveSettings(); await photos.prepare(design!.id, true); setConsent(false); setMessage('New variation prepared. Generating it is a separate billed attempt.'); })}>Prepare a new variation</button>
          </details>
        </aside>
      </div>
      <section className="photo-library"><div className="photo-library-heading"><h2>Your photo library</h2><p>{supabase ? 'Saved privately to your account. Available when you sign in.' : 'Stored on this device. Download images you want to keep.'}</p></div>
        {library.length ? <ul>{library.map(item => <li key={item.id}><button className="photo-library-item" aria-pressed={selected === item.id} onClick={() => selectDesign(item.id)}><span className="photo-library-swatch" style={{ background: PHOTO_STYLES.find(style => style.id === item.settings.styleId)?.colors[0] }} aria-hidden="true"><ImagePlus size={22} /></span><span><strong>{item.name}</strong><small>{item.settings.roomType} · {item.results.length} concepts</small></span></button><button className="photo-delete" aria-label={`Delete ${item.name}`} disabled={busy} onClick={() => {
          if (window.confirm(`Permanently delete “${item.name}”, its original photo and all concepts?`)) void run(async () => { await photos.remove(item.id); if (selected === item.id) dirty.current = false; setMessage('Photo design deleted.'); });
        }}><Trash2 size={16} /></button></li>)}</ul> : <p>No photos yet. Add a room to start your library.</p>}
      </section>
    </main>
  </div>;
}
