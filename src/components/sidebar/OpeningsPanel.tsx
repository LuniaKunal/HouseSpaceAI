import React, { useEffect, useMemo, useState } from 'react';
import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import { listSpaceBoundaries, openingSpans, spansOnWall } from '../../geometry/architecture';

const control = 'w-full rounded-lg border border-white/20 bg-studio-canvas p-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400';
const button = 'rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400';
export function OpeningsPanel() {
  const [data, setData] = useState(sceneStore.getData());
  const [selected, setSelected] = useState(uiStore.getState().selectedId);
  const [wallId, setWallId] = useState('');
  const [openingId, setOpeningId] = useState('');
  const [kind, setKind] = useState<'open' | 'door'>('open');
  const [offset, setOffset] = useState(0), [width, setWidth] = useState(3.2), [height, setHeight] = useState(7);
  const [hinge, setHinge] = useState<'left' | 'right'>('left');
  const [swing, setSwing] = useState<'inward' | 'outward'>('inward');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  useEffect(() => sceneStore.subscribe(setData), []);
  useEffect(() => uiStore.subscribe(s => setSelected(s.selectedId)), []);
  const walls = useMemo(() => listSpaceBoundaries(data), [data.rooms, data.customWalls]);
  const wall = walls.find(w => w.id === wallId) ?? walls[0];
  const spans = useMemo(() => wall ? spansOnWall(wall, openingSpans(data, walls), walls) : [], [data.rooms, data.doors, data.windows, data.gates, walls, wall]);
  useEffect(() => {
    if (walls.some(w => w.id === selected)) { setWallId(selected!); setOpeningId(''); setOffset(0); }
  }, [selected]);
  useEffect(() => {
    if (openingId && !data.doors.some(d => d.id === openingId) && !data.rooms.some(r => r.openConnections?.some(o => o.id === openingId))) setOpeningId('');
  }, [data.doors, data.rooms, openingId]);
  const run = (action: () => unknown) => {
    try {
      action(); const check = sceneStore.validateLayout();
      const current = sceneStore.getData();
      setIssues([...check.issues.map(i => `${current.furniture.find(f => f.id === i.objectId)?.name ?? i.objectId}: ${i.reason}`),
        ...check.invalidOpenings.map(i => `${i.openingId}: ${i.reason}`)]);
      setError(false); setMessage(check.success ? 'Saved. Layout checks passed.' : `Saved. ${check.issues.length + check.invalidOpenings.length} layout issue(s) remain. Furniture was not moved.`);
    } catch (e) { setError(true); setMessage(e instanceof Error ? e.message : 'Unable to apply change.'); }
  };
  const edit = (id: string) => {
    const door = data.doors.find(d => d.id === id);
    const open = data.rooms.flatMap(r => r.openConnections ?? []).find(o => o.id === id);
    if (door) {
      const span = openingSpans(data, walls).find(s => s.id === id);
      setKind('door'); setWallId(door.wallId ?? span?.wallId ?? ''); setOffset(door.offset ?? span?.offset ?? 0);
      setWidth(door.width); setHeight(door.height); setHinge(door.hinge ?? 'left'); setSwing(door.swing ?? 'inward');
    } else if (open) { setKind('open'); setWallId(open.wallId); setOffset(open.offset); setWidth(open.width); }
    else return;
    setOpeningId(id); setMessage('');
  };
  useEffect(() => { if (selected && data.doors.some(d => d.id === selected)) edit(selected); }, [selected]);
  return <section className="overflow-y-auto p-4 space-y-4 text-slate-200" aria-labelledby="openings-title">
    <div><h2 id="openings-title" className="text-lg font-semibold">Walls &amp; Openings</h2>
      <p className="text-sm text-slate-400 mt-1">Keep named areas separate without enclosing them. All measurements are in feet.</p></div>
    {!wall ? <p>Add a room in Spaces to begin.</p> : <>
      <label className="block text-sm">Wall<select className={control} value={wall.id} onChange={e => {
        setWallId(e.target.value); setOpeningId(''); setOffset(0); uiStore.setSelected(e.target.value, 'wall');
      }}>{walls.map(w => <option key={w.id} value={w.id}>{data.rooms.find(r => r.id === w.roomId)?.name ?? 'Room'} · {w.id.startsWith('edge-') ? `edge ${Number(w.id.split('-').slice(-1)[0]) + 1}` : 'partition'} · {w.length.toFixed(1)} ft</option>)}</select></label>
      <p className="text-xs text-slate-400">From ({wall.start.x.toFixed(1)}, {wall.start.z.toFixed(1)}) to ({wall.end.x.toFixed(1)}, {wall.end.z.toFixed(1)}). Shared edits affect both sides.</p>
      <svg viewBox="0 0 300 54" role="img" aria-label={`Wall preview: ${wall.length.toFixed(1)} feet. Proposed opening begins at ${offset} feet and is ${width} feet wide.`} className="w-full rounded-lg bg-studio-canvas">
        <line x1="10" x2="290" y1="25" y2="25" stroke="#94a3b8" strokeWidth="12" />
        {spans.map(s => <line key={s.id} x1={10 + s.offset / wall.length * 280} x2={10 + (s.offset + s.width) / wall.length * 280} y1="25" y2="25" stroke="#152c28" strokeWidth="12" />)}
        {Number.isFinite(offset + width) && <line x1={10 + Math.max(0, offset) / wall.length * 280} x2={10 + Math.min(wall.length, offset + width) / wall.length * 280} y1="25" y2="25" stroke="#6ee7b7" strokeWidth="4" />}
        <text x="10" y="48" fill="#cbd5e1" fontSize="10">Start</text><text x="270" y="48" fill="#cbd5e1" fontSize="10">End</text>
      </svg>
      <label className="block text-sm">Opening type<select className={control} value={kind} disabled={!!openingId} onChange={e => setKind(e.target.value as 'open' | 'door')}>
        <option value="open">Open connection — no wall</option><option value="door">Hinged doorway</option></select></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Start offset<input className={control} aria-describedby="opening-result" aria-invalid={error || undefined} type="number" min="0" step="0.1" value={Number.isFinite(offset) ? offset : ''} onChange={e => setOffset(e.target.valueAsNumber)} /></label>
        <label className="text-sm">Width<input className={control} aria-describedby="opening-result" aria-invalid={error || undefined} type="number" min="0.1" step="0.1" value={Number.isFinite(width) ? width : ''} onChange={e => setWidth(e.target.valueAsNumber)} /></label>
      </div>
      <label className="block text-sm">Slide opening along wall<input className="w-full accent-emerald-400" type="range" min="0" max={Math.max(0, wall.length - width)} step="0.05" value={Number.isFinite(offset) ? offset : 0} onChange={e => setOffset(Number(e.target.value))} /></label>
      {kind === 'open' ? <button className={button} onClick={() => { setOffset(0); setWidth(wall.length); }}>Use full wall length</button> : <>
        <label className="block text-sm">Door height<input className={control} aria-describedby="opening-result" aria-invalid={error || undefined} type="number" min="0.1" max={wall.height} step="0.1" value={Number.isFinite(height) ? height : ''} onChange={e => setHeight(e.target.valueAsNumber)} /></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Hinge<select className={control} value={hinge} onChange={e => setHinge(e.target.value as typeof hinge)}><option value="left">Left</option><option value="right">Right</option></select></label>
          <label className="text-sm">Swing<select className={control} value={swing} onChange={e => setSwing(e.target.value as typeof swing)}><option value="inward">Inward</option><option value="outward">Outward</option></select></label></div>
      </>}
      <div className="flex gap-2"><button className={`${button} bg-emerald-900/50`} onClick={() => run(() => {
        if (kind === 'open') {
          const result = sceneStore.setSpaceBoundary({ wallId: wall.id, kind: 'open', offset, width, openingId: openingId || undefined });
          if ('opening' in result) setOpeningId(result.opening.id);
          return result;
        }
        if (openingId) return sceneStore.updateDoor(openingId, { offset, width, height, hinge, swing });
        const door = sceneStore.placeDoor({ roomId: wall.roomId, wallId: wall.id, offset, width, height, hinge, swing });
        setOpeningId(door.id); return door;
      })}>{openingId ? 'Save opening' : 'Add opening'}</button>
      {openingId && <button className={button} onClick={() => { setOpeningId(''); setMessage(''); }}>New opening</button>}</div>
      <p id="opening-result" role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-red-300' : 'text-emerald-200'}`}>{message}</p>
      {issues.length > 0 && <details className="text-sm"><summary>View layout issues ({issues.length})</summary><ul className="mt-2 space-y-2">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></details>}
      <h3 className="font-medium">Existing openings on this wall</h3>
      {spans.length === 0 ? <p className="text-sm text-slate-400">Solid wall. No openings yet.</p> : <ul className="space-y-2">{spans.map(s => <li key={s.id} className="rounded-lg border border-white/10 p-2 text-sm">
        <p>{data.doors.some(d => d.id === s.id) ? 'Doorway' : data.rooms.some(r => r.openConnections?.some(o => o.id === s.id)) ? 'Open connection' : 'Existing window / passage'} · {s.width.toFixed(1)} ft</p>
        {(data.doors.some(d => d.id === s.id) || data.rooms.some(r => r.openConnections?.some(o => o.id === s.id))) && <div className="flex gap-2 mt-2"><button className={button} onClick={() => edit(s.id)}>Edit</button><button className={button} onClick={() => run(() => { sceneStore.removeOpening(s.id); setOpeningId(''); })}>Remove opening</button></div>}
      </li>)}</ul>}
      <button className={button} onClick={() => run(() => {})}>Check layout</button>
      <p className="text-xs text-slate-400">Door checks reserve a 2.5 ft approach plus swing space. Use Undo to restore an edit. This is a layout aid, not a building-code check.</p>
    </>}
  </section>;
}
